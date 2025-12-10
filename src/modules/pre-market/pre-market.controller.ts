// file: src/modules/pre-market/pre-market.controller.ts

import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { logger } from "@/middlewares/pino-logger";
import { ForbiddenException } from "@/utils/app-error.utils";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import { AgentProfileRepository } from "../agent/agent.repository";
import { GrantAccessRepository } from "../grant-access/grant-access.repository";
import { GrantAccessService } from "../grant-access/grant-access.service";
import { PaymentService } from "../payment/payment.service";
import { PreMarketNotifier } from "./pre-market-notifier";
import { PreMarketRepository } from "./pre-market.repository";
import {
  adminApproveSchema,
  adminChargeSchema,
  adminRejectSchema,
  createPreMarketRequestSchema,
  preMarketListSchema,
  requestAccessSchema,
  updatePreMarketRequestSchema,
} from "./pre-market.schema";
import { PreMarketService } from "./pre-market.service";

export class PreMarketController {
  private readonly preMarketService: PreMarketService;
  private readonly grantAccessService: GrantAccessService;
  private readonly paymentService: PaymentService;
  private readonly agentRepository: AgentProfileRepository;

  constructor() {
    this.preMarketService = new PreMarketService();
    this.grantAccessService = new GrantAccessService(
      new GrantAccessRepository(),
      new PreMarketRepository(),
      new PaymentService(
        new GrantAccessRepository(),
        new PreMarketRepository()
      ),
      new PreMarketNotifier()
    );
    this.paymentService = new PaymentService(
      new GrantAccessRepository(),
      new PreMarketRepository()
    );
    this.agentRepository = new AgentProfileRepository();
  }

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
  // AGENT: GET ALL REQUESTS
  // ============================================

  /**
   * Get all pre-market requests (paginated)
   * GET /pre-market/all
   * Protected: Agents only
   *
   * @param req - Request with query parameters
   * @param res - Response
   */
  getAllRequests = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(preMarketListSchema, req);

    const requests = await this.preMarketService.getAllRequests(
      validated.query
    );

    logger.debug({}, "All pre-market requests retrieved");
    ApiResponse.paginated(
      res,
      requests.data,
      requests.pagination,
      "All pre-market requests retrieved"
    );
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
  // AGENT: CREATE PAYMENT INTENT
  // ============================================

  /**
   * Create payment intent for grant access
   * POST /pre-market/payment/create-intent
   * Protected: Agents only
   *
   * @param req - Request with body
   * @param res - Response
   */
  createPaymentIntent = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { grantAccessId } = req.body;

    const paymentIntent =
      await this.grantAccessService.createPaymentIntent(grantAccessId);

    logger.info({ userId, grantAccessId }, "Payment intent created");
    ApiResponse.success(res, paymentIntent, "Payment intent created");
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

  /**
   * TASK 1: AGENT - GET ALL REQUESTS WITH VISIBILITY CONTROL
   */
  getAllRequestsForAgent = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(preMarketListSchema, req);
    const agentId = req.user!.userId;

    const requests = await this.preMarketService.getAllRequestsForAgent(
      agentId,
      validated.query
    );

    logger.info(
      { agentId, requestCount: requests.data.length },
      "Agent retrieved all pre-market requests"
    );

    ApiResponse.paginated(
      res,
      requests.data,
      requests.pagination,
      "Pre-market requests retrieved with visibility control"
    );
  });

  /**
   * TASK 2: AGENT - GET SPECIFIC REQUEST WITH VISIBILITY CONTROL
   */
  getRequestForAgent = asyncHandler(async (req: Request, res: Response) => {
    const agentId = req.user!.userId;
    const { requestId } = req.params;

    const request = await this.preMarketService.getRequestForAgent(
      agentId,
      requestId
    );

    logger.info({ agentId, requestId }, "Agent retrieved specific request");

    ApiResponse.success(
      res,
      request,
      "Pre-market request retrieved with visibility control"
    );
  });

  // ============================================
  // ADMIN: GET ALL PRE-MARKET REQUESTS (FULL)
  // ============================================

  /**
   * ADMIN: Get all pre-market requests with full renter + referral + agent summary.
   * GET /pre-market/admin/requests
   * Protected: Admin only
   */
  getAllRequestsForAdmin = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(preMarketListSchema, req);

    const result = await this.preMarketService.getAllRequestsForAdmin(
      validated.query
    );

    logger.debug(
      { adminId: req.user?.userId, itemCount: result.data.length },
      "Admin retrieved all pre-market requests"
    );

    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Admin pre-market requests retrieved successfully"
    );
  });

  // ============================================
  // ADMIN: GET SINGLE PRE-MARKET REQUEST (FULL)
  // ============================================

  /**
   * ADMIN: Get single pre-market request with full renter + referral + agent summary.
   * GET /pre-market/admin/requests/:requestId
   * Protected: Admin only
   */
  getRequestByIdForAdmin = asyncHandler(async (req: Request, res: Response) => {
    const { requestId } = req.params;

    logger.debug(
      { adminId: req.user?.userId, requestId },
      "Admin retrieving pre-market request details"
    );

    const request =
      await this.preMarketService.getRequestByIdForAdmin(requestId);

    ApiResponse.success(
      res,
      request,
      "Admin pre-market request details retrieved successfully"
    );
  });
}
