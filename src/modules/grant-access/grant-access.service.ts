// file: src/modules/grant-access/grant-access.service.ts

import { logger } from "@/middlewares/pino-logger";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@/utils/app-error.utils";
import { PaymentService } from "../payment/payment.service";
import { PreMarketNotifier } from "../pre-market/pre-market-notifier";
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
    const listingActivationCheck =
      await this.preMarketRepository.findByIdWithActivationStatus(
        preMarketRequestId
      );

    if (!listingActivationCheck) {
      throw new NotFoundException("Pre-market request not found");
    }

    if (!listingActivationCheck.isActive) {
      throw new ForbiddenException(
        "This listing is no longer accepting requests"
      );
    }
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

    logger.info({ agentId }, `Grant access requested: ${preMarketRequestId}`);

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

  async getAdminPayments(filters?: {
    paymentStatus?: "pending" | "succeeded" | "failed";
    accessStatus?: "pending" | "approved" | "rejected" | "paid";
    page?: number;
    limit?: number;
  }): Promise<{
    data: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    logger.info({ filters }, "Admin fetching all payments");

    const result =
      await this.grantAccessRepository.getAllWithPaymentInfo(filters);

    // Enrich with additional info
    const enrichedData = result.data.map((item: any) => ({
      id: item._id,
      agentId: item.agentId?.id || item.agentId,
      agentName: item.agentId?.fullName || "Unknown",
      agentEmail: item.agentId?.email || "N/A",
      agentPhone: item.agentId?.phoneNumber || "N/A",
      preMarketRequestId:
        item.preMarketRequestId?.id || item.preMarketRequestId,
      listingRequestId: item.preMarketRequestId?.requestId || "N/A",
      status: item.status, // pending, approved, rejected, paid
      paymentStatus: item.payment?.paymentStatus || "N/A", // pending, succeeded, failed
      amount: item.payment?.amount || 0,
      currency: item.payment?.currency || "USD",
      isFree: item.adminDecision?.isFree || false,
      failureCount: item.payment?.failureCount || 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      decisionNotes: item.adminDecision?.notes || null,
      decisionDate: item.adminDecision?.decidedAt || null,
    }));

    logger.info(
      { count: enrichedData.length, total: result.pagination.total },
      "Admin payments retrieved"
    );

    return {
      data: enrichedData,
      pagination: result.pagination,
    };
  }

  /**
   * Get payment statistics (Admin only)
   */
  async getAdminPaymentStats(): Promise<any> {
    logger.info("Admin fetching payment statistics");

    const stats = await this.grantAccessRepository.getPaymentStats();

    logger.info(stats, "Payment statistics retrieved");

    return {
      overview: {
        totalRequests: stats.totalRequests,
        totalPaid: stats.totalPaid,
        totalPending: stats.totalPending,
        totalFailed: stats.totalFailed,
      },
      revenue: {
        totalRevenue: stats.totalRevenue,
        averagePayment: Math.round(stats.averagePayment * 100) / 100,
      },
      breakdown: {
        byPaymentStatus: stats.paymentsByStatus,
        byAccessStatus: stats.paymentsByAccessStatus,
      },
    };
  }

  async deleteAdminPayment(paymentId: string, adminId: string): Promise<any> {
    const payment = await this.grantAccessRepository.findById(paymentId);
    if (!payment) throw new NotFoundException("Payment not found");

    const deleted = await this.grantAccessRepository.deletePayment(paymentId);
    if (!deleted) throw new Error("Failed to delete payment");

    return {
      success: true,
      message: "Payment deleted successfully",
      deletedPayment: {
        id: deleted._id,
        agentId: deleted.agentId,
        amount: deleted.payment?.amount,
      },
    };
  }

  async softDeleteAdminPayment(
    paymentId: string,
    adminId: string,
    reason?: string
  ): Promise<any> {
    const payment = await this.grantAccessRepository.findById(paymentId);
    if (!payment) throw new NotFoundException("Payment not found");

    const softDeleted = await this.grantAccessRepository.softDeletePayment(
      paymentId,
      adminId,
      reason
    );
    if (!softDeleted) throw new Error("Failed to soft delete");

    return {
      success: true,
      message: "Payment soft deleted successfully",
      softDeletedPayment: {
        id: softDeleted._id,
        isDeleted: true,
        deletedAt: softDeleted.deletedAt,
      },
    };
  }

  async bulkDeletePayments(
    paymentIds: string[],
    adminId: string
  ): Promise<any> {
    if (!paymentIds?.length)
      throw new BadRequestException("No payment IDs provided");
    if (paymentIds.length > 100)
      throw new BadRequestException("Cannot delete more than 100 at once");

    const payments = await this.grantAccessRepository.find({
      _id: { $in: paymentIds },
    });
    const foundCount = payments.length;
    const missingCount = paymentIds.length - foundCount;

    if (foundCount === 0) throw new NotFoundException("No payments found");

    const deletedCount =
      await this.grantAccessRepository.deleteMultiplePayments(paymentIds);

    return {
      success: true,
      deletedCount,
      failedCount: missingCount,
      message: `Deleted ${deletedCount}. ${missingCount} not found.`,
    };
  }

  async restoreDeletedPayment(
    paymentId: string,
    adminId: string
  ): Promise<any> {
    const payment = await this.grantAccessRepository.findById(paymentId);
    if (!payment) throw new NotFoundException("Payment not found");
    if (!payment.isDeleted)
      throw new BadRequestException("Payment not marked as deleted");

    const restored = await this.grantAccessRepository.restorePayment(paymentId);
    if (!restored) throw new Error("Failed to restore payment");

    return {
      success: true,
      message: "Payment restored successfully",
      restoredPayment: { id: restored._id, isDeleted: false },
    };
  }

  async getPaymentDeletionHistory(paymentId: string): Promise<any> {
    return await this.grantAccessRepository.getPaymentDeletionHistory(
      paymentId
    );
  }
}
