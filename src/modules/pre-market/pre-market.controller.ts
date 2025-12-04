// pre-market.controller.ts

import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ForbiddenException } from "@/utils/app-error.utils";
import { AgentProfileRepository } from "../agent/agent.repository";

import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import { Request, Response } from "express";
import { GrantAccessService } from "../grant-access/grant-access.service";
import { PaymentService } from "../payment/payment.service";
import { PreMarketService } from "./pre-market.service";

import { logger } from "@/middlewares/pino-logger";
import {
  adminApproveSchema,
  adminChargeSchema,
  adminRejectSchema,
  createPreMarketRequestSchema,
  preMarketListSchema,
  requestAccessSchema,
  updatePreMarketRequestSchema,
} from "./pre-market.schema";

export class PreMarketController {
  constructor(
    private readonly preMarketService: PreMarketService,
    private readonly grantAccessService: GrantAccessService,
    private readonly paymentService: PaymentService,
    private readonly agentRepository: AgentProfileRepository
  ) {}

  // ============================================
  // RENTER: CREATE REQUEST
  // ============================================

  /**
   * Create pre-market request
   * POST /pre-market/create
   * Protected: Renters only
   *
   * @param req - Request with validated body
   * @param res - Response
   */
  createRequest = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createPreMarketRequestSchema, req);
    const userId = req.user!.userId;

    const request = await this.preMarketService.createRequest(
      userId,
      validated.body
    );

    ApiResponse.created(
      res,
      request,
      "Pre-market request created successfully"
    );
  });

  // ============================================
  // RENTER: GET MY REQUESTS
  // ============================================
  /**
   * Get renter's pre-market requests
   * GET /pre-market/my-requests
   * Protected: Renters only
   *
   * @param req - Request with query parameters
   * @param res - Response
   */
  getRenterRequests = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(preMarketListSchema, req);
    const userId = req.user!.userId;

    const requests = await this.preMarketService.getRenterRequests(
      userId,
      validated.query
    );

    ApiResponse.paginated(
      res,
      requests.data,
      requests.pagination,
      "Renter requests retrieved"
    );
  });

  // ============================================
  // RENTER: UPDATE REQUEST
  // ============================================
  /**
   * Update pre-market request
   * PUT /pre-market/:requestId
   * Protected: Renters only
   *
   * @param req - Request with params and body
   * @param res - Response
   */
  updateRequest = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updatePreMarketRequestSchema, req);
    const userId = req.user!.userId;
    const { requestId } = req.params;

    const request = await this.preMarketService.updateRequest(
      userId,
      requestId,
      validated.body
    );

    logger.info({ userId, requestId }, "Pre-market request updated");
    ApiResponse.success(res, request, "Pre-market request updated");
  });

  // ============================================
  // RENTER: DELETE REQUEST
  // ============================================

  /**
   * Delete pre-market request
   * DELETE /pre-market/:requestId
   * Protected: Renters only
   *
   * @param req - Request with params
   * @param res - Response
   */
  deleteRequest = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { requestId } = req.params;

    await this.preMarketService.deleteRequest(userId, requestId);

    logger.warn({ userId, requestId }, "Pre-market request deleted");
    ApiResponse.success(res, { message: "Pre-market request deleted" });
  });

  // ============================================
  // AGENT: GET REQUEST DETAILS
  // ============================================

  /**
   * Get pre-market request details
   * GET /pre-market/:requestId/details
   * Protected: Agents only
   *
   * @param req - Request with params
   * @param res - Response
   */
  getRequestDetails = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { requestId } = req.params;

    const agent = await this.agentRepository.findByUserId(userId);
    if (!agent) {
      throw new ForbiddenException("Agent profile not found");
    }

    const request = await this.preMarketService.getRequestById(requestId);

    // Check visibility
    if (!agent.hasGrantAccess) {
      const hasAccess = request.viewedBy.normalAgents.some(
        (id: any) => id.toString() === userId
      );

      if (!hasAccess) {
        throw new ForbiddenException(
          "Must request access to view renter information"
        );
      }
    }

    logger.debug({ userId, requestId }, "Request details retrieved");
    ApiResponse.success(res, request, "Pre-market request details");
  });

  // ============================================
  // AGENT: REQUEST ACCESS
  // ============================================

  /**
   * Request access to pre-market request details
   * POST /pre-market/grant-access/request
   * Protected: Agents only
   *
   * @param req - Request with body
   * @param res - Response
   */
  requestAccess = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(requestAccessSchema, req);
    const userId = req.user!.userId;

    const grantAccess = await this.grantAccessService.requestAccess(
      userId,
      validated.body.preMarketRequestId
    );

    logger.info(
      { userId, preMarketRequestId: validated.body.preMarketRequestId },
      "Access requested"
    );
    ApiResponse.created(res, grantAccess, "Access request created");
  });

  // ============================================
  // ADMIN: APPROVE (FREE)
  // ============================================

  /**
   * ADMIN: Approve access (free)
   * POST /pre-market/grant-access/admin/:requestId/approve
   * Protected: Admins only
   *
   * @param req - Request with params and body
   * @param res - Response
   */
  adminApprove = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(adminApproveSchema, req);
    const adminId = req.user!.userId;
    const { requestId } = validated.params;

    const result = await this.grantAccessService.adminDecideAccess(requestId, {
      action: "approve",
      adminId,
      isFree: true,
      notes: validated.body.notes,
    });

    logger.info({ adminId, requestId }, "Access approved (free)");
    ApiResponse.success(res, result, "Access approved");
  });

  // ============================================
  // ADMIN: CHARGE
  // ============================================

  /**
   * ADMIN: Charge for access
   * POST /pre-market/grant-access/admin/:requestId/charge
   * Protected: Admins only
   *
   * @param req - Request with params and body
   * @param res - Response
   */
  adminCharge = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(adminChargeSchema, req);
    const adminId = req.user!.userId;
    const { requestId } = validated.params;

    const result = await this.grantAccessService.adminDecideAccess(requestId, {
      action: "charge",
      adminId,
      isFree: false,
      chargeAmount: validated.body.chargeAmount,
      notes: validated.body.notes,
    });

    logger.info(
      { adminId, requestId, amount: validated.body.chargeAmount },
      "Access charged"
    );
    ApiResponse.success(res, result, "Access charged");
  });

  // ============================================
  // ADMIN: REJECT
  // ============================================

  /**
   * ADMIN: Reject access request
   * POST /pre-market/grant-access/admin/:requestId/reject
   * Protected: Admins only
   *
   * @param req - Request with params and body
   * @param res - Response
   */
  adminReject = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(adminRejectSchema, req);
    const adminId = req.user!.userId;
    const { requestId } = validated.params;

    const result = await this.grantAccessService.adminDecideAccess(requestId, {
      action: "reject",
      adminId,
      notes: validated.body.notes,
    });

    logger.warn({ adminId, requestId }, "Access rejected");
    ApiResponse.success(res, result, "Access rejected");
  });

  // ============================================
  // PAYMENT: WEBHOOK
  // ============================================

  /**
   * Handle Stripe webhook events
   * POST /pre-market/payment/webhook
   * Public: No authentication required
   *
   * @param req - Request with raw body
   * @param res - Response
   */
  handleWebhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"] as string;
    const rawBody = (req as any).rawBody;

    const stripeEvent = await this.paymentService.constructWebhookEvent(
      rawBody,
      signature
    );

    await this.paymentService.handleWebhook(stripeEvent);

    logger.debug({ eventType: stripeEvent.type }, "Webhook processed");
    ApiResponse.success(res, { received: true });
  });
}
