// file: src/modules/pre-market/pre-market.controller.ts

import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { logger } from "@/middlewares/pino-logger";
import { ExcelService } from "@/services/excel.service";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@/utils/app-error.utils";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import type Stripe from "stripe";
import { AgentProfileRepository } from "../agent/agent.repository";
import { GrantAccessRepository } from "../grant-access/grant-access.repository";
import { GrantAccessService } from "../grant-access/grant-access.service";
import { PaymentService } from "../payment/payment.service";
import { PreMarketRepository } from "./pre-market.repository";
import {
  adminApproveSchema,
  adminChargeSchema,
  adminRejectSchema,
  agentMatchRequestSchema,
  createPreMarketRequestSchema,
  preMarketListSchema,
  requestAccessSchema,
  toggleShareVisibilitySchema,
  toggleListingActivationSchema,
  updateRequestVisibilitySchema,
  updatePreMarketRequestSchema,
} from "./pre-market.schema";
import { PreMarketService } from "./pre-market.service";

export class PreMarketController {
  private readonly preMarketService: PreMarketService;
  private readonly grantAccessService: GrantAccessService;
  private readonly paymentService: PaymentService;
  private readonly agentRepository: AgentProfileRepository;
  private readonly preMarketRepository: PreMarketRepository;
  private readonly grantAccessRepository: GrantAccessRepository;
  private readonly excelService: ExcelService;

  constructor() {
    this.preMarketService = new PreMarketService();
    this.grantAccessService = new GrantAccessService();
    this.paymentService = new PaymentService();
    this.agentRepository = new AgentProfileRepository();
    this.preMarketRepository = new PreMarketRepository();
    this.grantAccessRepository = new GrantAccessRepository();
    this.excelService = new ExcelService();
  }

  /**
   * Create pre-market request
   * POST /pre-market/create
   * Protected: Renters only
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

  /**
   * Delete pre-market request
   * DELETE /pre-market/:requestId
   * Protected: Renters only
   */
  deleteRequest = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { requestId } = req.params;

    await this.preMarketService.deleteRequest(userId, requestId);

    logger.warn({ userId, requestId }, "Pre-market request deleted");
    ApiResponse.success(res, { message: "Pre-market request deleted" });
  });

  getRenterRequestById = asyncHandler(async (req: Request, res: Response) => {
    const renterId = req.user!.userId;
    const { requestId } = req.params;

    const request = await this.preMarketService.getRenterRequestById(
      renterId,
      requestId
    );

    ApiResponse.success(
      res,
      request,
      "Your pre-market request details retrieved"
    );
  });

  /**
   * Get all pre-market requests (paginated)
   * GET /pre-market/all
   * Protected: Agents only
   */
  getAllRequests = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(preMarketListSchema, req);
    const agentId = req.user!.userId;

    const requests = await this.preMarketService.getAllRequests(
      validated.query,
      agentId
    );

    ApiResponse.paginated(
      res,
      requests.data,
      requests.pagination,
      "All pre-market requests retrieved"
    );
  });

  /**
   * Get pre-market request details
   * GET /pre-market/:requestId/details
   * Protected: Agents only
   */
  getRequestDetails = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { requestId } = req.params;

    // Get agent profile
    const agent = await this.agentRepository.findByUserId(userId);
    if (!agent) {
      throw new ForbiddenException("Agent profile not found");
    }

    const request = await this.preMarketService.getRequestById(requestId);
    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    this.preMarketService.ensureAgentCanViewRequest(agent, request as any);
    await this.preMarketService.ensureAgentCanViewRequestVisibility(
      userId,
      request as any,
    );

    if (agent.hasGrantAccess) {
      const matchRecord = await this.preMarketService.getMatchedAccessRecord(
        userId,
        requestId
      );
      const listingStatus = matchRecord ? "matched" : request.status;
      const grantAccessStatus = "free";

      await this.preMarketRepository.addAgentToViewedBy(
        requestId,
        userId,
        "grantAccessAgents"
      );

      if (matchRecord) {
        const enriched =
          await this.preMarketService.enrichRequestWithFullRenterInfo(
            request,
            userId
          );

        return ApiResponse.success(
          res,
          {
            ...enriched,
            status: grantAccessStatus,
            listingStatus,
            grantAccessStatus,
            grantAccessId: matchRecord._id?.toString(),
            accessType: "admin-granted",
            canRequestAccess: false,
          },
          "Pre-market request details"
        );
      }

      return ApiResponse.success(
        res,
        {
          ...request,
          renterInfo: null,
          status: grantAccessStatus,
          listingStatus,
          grantAccessStatus,
          accessType: "none",
          canRequestAccess: false,
          message: "Match this request to view renter information",
        },
        "Pre-market request details"
      );
    }

    const accessSummary = await this.preMarketService.getAgentAccessSummary(
      userId,
      requestId
    );
    const isRejected = accessSummary.grantAccessStatus === "rejected";
    const hasRequestedAccess =
      accessSummary.grantAccessStatus !== "Available" &&
      accessSummary.grantAccessStatus !== "free" &&
      accessSummary.grantAccessStatus !== "paid" &&
      accessSummary.grantAccessStatus !== "rejected";
    const listingStatus =
      accessSummary.accessType !== "none"
        ? "matched"
        : isRejected
          ? "rejected"
          : hasRequestedAccess
            ? "requested"
            : request.status;

    await this.preMarketRepository.addAgentToViewedBy(
      requestId,
      userId,
      "normalAgents"
    );

    let response: any = {
      ...request,
      status: accessSummary.grantAccessStatus,
      listingStatus,
      grantAccessStatus: accessSummary.grantAccessStatus,
      grantAccessId: accessSummary.grantAccessId,
      accessType: accessSummary.accessType,
      canRequestAccess: accessSummary.canRequestAccess,
      chargeAmount: accessSummary.chargeAmount ?? null,
    };

    if (accessSummary.showPayment && accessSummary.payment) {
      response.payment = accessSummary.payment;
    }

    // Include renter info if agent has access
    if (accessSummary.canSeeRenterInfo) {
      const enriched =
        await this.preMarketService.enrichRequestWithFullRenterInfo(
          request,
          userId
        );
      response = {
        ...response,
        renterInfo: enriched.renterInfo,
      };

      logger.info(
        { userId, requestId, accessType: accessSummary.accessType },
        `Request accessed with ${accessSummary.accessType} renter info access`
      );
    } else {
      response = {
        ...response,
        renterInfo: null,
        message: "Request grant access to see renter information",
      };

      logger.info(
        { userId, requestId },
        "Request accessed without renter info (can request access)"
      );
    }

    ApiResponse.success(res, response, "Pre-market request details");
  });

  // ============================================
  // AGENT: REQUEST ACCESS
  // ============================================

  /**
   * Request access to pre-market request details
   * POST /pre-market/grant-access/request
   * Protected: Agents only
   */
  requestAccess = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(requestAccessSchema, req);
    const userId = req.user!.userId;

    const request = await this.preMarketService.getRequestById(
      validated.body.preMarketRequestId,
    );
    await this.preMarketService.ensureAgentCanViewRequestVisibility(
      userId,
      request as any,
    );

    const grantAccess = await this.grantAccessService.requestAccess(
      userId,
      validated.body.preMarketRequestId
    );

    logger.info(
      { userId, preMarketRequestId: validated.body.preMarketRequestId },
      "Request was moved to the Renter Matches section"
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
      action: "free",
      adminId,
      isFree: true,
      notes: validated.body.notes,
    });

    logger.info({ adminId, requestId }, "Access approved (free)");
    ApiResponse.success(res, result, "Access approved (free)");
  });

  /**
   * ADMIN: Charge for access
   * POST /pre-market/grant-access/admin/:requestId/charge
   * Protected: Admins only
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

  /**
   * ADMIN: Reject access request
   * POST /pre-market/grant-access/admin/:requestId/reject
   * Protected: Admins only
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
   * Handle Stripe webhook event
   * POST /pre-market/payment/webhook
   * Public: No authentication required

   */
  handleWebhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];
    if (typeof signature !== "string" || !signature.trim()) {
      logger.warn("Missing Stripe signature header");
      throw new BadRequestException("Missing Stripe signature");
    }

    const rawBody = (req as any).rawBody ?? req.body;
    const isBuffer = Buffer.isBuffer(rawBody);
    if (
      !rawBody ||
      (typeof rawBody === "string" && rawBody.length === 0) ||
      (isBuffer && rawBody.length === 0)
    ) {
      logger.warn("Stripe webhook received empty body");
      throw new BadRequestException("Empty Stripe webhook payload");
    }

    if (!isBuffer && typeof rawBody !== "string") {
      logger.warn("Stripe webhook payload is not raw");
      throw new BadRequestException("Invalid Stripe webhook payload");
    }

    let stripeEvent: Stripe.Event;
    try {
      stripeEvent = await this.paymentService.constructWebhookEvent(
        rawBody,
        signature
      );
    } catch (error) {
      logger.warn({ error }, "Stripe webhook signature verification failed");
      throw new BadRequestException("Invalid Stripe signature");
    }

    await this.paymentService.handleWebhook(stripeEvent);

    logger.debug({ eventType: stripeEvent.type }, "Webhook processed");
    ApiResponse.success(res, { received: true });
  });

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

  updateRequestVisibility = asyncHandler(
    async (req: Request, res: Response) => {
      const validated = await zParse(updateRequestVisibilitySchema, req);
      const agentId = req.user!.userId;

      const updated = await this.preMarketService.updateRequestVisibility(
        agentId,
        validated.params.requestId,
        validated.body.visibility
      );

      ApiResponse.success(res, updated, "Request visibility updated");
    }
  );

  toggleShareVisibility = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(toggleShareVisibilitySchema, req);
    const agentId = req.user!.userId;

    const updated = await this.preMarketService.toggleRequestShareVisibility(
      agentId,
      validated.params.requestId
    );

    const mode = updated.visibility === "SHARED" ? "ON (Shared)" : "OFF (Private)";
    ApiResponse.success(res, updated, `Share toggle updated: ${mode}`);
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

  /**
   * GET /pre-market/agent/all-requests
   * PHASE -1: Get all available pre-market requests for grant access agents
   *
   * Only shows:
   * - Requests with status = "Match"
   * - Not yet viewed by this agent
   * - Full renter information included
   *
   * Protected: Grant Access Agents only
   */
  getAllRequestsForGrantAccessAgents = asyncHandler(
    async (req: Request, res: Response) => {
      const validated = await zParse(preMarketListSchema, req);
      const userId = req.user!.userId;

      const requests =
        await this.preMarketService.getRequestsForGrantAccessAgents(
          userId,
          validated.query
        );

      logger.debug(
        { userId, itemCount: requests.data.length },
        "Grant access agent retrieved all available requests"
      );

      ApiResponse.paginated(
        res,
        requests.data,
        requests.pagination,
        "Available pre-market requests retrieved"
      );
    }
  );

  /**
   * GET /pre-market/agent/:requestId
   * PHASE -1: Get specific pre-market request details
   *
   * For grant access agents:
   * - Shows full renter information
   * - Shows all request details
   * - Shows referral information
   *
   * Protected: Grant Access Agents only
   */
  // getRequestDetailsForGrantAccessAgent = asyncHandler(
  //   async (req: Request, res: Response) => {
  //     const userId = req.user!.userId;
  //     const { requestId } = req.params;

  //     // Verify agent has grant access
  //     const agent = await this.agentRepository.findByUserId(userId);
  //     if (!agent || !agent.hasGrantAccess) {
  //       throw new ForbiddenException(
  //         "You do not have grant access to view this request"
  //       );
  //     }

  //     const request = await this.preMarketService.getRequestById(requestId);

  //     // Enrich with full renter info
  //     const enriched =
  //       await this.preMarketService.enrichRequestWithFullRenterInfo(
  //         request,
  //         userId
  //       );

  //     // Mark as viewed
  //     await this.preMarketService.markRequestAsViewedByAgent(
  //       requestId,
  //       userId,
  //       "grantAccessAgents"
  //     );

  //     logger.debug(
  //       { userId, requestId },
  //       "Grant access agent retrieved request details"
  //     );

  //     ApiResponse.success(
  //       res,
  //       enriched,
  //       "Pre-market request details retrieved"
  //     );
  //   }
  // );

  getRequestDetailsForGrantAccessAgent = asyncHandler(
    async (req: Request, res: Response) => {
      const agentId = req.user!.userId;
      const { requestId } = req.params;

      // Verify agent has grant access
      const agent = await this.agentRepository.findByUserId(agentId);
      if (!agent) {
        throw new ForbiddenException(
          "You do not have grant access to view this request"
        );
      }

      const request = await this.preMarketService.getRequestById(requestId);
      if (!request) {
        throw new NotFoundException("Pre-market request not found");
      }

      this.preMarketService.ensureAgentCanViewRequest(agent, request as any);
      await this.preMarketService.ensureAgentCanViewRequestVisibility(
        agentId,
        request as any,
      );

      if (agent.hasGrantAccess === true) {
        const matchRecord = await this.preMarketService.getMatchedAccessRecord(
          agentId,
          requestId
        );

        if (!matchRecord) {
          throw new ForbiddenException("You have not matched this request yet");
        }

        const enriched =
          await this.preMarketService.enrichRequestWithFullRenterInfo(
            request,
            agentId
          );

        await this.preMarketRepository.addAgentToViewedBy(
          requestId,
          agentId,
          "grantAccessAgents"
        );
        return ApiResponse.success(
          res,
          {
            ...enriched,
            accessType: "admin-granted",
            status: "matched",
            listingStatus: "matched",
          },
          "Pre-market request details retrieved"
        );
      }

      // ============================================
      // NORMAL AGENTS: See ONLY paid listings
      // ============================================
      logger.info(
        { agentId, type: "normal" },
        "?? Normal agent - checking if they have PAID access for this request"
      );

      const accessCheck = await this.preMarketService.checkAgentAccessToRequest(
        agentId,
        requestId
      );

      if (!accessCheck.hasAccess || !accessCheck.grantAccessRecord) {
        logger.warn(
          { agentId, requestId },
          "? Normal agent does NOT have paid access to this request"
        );

        throw new ForbiddenException(
          "You do not have access to this request. Request access or pay to view renter information."
        );
      }

      const paidAccess = accessCheck.grantAccessRecord;

      logger.info(
        { agentId, requestId, accessStatus: paidAccess.status },
        `? Normal agent has ${paidAccess.status} access to this request`
      );

      // ? Enrich with full renter info (since they paid)
      const enriched =
        await this.preMarketService.enrichRequestWithFullRenterInfo(
          request,
          agentId
        );

      logger.info(
        { agentId, requestId },
        "Request enriched with renter information"
      );

      // ? Track as normal agent
      try {
        await this.preMarketRepository.addAgentToViewedBy(
          requestId,
          agentId,
          "normalAgents"
        );

        logger.info(
          { agentId, requestId },
          "? Marked as viewed by normal agent"
        );
      } catch (error) {
        logger.warn(
          { agentId, requestId, error },
          "Failed to track view (non-blocking)"
        );
      }

      // ? Return full response
      logger.info(
        {
          agentId,
          requestId,
          accessType: paidAccess.status,
          renterName: enriched.renterInfo?.renterName,
        },
        "? Returning full request details to normal agent (paid access)"
      );

      return ApiResponse.success(
        res,
        {
          ...enriched,
          accessType: paidAccess.status,
          status: "matched",
          listingStatus: "matched",
        },
        "Pre-market request details retrieved"
      );
    }
  );

  matchRequestForAgent = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(agentMatchRequestSchema, req);
    const agentId = req.user!.userId;
    const { requestId } = validated.params;

    const matchRecord = await this.preMarketService.matchRequestForAgent(
      agentId,
      requestId
    );

    logger.info({ agentId, requestId }, "Agent matched pre-market request");

    ApiResponse.success(
      res,
      matchRecord,
      "Request was moved to the Renter Matches section"
    );
  });

  getRequestDetailsForAgent = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = req.user!.userId;
      const { requestId } = req.params;

      // Get agent profile
      const agent = await this.agentRepository.findByUserId(userId);
      if (!agent) {
        throw new ForbiddenException("Agent profile not found");
      }

      // Get request
      const request = await this.preMarketService.getRequestById(requestId);

      this.preMarketService.ensureAgentCanViewRequest(agent, request as any);
      await this.preMarketService.ensureAgentCanViewRequestVisibility(
        userId,
        request as any,
      );

      // Check dual access
      const accessCheck = await this.preMarketService.checkAgentAccessToRequest(
        userId,
        requestId
      );

      if (!accessCheck.hasAccess) {
        throw new ForbiddenException(
          "You don't have access to this request. " +
            "Request access or pay to view renter information."
        );
      }

      // Mark as viewed
      await this.preMarketRepository.addAgentToViewedBy(
        requestId,
        userId,
        agent.hasGrantAccess ? "grantAccessAgents" : "normalAgents"
      );

      // Log access type
      logger.info(
        { userId, requestId, accessType: accessCheck.accessType },
        "Agent accessed request"
      );

      // Return with renter info
      const enriched =
        await this.preMarketService.enrichRequestWithFullRenterInfo(
          request,
          userId
        );

      ApiResponse.success(
        res,
        {
          ...enriched,
          accessType: accessCheck.accessType,
        },
        "Pre-market request details"
      );
    }
  );

  adminDeleteRequest = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.userId;
    const { requestId } = req.params;

    await this.preMarketService.adminDeleteRequest(requestId);

    logger.warn({ adminId, requestId }, "Admin deleted pre-market request");

    ApiResponse.success(res, {
      message: "Pre-market request deleted successfully",
    });
  });

  /**
   * PUT /pre-market/:requestId/toggle-status
   * Protected: Renters only
   */
  toggleListingActivation = asyncHandler(
    async (req: Request, res: Response) => {
      const validated = await zParse(toggleListingActivationSchema, req);
      const userId = req.user!.userId;

      const updated = await this.preMarketService.toggleListingActivation(
        validated.params.requestId,
        validated.body.isActive,
        userId,
        "Renter"
      );

      logger.info(
        { userId, listingId: validated.params.requestId },
        `Listing ${validated.body.isActive ? "activated" : "deactivated"}`
      );

      ApiResponse.success(
        res,
        updated,
        `Listing ${validated.body.isActive ? "activated" : "deactivated"} successfully`
      );
    }
  );

  adminToggleListingStatus = asyncHandler(
    async (req: Request, res: Response) => {
      const adminId = req.user!.userId;
      const { renterId, listingId } = req.params;

      // Validate IDs format
      if (!listingId || listingId.length < 24) {
        throw new BadRequestException("Invalid listing ID");
      }

      // Get current listing to check its status
      const currentListing =
        await this.preMarketRepository.getRequestById(listingId);

      if (!currentListing) {
        throw new NotFoundException("Pre-market request (listing) not found");
      }

      // Verify listing belongs to the specified renter
      if (currentListing.renterId.toString() !== renterId) {
        throw new BadRequestException(
          "Listing does not belong to the specified renter"
        );
      }

      const currentStatus = currentListing.isActive ?? true;
      const newStatus = !currentStatus;

      // Update listing with toggled status
      const updated = await this.preMarketService.toggleListingActivation(
        listingId,
        newStatus,
        adminId,
        "Admin"
      );

      // Log the action
      logger.info(
        {
          adminId,
          renterId,
          listingId,
          previousStatus: currentStatus,
          newStatus: newStatus,
        },
        `Admin toggled listing status: ${
          newStatus ? "activated" : "deactivated"
        }`
      );

      // Return success response with updated listing
      ApiResponse.success(
        res,
        updated,
        `Listing ${newStatus ? "activated" : "deactivated"} successfully`
      );
    }
  );

  /**
   * GET /pre-market/renter/requests/with-agents
   *
   */

  getRenterRequestsWithAgents = asyncHandler(
    async (req: Request, res: Response) => {
      const validated = await zParse(preMarketListSchema, req);
      const renterId = req.user!.userId;

      logger.debug(
        { renterId },
        "Renter retrieving all requests with agent matches"
      );

      // Get all requests with their agents
      const result = await this.preMarketService.getRenterRequestsWithAgents(
        renterId,
        validated.query
      );

      const totalAgents = result.data.reduce(
        (sum: number, r: any) => sum + (r.agentMatches?.totalCount || 0),
        0
      );

      logger.info(
        {
          renterId,
          requestCount: result.data.length,
          totalAgents: totalAgents,
        },
        "Renter retrieved all requests with agents"
      );

      ApiResponse.paginated(
        res,
        result.data,
        result.pagination,
        "All pre-market requests with matched agents retrieved successfully"
      );
    }
  );

  /**
   * Download consolidated Excel file info
   * GET /api/pre-market/admin/excel-download
   * Protected: Admin only
   */
  downloadConsolidatedExcel = asyncHandler(
    async (req: Request, res: Response) => {
      const adminId = req.user!.userId;

      const metadata = await this.preMarketService.getConsolidatedExcel();

      logger.info({ adminId }, "Admin downloaded Excel metadata");

      ApiResponse.success(
        res,
        {
          fileName: metadata.fileName,
          fileUrl: metadata.fileUrl,
          totalRequests: metadata.totalRequests,
          version: metadata.version,
          lastUpdated: metadata.lastUpdated,
          downloadUrl: metadata.fileUrl, // Direct S3 link
        },
        "Consolidated Excel file info retrieved"
      );
    }
  );

  /**
   * Get Excel generation stats
   * GET /api/pre-market/admin/excel-stats
   * Protected: Admin only
   */
  getExcelStats = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.userId;

    const metadata = await this.preMarketService.getConsolidatedExcel();

    logger.info(
      { adminId, version: metadata.version },
      "Admin viewed Excel stats"
    );

    ApiResponse.success(
      res,
      {
        totalRequests: metadata.totalRequests,
        version: metadata.version,
        lastUpdated: metadata.lastUpdated,
        fileName: metadata.fileName,
        fileSize: "Check S3 for actual size",
        updateFrequency: "On every new request creation",
        storageLocation: "uploads/pre-market/excel/master/",
      },
      "Excel statistics"
    );
  });

  getAllListingsWithAllData = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      logger.info(
        { userId, userRole },
        "User requesting all listings with data"
      );

      const listings = await this.preMarketService.getAllListingsWithAllData();

      logger.info(
        { userId, totalListings: listings.length },
        "All listings retrieved successfully"
      );

      return ApiResponse.success(
        res,
        listings,
        "All pre-market listings retrieved successfully"
      );
    }
  );

  downloadPreMarketListingsExcel = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      logger.info(
        { userId, userRole },
        "User requesting Pre-Market Listings Excel download"
      );

      try {
        // Generate Excel buffer
        const excelBuffer =
          await this.excelService.generatePreMarketListingsWithAgentsExcel();

        // Upload to S3 and get download link
        const { url, fileName } =
          await this.excelService.uploadPreMarketListingsExcel(excelBuffer);

        logger.info(
          { userId, fileName, url },
          "Pre-Market Listings Excel generated and uploaded"
        );

        // Return download link in response
        return ApiResponse.success(
          res,
          {
            downloadUrl: url,
            fileName: fileName,
            generatedAt: new Date().toISOString(),
          },
          "Pre-Market Listings Excel exported successfully"
        );
      } catch (error) {
        logger.error(
          { error, userId },
          "Failed to export Pre-Market Listings Excel"
        );

        throw new Error("Failed to export Pre-Market Listings Excel");
      }
    }
  );
}
