// file: src\modules\payment\payment.service.ts

import Stripe from "stripe";
import { GrantAccessRepository } from "../grant-access/grant-access.repository";
import { PreMarketRepository } from "../pre-market.repository";
import { PreMarketNotifier } from "../notification/pre-market.notifier";
import { NotFoundException } from "@/utils/app-error.utils";
import { env } from "@/config/env";
import { createLogger } from "@/utils/logger";

const logger = createLogger("PaymentService");

export class PaymentService {
  private stripe: Stripe;

  constructor(
    private readonly grantAccessRepository: GrantAccessRepository,
    private readonly preMarketRepository: PreMarketRepository,
    private readonly notifier: PreMarketNotifier
  ) {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY);
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

    logger.info(`Payment intent created: ${paymentIntent.id}`, options.metadata);

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
      logger.error(`Grant access not found for payment intent: ${stripePaymentIntentId}`);
      throw new NotFoundException("Grant access request not found");
    }

    // Update payment status
    await this.grantAccessRepository.recordPaymentSuccess(grantAccess._id.toString());

    // Add agent to viewedBy
    await this.preMarketRepository.addAgentToViewedBy(
      grantAccess.preMarketRequestId.toString(),
      grantAccess.agentId.toString(),
      "normalAgents"
    );

    // Notify agent
    await this.notifier.notifyAgentOfPaymentSuccess(grantAccess);

    logger.info(`Payment successful: ${stripePaymentIntentId}`, {
      grantAccessId: grantAccess._id,
      agentId: grantAccess.agentId,
    });
  }

  // ============================================
  // HANDLE PAYMENT FAILURE
  // ============================================

  async handlePaymentFailure(stripePaymentIntentId: string): Promise<void> {
    const grantAccess = await this.grantAccessRepository.findOne({
      "payment.stripePaymentIntentId": stripePaymentIntentId,
    });

    if (!grantAccess) {
      logger.error(`Grant access not found for payment intent: ${stripePaymentIntentId}`);
      throw new NotFoundException("Grant access request not found");
    }

    // Increment failure count
    await this.grantAccessRepository.recordPaymentFailure(grantAccess._id.toString());

    // Notify agent
    const updated = await this.grantAccessRepository.findById(grantAccess._id.toString());
    await this.notifier.notifyAgentOfPaymentFailure(updated!);

    logger.info(`Payment failed: ${stripePaymentIntentId}`, {
      grantAccessId: grantAccess._id,
      failureCount: updated?.payment?.failureCount,
    });
  }

  // ============================================
  // WEBHOOK HANDLER
  // ============================================

  async handleWebhook(event: Stripe.Event): Promise<void> {
    logger.info(`Webhook received: ${event.type}`);

    switch (event.type) {
      case "payment_intent.succeeded":
        await this.handlePaymentSuccess((event.data.object as Stripe.PaymentIntent).id);
        break;

      case "payment_intent.payment_failed":
        await this.handlePaymentFailure((event.data.object as Stripe.PaymentIntent).id);
        break;

      case "charge.refunded":
        logger.info(`Charge refunded: ${(event.data.object as any).id}`);
        // Handle refund logic if needed
        break;

      default:
        logger.info(`Unhandled webhook event: ${event.type}`);
    }
  }
}
