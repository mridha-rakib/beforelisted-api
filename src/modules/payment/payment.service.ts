// file: src/modules/payment/payment.service.ts

import { env } from "@/env";
import { logger } from "@/middlewares/pino-logger";
import { emailService } from "@/services/email.service";
import Stripe from "stripe";
import type { IGrantAccessRequest } from "../grant-access/grant-access.model";
import { GrantAccessRepository } from "../grant-access/grant-access.repository";
import { PreMarketNotifier } from "../pre-market/pre-market-notifier";
import { PreMarketRepository } from "../pre-market/pre-market.repository";
import { RenterRepository } from "../renter/renter.repository";
import { UserRepository } from "../user/user.repository";

export class PaymentService {
  private stripe: Stripe;
  private readonly grantAccessRepository: GrantAccessRepository;
  private readonly preMarketRepository: PreMarketRepository;
  private readonly notifier: PreMarketNotifier;
  private readonly renterRepository: RenterRepository;
  private readonly userRepository: UserRepository;

  constructor() {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY);
    this.grantAccessRepository = new GrantAccessRepository();
    this.preMarketRepository = new PreMarketRepository();
    this.notifier = new PreMarketNotifier();
    this.renterRepository = new RenterRepository();
    this.userRepository = new UserRepository();
  }

  // ============================================
  // CREATE PAYMENT INTENT
  // ============================================

  async createPaymentIntent(options: {
    amount: number;
    metadata: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    // Stripe expects the smallest currency unit (cents for USD).
    const stripeAmount = Math.round(options.amount * 100);

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: stripeAmount,
      currency: "usd",
      metadata: options.metadata,
      description: `Pre-Market Access - ${options.metadata.preMarketRequestId}`,
      automatic_payment_methods: { enabled: true },
    });

    logger.info(
      options.metadata,
      `Payment intent created: ${paymentIntent.id}`
    );

    return paymentIntent;
  }

  private async ensureStripePaymentIntentId(
    grantAccess: IGrantAccessRequest,
    stripePaymentIntentId: string
  ): Promise<void> {
    if (!grantAccess.payment) {
      logger.warn(
        {
          grantAccessId: String(grantAccess._id),
          stripePaymentIntentId,
        },
        "Grant access missing payment record"
      );
      return;
    }

    if (grantAccess.payment.stripePaymentIntentId === stripePaymentIntentId) {
      return;
    }

    await this.grantAccessRepository.updateById(String(grantAccess._id), {
      "payment.stripePaymentIntentId": stripePaymentIntentId,
    } as any);
  }

  private async resolveGrantAccessForIntent(
    intent: Stripe.PaymentIntent
  ): Promise<IGrantAccessRequest | null> {
    const byIntent = await this.grantAccessRepository.findOne({
      "payment.stripePaymentIntentId": intent.id,
    });

    if (byIntent) {
      await this.ensureStripePaymentIntentId(byIntent, intent.id);
      return byIntent;
    }

    const grantAccessId = intent.metadata?.grantAccessId;
    if (!grantAccessId) {
      return null;
    }

    const byId = await this.grantAccessRepository.findById(grantAccessId);
    if (!byId) {
      return null;
    }

    await this.ensureStripePaymentIntentId(byId, intent.id);
    return byId;
  }

  private extractPaymentIntentId(
    paymentIntent:
      | Stripe.Checkout.Session["payment_intent"]
      | Stripe.Charge["payment_intent"]
  ): string | null {
    if (!paymentIntent) {
      return null;
    }

    if (typeof paymentIntent === "string") {
      return paymentIntent;
    }

    if (typeof paymentIntent === "object" && "id" in paymentIntent) {
      return paymentIntent.id;
    }

    return null;
  }

  private async handleCheckoutSessionSuccess(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    if (session.payment_status && session.payment_status !== "paid") {
      logger.info(
        { sessionId: session.id, paymentStatus: session.payment_status },
        "Checkout session not paid; skipping"
      );
      return;
    }

    const paymentIntentId = this.extractPaymentIntentId(session.payment_intent);
    if (!paymentIntentId) {
      logger.warn(
        { sessionId: session.id },
        "Checkout session missing payment intent"
      );
      return;
    }

    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    await this.handlePaymentSuccess(intent);
  }

  private async handleCheckoutSessionFailure(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    const paymentIntentId = this.extractPaymentIntentId(session.payment_intent);
    if (!paymentIntentId) {
      logger.warn(
        { sessionId: session.id },
        "Checkout session missing payment intent"
      );
      return;
    }

    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    await this.handlePaymentFailure(intent);
  }

  private async handleChargeSuccess(charge: Stripe.Charge): Promise<void> {
    const paymentIntentId = this.extractPaymentIntentId(charge.payment_intent);
    if (!paymentIntentId) {
      logger.warn(
        { chargeId: charge.id },
        "Charge succeeded without payment intent"
      );
      return;
    }

    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    await this.handlePaymentSuccess(intent);
  }

  private async handleChargeFailure(charge: Stripe.Charge): Promise<void> {
    const paymentIntentId = this.extractPaymentIntentId(charge.payment_intent);
    if (!paymentIntentId) {
      logger.warn(
        { chargeId: charge.id },
        "Charge failed without payment intent"
      );
      return;
    }

    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    await this.handlePaymentFailure(intent);
  }

  async reconcilePaymentIntent(
    stripePaymentIntentId: string
  ): Promise<void> {
    if (!stripePaymentIntentId) {
      return;
    }

    const intent = await this.stripe.paymentIntents.retrieve(
      stripePaymentIntentId
    );

    if (intent.status === "succeeded") {
      await this.handlePaymentSuccess(intent);
      return;
    }

    if (
      intent.status === "canceled" ||
      intent.status === "requires_payment_method"
    ) {
      await this.handlePaymentFailure(intent);
    }
  }

  // ============================================
  // HANDLE PAYMENT SUCCESS
  // ============================================

  async handlePaymentSuccess(intent: Stripe.PaymentIntent): Promise<void> {
    const grantAccess = await this.resolveGrantAccessForIntent(intent);

    if (!grantAccess) {
      logger.error(
        {
          stripePaymentIntentId: intent.id,
          grantAccessId: intent.metadata?.grantAccessId,
        },
        "Grant access not found for payment intent"
      );
      return;
    }

    const alreadySucceeded = grantAccess.payment?.paymentStatus === "succeeded";

    // Update payment status
    await this.grantAccessRepository.recordPaymentSuccess(
      String(grantAccess._id)
    );

    if (alreadySucceeded) {
      logger.info(
        {
          grantAccessId: grantAccess._id,
          stripePaymentIntentId: intent.id,
        },
        "Payment already marked as succeeded"
      );
      return;
    }

    // Add agent to viewedBy
    await this.preMarketRepository.addAgentToViewedBy(
      grantAccess.preMarketRequestId.toString(),
      grantAccess.agentId.toString(),
      "normalAgents"
    );

    await this.notifyRenterAccessGranted(grantAccess);

    // Notify agent
    // await this.notifier.notifyAgentOfPaymentSuccess(grantAccess);

    logger.info(
      {
        grantAccessId: grantAccess._id,
        agentId: grantAccess.agentId,
      },
      `Payment successful: ${intent.id}`
    );
  }

  // ============================================
  // HANDLE PAYMENT FAILURE
  // ============================================

  async handlePaymentFailure(intent: Stripe.PaymentIntent): Promise<void> {
    const grantAccess = await this.resolveGrantAccessForIntent(intent);

    if (!grantAccess) {
      logger.error(
        {
          stripePaymentIntentId: intent.id,
          grantAccessId: intent.metadata?.grantAccessId,
        },
        "Grant access not found for payment intent"
      );
      return;
    }

    if (grantAccess.payment?.paymentStatus === "succeeded") {
      logger.info(
        {
          grantAccessId: grantAccess._id,
          stripePaymentIntentId: intent.id,
        },
        "Payment already succeeded; ignoring failure"
      );
      return;
    }

    // Increment failure count
    await this.grantAccessRepository.recordPaymentFailure(
      String(grantAccess._id)
    );

    // Notify agent
    const updated = await this.grantAccessRepository.findById(
      String(grantAccess._id)
    );

    // await this.notifier.notifyAgentOfPaymentFailure(updated!);

    logger.info(
      {
        grantAccessId: grantAccess._id,
        failureCount: updated?.payment?.failureCount,
      },
      `Payment failed: ${intent.id}`
    );
  }

  private async notifyRenterAccessGranted(
    grantAccess: IGrantAccessRequest
  ): Promise<void> {
    try {
      const preMarketRequest = await this.preMarketRepository.findById(
        grantAccess.preMarketRequestId.toString()
      );

      if (!preMarketRequest) {
        return;
      }

      const renterId = preMarketRequest.renterId?.toString();
      if (!renterId) {
        return;
      }

      const renter = await this.renterRepository.findByUserId(renterId);
      if (!renter) {
        logger.warn(
          { renterId, requestId: preMarketRequest._id },
          "Renter not found for access grant email"
        );
        return;
      }

      if (renter.emailSubscriptionEnabled === false) {
        logger.info(
          { renterId, requestId: preMarketRequest._id },
          "Renter email subscription disabled, skipping email"
        );
        return;
      }

      if (!renter.email) {
        logger.warn(
          { renterId, requestId: preMarketRequest._id },
          "Renter email missing, skipping access grant email"
        );
        return;
      }

      const agent = await this.userRepository.findById(
        grantAccess.agentId.toString()
      );
      if (!agent) {
        return;
      }

      const listingUrl = `${env.CLIENT_URL}/listings/${preMarketRequest._id}`;
      const location =
        preMarketRequest.locations?.map((l) => l.borough).join(", ") ||
        "Multiple Locations";

      await emailService.sendRenterAccessGrantedNotification({
        to: renter.email,
        renterName: renter.fullName || "Renter",
        agentName: agent.fullName || "Agent",
        agentEmail:
          agent.email || env.EMAIL_REPLY_TO || "support@beforelisted.com",
        listingTitle: preMarketRequest.requestName || "Pre-Market Listing",
        location,
        accessType: "paid",
        listingUrl,
      });
    } catch (error) {
      logger.error(
        { error, grantAccessId: grantAccess._id },
        "Failed to send renter access granted email"
      );
    }
  }

  // ============================================
  // WEBHOOK HANDLER
  // ============================================

  async handleWebhook(event: Stripe.Event): Promise<void> {
    logger.info(
      { eventId: event.id, eventType: event.type },
      "Webhook received"
    );

    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentSuccess(intent);
        break;
      }

      case "payment_intent.payment_failed":
      case "payment_intent.canceled": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentFailure(intent);
        break;
      }

      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutSessionSuccess(session);
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutSessionFailure(session);
        break;
      }

      case "charge.succeeded": {
        const charge = event.data.object as Stripe.Charge;
        await this.handleChargeSuccess(charge);
        break;
      }

      case "charge.failed": {
        const charge = event.data.object as Stripe.Charge;
        await this.handleChargeFailure(charge);
        break;
      }

      case "charge.refunded":
        logger.info(`Charge refunded: ${(event.data.object as any).id}`);
        // Handle refund logic if needed
        break;

      default:
        logger.info(`Unhandled webhook event: ${event.type}`);
    }
  }

  // ============================================
  // CONSTRUCT WEBHOOK EVENT
  // ============================================

  async constructWebhookEvent(
    rawBody: string | Buffer,
    signature: string
  ): Promise<Stripe.Event> {
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  }
}
