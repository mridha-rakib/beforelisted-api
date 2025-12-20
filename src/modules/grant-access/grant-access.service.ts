// file: src/modules/grant-access/grant-access.service.ts

import { logger } from "@/middlewares/pino-logger";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@/utils/app-error.utils";
import { AgentProfileRepository } from "../agent/agent.repository";
import { NotificationService } from "../notification/notification.service";
import { PaymentService } from "../payment/payment.service";
import { PreMarketNotifier } from "../pre-market/pre-market-notifier";
import { PreMarketRepository } from "../pre-market/pre-market.repository";
import { UserRepository } from "../user/user.repository";
import type { IGrantAccessRequest } from "./grant-access.model";
import { GrantAccessRepository } from "./grant-access.repository";

export class GrantAccessService {
  constructor(
    private readonly grantAccessRepository: GrantAccessRepository,
    private readonly preMarketRepository: PreMarketRepository,
    private readonly paymentService: PaymentService,
    private readonly notifier: PreMarketNotifier,
    private readonly notificationService: NotificationService,
    private readonly userRepository: UserRepository,
    private readonly agentRepository: AgentProfileRepository
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
      createdAt: new Date(),
    });

    logger.info({ agentId }, `Grant access requested: ${preMarketRequestId}`);

     try {
      const agent = await this.userRepository.findById(agentId);
      const agentProfile = await this.agentRepository.findByUserId(agentId);

      if (agent && agentProfile && listingActivationCheck) {
        await this.notificationService.notifyAdminAboutGrantAccessRequest({
          agentId,
          agentName: agent.fullName,
          agentEmail: agent.email,
          agentCompany: agentProfile.brokerageName,
          licenseNumber: agentProfile.licenseNumber,
          preMarketRequestId,
          propertyTitle: listingActivationCheck.requestName,
          location:
            listingActivationCheck.locations
              ?.map((l) => l.borough)
              .join(", ") || "Unknown Location",
          renterName: listingActivationCheck.renterId
            ? `Renter ${listingActivationCheck.renterId}`
            : undefined,
          grantAccessId: grantAccess._id.toString(),
        });

        logger.info(
          {
            agentId,
            preMarketRequestId,
            grantAccessId: grantAccess._id,
          },
          "✅ Admin notification created for grant access request"
        );
      }
    } catch (notificationError) {
      logger.error(
        {
          error: notificationError,
          agentId,
          preMarketRequestId,
        },
        "⚠️ Failed to create admin notification (non-blocking)"
      );
    }

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

  async getPaymentDeletionHistory(paymentId: string): Promise<any> {
    return await this.grantAccessRepository.getPaymentDeletionHistory(
      paymentId
    );
  }

  /**
   * Get monthly income analytics
   */
  async getMonthlyIncomeAnalytics(year?: number): Promise<any> {
    logger.info({ year }, "Fetching monthly income analytics");

    const monthlyData = await this.grantAccessRepository.getMonthlyIncome(year);

    logger.info({ count: monthlyData.length }, "Monthly income data retrieved");

    return monthlyData;
  }

  /**
   * Get detailed income for specific month
   */
  async getMonthlyIncomeDetail(year: number, month: number): Promise<any> {
    logger.info({ year, month }, "Fetching monthly income details");

    if (month < 1 || month > 12) {
      throw new BadRequestException("Month must be between 1 and 12");
    }

    const detail = await this.grantAccessRepository.getMonthlyIncomeDetail(
      year,
      month
    );

    logger.info({ year, month }, "Monthly income details retrieved");

    return detail;
  }

  /**
   * Get income for date range
   */
  async getIncomeByDateRange(startDate: string, endDate: string): Promise<any> {
    logger.info({ startDate, endDate }, "Fetching income for date range");

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException("Invalid date format. Use YYYY-MM-DD");
    }

    if (start > end) {
      throw new BadRequestException("Start date must be before end date");
    }

    const range = await this.grantAccessRepository.getIncomeByDateRange(
      start,
      end
    );

    logger.info({ startDate, endDate }, "Income range retrieved");

    return range;
  }

  /**
   * Get yearly income
   */
  async getYearlyIncome(year: number): Promise<any> {
    logger.info({ year }, "Fetching yearly income");

    const yearly = await this.grantAccessRepository.getYearlyIncome(year);

    logger.info({ year }, "Yearly income retrieved");

    return yearly;
  }
}
