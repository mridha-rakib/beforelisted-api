// file: src/modules/grant-access/grant-access.controller.ts

import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { logger } from "@/middlewares/pino-logger";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@/utils/app-error.utils";
import { ApiResponse } from "@/utils/response.utils";
import type { Request, Response } from "express";

import { AgentProfileRepository } from "../agent/agent.repository";
import { PaymentService } from "../payment/payment.service";
import { PreMarketNotifier } from "../pre-market/pre-market-notifier";
import { PreMarketRepository } from "../pre-market/pre-market.repository";
import { GrantAccessRepository } from "./grant-access.repository";
import { GrantAccessService } from "./grant-access.service";

/**
 * Grant Access Controller
 * Handles agent access requests and admin approval workflows
 */
export class GrantAccessController {
  private readonly grantAccessService: GrantAccessService;
  private readonly grantAccessRepository: GrantAccessRepository;
  private readonly preMarketRepository: PreMarketRepository;
  private readonly paymentService: PaymentService;
  private readonly agentRepository: AgentProfileRepository;
  private readonly notifier: PreMarketNotifier;

  constructor(grantAccessService: GrantAccessService) {
    this.grantAccessService = grantAccessService;
    this.grantAccessRepository = new GrantAccessRepository();
    this.preMarketRepository = new PreMarketRepository();
    this.paymentService = new PaymentService(
      this.grantAccessRepository,
      this.preMarketRepository
    );
    this.agentRepository = new AgentProfileRepository();
    this.notifier = new PreMarketNotifier();
  }

  /**
   * GET /admin/payments
   * Get all payments with filtering and sorting
   * Protected: Admin only
   */
  getAllPayments = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.userId;
    const { paymentStatus, accessStatus, page, limit } = req.query;

    logger.info(
      {
        adminId,
        paymentStatus,
        accessStatus,
        page,
        limit,
      },
      "Admin requesting all payments"
    );

    const filters = {
      paymentStatus: paymentStatus as any,
      accessStatus: accessStatus as any,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    };

    const result = await this.grantAccessService.getAdminPayments(filters);

    logger.info(
      {
        adminId,
        count: result.data.length,
        total: result.pagination.total,
      },
      "Admin payments retrieved"
    );

    return ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "All payments retrieved successfully"
    );
  });

  /**
   * GET /admin/payments/stats
   * Get payment statistics
   * Protected: Admin only
   */
  getPaymentStats = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.userId;

    logger.info({ adminId }, "Admin requesting payment statistics");

    const stats = await this.grantAccessService.getAdminPaymentStats();

    logger.info({ adminId }, "Payment statistics retrieved");

    return ApiResponse.success(
      res,
      stats,
      "Payment statistics retrieved successfully"
    );
  });

  /**
   * POST /grant-access/payment/create-intent
   * Create payment intent for grant access
   * Protected: Agents only
   */
  createPaymentIntent = asyncHandler(async (req: Request, res: Response) => {
    const agentId = req.user!.userId;
    const { grantAccessId } = req.body;

    logger.info({ agentId, grantAccessId }, "Agent requesting payment intent");

    if (!grantAccessId) {
      throw new BadRequestException("Grant access ID is required");
    }

    const paymentIntent =
      await this.grantAccessService.createPaymentIntent(grantAccessId);

    logger.info(
      { agentId, grantAccessId },
      "Payment intent created successfully"
    );

    return ApiResponse.success(
      res,
      paymentIntent,
      "Payment intent created successfully"
    );
  });

  /**
   * GET /grant-access/request/:requestId
   * Get specific pre-market request details
   * Dual-path: Grant Access agents see ALL, Normal agents see ONLY paid
   * Protected: Agents only
   */
  getRequestDetailsForGrantAccessAgent = asyncHandler(
    async (req: Request, res: Response) => {
      const agentId = req.user!.userId;
      const { requestId } = req.params;

      logger.info({ agentId, requestId }, "Agent requesting request details");

      // ============================================
      // STEP 1: Get Agent Profile
      // ============================================
      const agent = await this.agentRepository.findByUserId(agentId);

      if (!agent) {
        logger.warn({ agentId }, "Agent profile not found");
        throw new ForbiddenException("Agent profile not found");
      }

      logger.info(
        { agentId, hasGrantAccess: agent.hasGrantAccess },
        "Agent profile retrieved"
      );

      // ============================================
      // STEP 2: Get the Request
      // ============================================
      const request = await this.grantAccessService.getRequestById(requestId);

      if (!request) {
        logger.warn({ agentId, requestId }, "Request not found");
        throw new NotFoundException("Pre-market request not found");
      }

      logger.info(
        { agentId, requestId, requestStatus: request.status },
        "Request retrieved from database"
      );

      // ============================================
      // GRANT ACCESS AGENTS: See ALL listings
      // ============================================
      if (agent.hasGrantAccess === true) {
        logger.info(
          { agentId, type: "grant-access" },
          "✅ Grant access agent - can see ANY listing with full details"
        );

        // ✅ Enrich with full renter info
        const enriched =
          await this.grantAccessService.enrichRequestWithFullRenterInfo(
            request,
            agentId
          );

        logger.info(
          { agentId, requestId },
          "Request enriched with renter information"
        );

        // ✅ Track as grant access agent
        try {
          await this.preMarketRepository.addAgentToViewedBy(
            requestId,
            agentId,
            "grantAccessAgents"
          );

          logger.info(
            { agentId, requestId },
            "✅ Marked as viewed by grant access agent"
          );
        } catch (error) {
          logger.warn(
            { agentId, requestId, error },
            "Failed to track view (non-blocking)"
          );
        }

        // ✅ Return full response
        logger.info(
          {
            agentId,
            requestId,
            renterName: enriched.renterInfo?.renterName,
          },
          "✅ Returning full request details to grant access agent"
        );

        return ApiResponse.success(
          res,
          enriched,
          "Pre-market request details retrieved"
        );
      }

      // ============================================
      // NORMAL AGENTS: See ONLY paid listings
      // ============================================
      logger.info(
        { agentId, type: "normal" },
        "🔒 Normal agent - checking if they have PAID access for this request"
      );

      // ✅ Check if agent has paid access for THIS specific request
      // NOTE: Pass ONE object with all conditions
      const paidAccess = await this.grantAccessRepository.findOne({
        agentId: agentId,
        preMarketRequestId: requestId,
        status: { $in: ["approved", "paid"] },
      });

      if (!paidAccess) {
        logger.warn(
          { agentId, requestId },
          "❌ Normal agent does NOT have paid access to this request"
        );

        throw new ForbiddenException(
          "You do not have access to this request. Request access or pay to view renter information."
        );
      }

      logger.info(
        { agentId, requestId, accessStatus: paidAccess.status },
        `✅ Normal agent has ${paidAccess.status} access to this request`
      );

      // ✅ Enrich with full renter info (since they paid)
      const enriched =
        await this.grantAccessService.enrichRequestWithFullRenterInfo(
          request,
          agentId
        );

      logger.info(
        { agentId, requestId },
        "Request enriched with renter information"
      );

      // ✅ Track as normal agent
      try {
        await this.preMarketRepository.addAgentToViewedBy(
          requestId,
          agentId,
          "normalAgents"
        );

        logger.info(
          { agentId, requestId },
          "✅ Marked as viewed by normal agent"
        );
      } catch (error) {
        logger.warn(
          { agentId, requestId, error },
          "Failed to track view (non-blocking)"
        );
      }

      // ✅ Return full response
      logger.info(
        {
          agentId,
          requestId,
          accessType: paidAccess.status,
          renterName: enriched.renterInfo?.renterName,
        },
        "✅ Returning full request details to normal agent (paid access)"
      );

      return ApiResponse.success(
        res,
        {
          ...enriched,
          accessType: paidAccess.status,
        },
        "Pre-market request details retrieved"
      );
    }
  );

  /**
   * POST /grant-access/request
   * Agent request access to view renter details
   * Protected: Agents only
   */
  requestAccess = asyncHandler(async (req: Request, res: Response) => {
    const agentId = req.user!.userId;
    const { preMarketRequestId } = req.body;

    logger.info(
      { agentId, preMarketRequestId },
      "Agent requesting grant access"
    );

    if (!preMarketRequestId) {
      throw new BadRequestException("Pre-market request ID is required");
    }

    const grantAccess = await this.grantAccessService.requestAccess(
      agentId,
      preMarketRequestId
    );

    logger.info(
      { agentId, preMarketRequestId },
      "Access request created successfully"
    );

    return ApiResponse.created(
      res,
      grantAccess,
      "Access request created successfully"
    );
  });

  /**
   * POST /grant-access/admin/:requestId/approve
   * Admin approve access (free)
   * Protected: Admin only
   */
  adminApprove = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.userId;
    const { requestId } = req.params;
    const { notes } = req.body;

    logger.info({ adminId, requestId }, "Admin approving free access");

    const result = await this.grantAccessService.adminDecideAccess(requestId, {
      action: "approve",
      adminId,
      isFree: true,
      notes,
    });

    logger.info({ adminId, requestId }, "✅ Access approved (free)");

    return ApiResponse.success(res, result, "Access approved successfully");
  });

  /**
   * POST /grant-access/admin/:requestId/charge
   * Admin charge for access
   * Protected: Admin only
   */
  adminCharge = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.userId;
    const { requestId } = req.params;
    const { chargeAmount, notes } = req.body;

    logger.info(
      { adminId, requestId, chargeAmount },
      "Admin charging for access"
    );

    if (!chargeAmount || chargeAmount <= 0) {
      throw new BadRequestException("Valid charge amount is required");
    }

    const result = await this.grantAccessService.adminDecideAccess(requestId, {
      action: "charge",
      adminId,
      isFree: false,
      chargeAmount,
      notes,
    });

    logger.info({ adminId, requestId, chargeAmount }, "✅ Access charged");

    return ApiResponse.success(res, result, "Access charged successfully");
  });

  /**
   * POST /grant-access/admin/:requestId/reject
   * Admin reject access request
   * Protected: Admin only
   */
  adminReject = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.userId;
    const { requestId } = req.params;
    const { notes } = req.body;

    logger.warn({ adminId, requestId }, "Admin rejecting access request");

    const result = await this.grantAccessService.adminDecideAccess(requestId, {
      action: "reject",
      adminId,
      notes,
    });

    logger.warn({ adminId, requestId }, "❌ Access rejected");

    return ApiResponse.success(res, result, "Access rejected successfully");
  });

  deletePayment = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.userId;
    const { paymentId } = req.params;
    if (!paymentId) throw new BadRequestException("Payment ID required");

    const result = await this.grantAccessService.deleteAdminPayment(
      paymentId,
      adminId
    );
    return ApiResponse.success(res, result.deletedPayment, result.message);
  });

  softDeletePayment = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.userId;
    const { paymentId } = req.params;
    const { reason } = req.body;
    if (!paymentId) throw new BadRequestException("Payment ID required");

    const result = await this.grantAccessService.softDeleteAdminPayment(
      paymentId,
      adminId,
      reason
    );
    return ApiResponse.success(res, result.softDeletedPayment, result.message);
  });

  bulkDeletePayments = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.userId;
    const { paymentIds } = req.body;
    if (!Array.isArray(paymentIds) || !paymentIds.length) {
      throw new BadRequestException("Payment IDs array required");
    }

    const result = await this.grantAccessService.bulkDeletePayments(
      paymentIds,
      adminId
    );
    return ApiResponse.success(
      res,
      { deletedCount: result.deletedCount, failedCount: result.failedCount },
      result.message
    );
  });

  restorePayment = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.userId;
    const { paymentId } = req.params;
    if (!paymentId) throw new BadRequestException("Payment ID required");

    const result = await this.grantAccessService.restoreDeletedPayment(
      paymentId,
      adminId
    );
    return ApiResponse.success(res, result.restoredPayment, result.message);
  });

  getPaymentDeletionHistory = asyncHandler(
    async (req: Request, res: Response) => {
      const { paymentId } = req.params;
      if (!paymentId) throw new BadRequestException("Payment ID required");

      const history =
        await this.grantAccessService.getPaymentDeletionHistory(paymentId);
      return ApiResponse.success(
        res,
        history,
        "History retrieved successfully"
      );
    }
  );
}

export default GrantAccessController;
