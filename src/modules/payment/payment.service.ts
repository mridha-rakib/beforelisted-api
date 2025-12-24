// file: src/modules/payment/payment.service.ts

import { env } from "@/env";
import { logger } from "@/middlewares/pino-logger";
import { NotFoundException } from "@/utils/app-error.utils";
import Stripe from "stripe";
import type { IGrantAccessRequest } from "../grant-access/grant-access.model";
import { GrantAccessRepository } from "../grant-access/grant-access.repository";
import { RenterRepository } from "../renter/renter.repository";
import { UserRepository } from "../user/user.repository";
import { PreMarketNotifier } from "../pre-market/pre-market-notifier";
import { PreMarketRepository } from "../pre-market/pre-market.repository";
import { emailService } from "@/services/email.service";

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
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(options.amount * 100), // Convert to cents
      currency: "usd",
      metadata: options.metadata,
      description: `Pre-Market Access - ${options.metadata.preMarketRequestId}`,
    });

    logger.info(
      options.metadata,
      `Payment intent created: ${paymentIntent.id}`
    );

    return paymentIntent;
  }

  // ============================================
  // HANDLE PAYMENT SUCCESS
  // ============================================

  async handlePaymentSuccess(stripePaymentIntentId: string): Promise<void> {
    const grantAccess = await this.grantAccessRepository.findOne({
      "payment.stripePaymentIntentId": stripePaymentIntentId,
    });

    if (!grantAccess) {
      logger.error(
        `Grant access not found for payment intent: ${stripePaymentIntentId}`
      );
      throw new NotFoundException("Grant access request not found");
    }

    // Update payment status
    await this.grantAccessRepository.recordPaymentSuccess(
      grantAccess._id.toString()
    );

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
      `Payment successful: ${stripePaymentIntentId}`
    );
  }

  // ============================================
  // HANDLE PAYMENT FAILURE
  // ============================================

  async handlePaymentFailure(stripePaymentIntentId: string): Promise<void> {
    const grantAccess = await this.grantAccessRepository.findOne({
      "payment.stripePaymentIntentId": stripePaymentIntentId,
    });

    if (!grantAccess) {
      logger.error(
        `Grant access not found for payment intent: ${stripePaymentIntentId}`
      );
      throw new NotFoundException("Grant access request not found");
    }

    // Increment failure count
    await this.grantAccessRepository.recordPaymentFailure(
      grantAccess._id.toString()
    );

    // Notify agent
    const updated = await this.grantAccessRepository.findById(
      grantAccess._id.toString()
    );

    // await this.notifier.notifyAgentOfPaymentFailure(updated!);

    logger.info(
      {
        grantAccessId: grantAccess._id,
        failureCount: updated?.payment?.failureCount,
      },
      `Payment failed: ${stripePaymentIntentId}`
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
        agentEmail: agent.email || env.EMAIL_REPLY_TO || "support@beforelisted.com",
        listingTitle: preMarketRequest.requestName || "Pre-Market Listing",
        location,
        accessType: "paid",
        listingUrl,
      });
    } catch (error) {
      logger.error({ error, grantAccessId: grantAccess._id }, "Failed to send renter access granted email");
    }
  }

  // ============================================
  // WEBHOOK HANDLER
  // ============================================

  async handleWebhook(event: Stripe.Event): Promise<void> {
    logger.info(`Webhook received: ${event.type}`);

    switch (event.type) {
      case "payment_intent.succeeded":
        await this.handlePaymentSuccess(
          (event.data.object as Stripe.PaymentIntent).id
        );
        break;

      case "payment_intent.payment_failed":
        await this.handlePaymentFailure(
          (event.data.object as Stripe.PaymentIntent).id
        );
        break;

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
