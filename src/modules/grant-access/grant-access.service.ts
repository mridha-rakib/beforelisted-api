// file: src/modules/grant-access/grant-access.service.ts

import { logger } from "@/middlewares/pino-logger";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@/utils/app-error.utils";
import { PreMarketNotifier } from "../notification/pre-market.notifier";
import { PaymentService } from "../payment/payment.service";
import { PreMarketRepository } from "../pre-market/pre-market.repository";
import type { IGrantAccessRequest } from "./grant-access.model";
import { GrantAccessRepository } from "./grant-access.repository";

export class GrantAccessService {
  constructor(
    private readonly grantAccessRepository: GrantAccessRepository,
    private readonly preMarketRepository: PreMarketRepository,
    private readonly paymentService: PaymentService,
    private readonly notifier: PreMarketNotifier
  ) {}

  // ============================================
  // AGENT REQUEST ACCESS
  // ============================================

  async requestAccess(
    agentId: string,
    preMarketRequestId: string
  ): Promise<IGrantAccessRequest> {
    // Check if already requested
    const existing = await this.grantAccessRepository.findByAgentAndRequest(
      agentId,
      preMarketRequestId
    );

    if (existing) {
      if (existing.status === "approved" || existing.status === "paid") {
        throw new ConflictException(
          "You already have access to this pre-market request"
        );
      }

      throw new ConflictException(
        `You have already requested access to this property. ` +
          `Current status: ${existing.status}. ` +
          `Please wait for admin decision or contact support.`
      );
    }

    // Create grant access request
    const grantAccess = await this.grantAccessRepository.create({
      preMarketRequestId,
      agentId,
      status: "pending",
      payment: {
        amount: 0,
        currency: "USD",
        paymentStatus: "pending",
        failureCount: 0,
        failedAt: [],
      },
    });

    logger.info(`Grant access requested: ${preMarketRequestId}`, { agentId });

    // Notify admin
    await this.notifier.notifyAdminOfGrantAccessRequest(grantAccess);

    return grantAccess;
  }

  // ============================================
  // ADMIN DECISION
  // ============================================

  async adminDecideAccess(
    grantAccessId: string,
    decision: {
      action: "approve" | "reject" | "charge";
      adminId: string;
      isFree?: boolean;
      chargeAmount?: number;
      notes?: string;
    }
  ): Promise<IGrantAccessRequest> {
    const grantAccess =
      await this.grantAccessRepository.findById(grantAccessId);

    if (!grantAccess) {
      throw new NotFoundException("Grant access request not found");
    }

    // REJECT
    if (decision.action === "reject") {
      grantAccess.status = "rejected";
      grantAccess.adminDecision = {
        decidedBy: decision.adminId as any,
        decidedAt: new Date(),
        notes: decision.notes,
        isFree: false,
      };

      await this.grantAccessRepository.updateById(grantAccessId, grantAccess);
      await this.notifier.notifyAgentOfRejection(grantAccess);

      logger.info(`Grant access rejected: ${grantAccessId}`);

      return grantAccess;
    }

    // APPROVE (FREE)
    if (decision.action === "approve" && decision.isFree) {
      grantAccess.status = "approved";
      grantAccess.adminDecision = {
        decidedBy: decision.adminId as any,
        decidedAt: new Date(),
        isFree: true,
        notes: decision.notes,
      };

      // Add agent to viewedBy
      await this.preMarketRepository.addAgentToViewedBy(
        grantAccess.preMarketRequestId.toString(),
        grantAccess.agentId.toString(),
        "normalAgents"
      );

      await this.grantAccessRepository.updateById(grantAccessId, grantAccess);
      await this.notifier.notifyAgentOfApproval(grantAccess, true);

      logger.info(`Grant access approved (free): ${grantAccessId}`);

      return grantAccess;
    }

    // CHARGE
    if (decision.action === "charge" || !decision.isFree) {
      if (!decision.chargeAmount || decision.chargeAmount <= 0) {
        throw new BadRequestException("Invalid charge amount");
      }

      grantAccess.payment = {
        amount: decision.chargeAmount,
        currency: "USD",
        paymentStatus: "pending",
        failureCount: 0,
        failedAt: [],
      };

      grantAccess.adminDecision = {
        decidedBy: decision.adminId as any,
        decidedAt: new Date(),
        chargeAmount: decision.chargeAmount,
        isFree: false,
        notes: decision.notes,
      };

      grantAccess.status = "pending";

      await this.grantAccessRepository.updateById(grantAccessId, grantAccess);
      await this.notifier.sendPaymentLinkToAgent(grantAccess);

      logger.info(
        `Grant access charged: ${grantAccessId} - $${decision.chargeAmount}`
      );

      return grantAccess;
    }

    throw new BadRequestException("Invalid decision action");
  }

  // ============================================
  // CREATE PAYMENT INTENT
  // ============================================

  async createPaymentIntent(
    grantAccessId: string
  ): Promise<{ clientSecret: string; amount: number }> {
    const grantAccess =
      await this.grantAccessRepository.findById(grantAccessId);

    if (!grantAccess) {
      throw new NotFoundException("Grant access request not found");
    }

    if (grantAccess.status !== "pending" || !grantAccess.payment) {
      throw new BadRequestException("Invalid payment status");
    }

    const paymentIntent = await this.paymentService.createPaymentIntent({
      amount: grantAccess.payment.amount,
      metadata: {
        grantAccessId: grantAccess._id.toString(),
        agentId: grantAccess.agentId.toString(),
        preMarketRequestId: grantAccess.preMarketRequestId.toString(),
      },
    });

    // Store payment intent ID
    grantAccess.payment.stripePaymentIntentId = paymentIntent.id;
    await this.grantAccessRepository.updateById(grantAccessId, grantAccess);

    return {
      clientSecret: paymentIntent.client_secret!,
      amount: grantAccess.payment.amount,
    };
  }
}
