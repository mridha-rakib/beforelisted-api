// file: src/modules/request-match/request-match.controller.ts

import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { NextFunction, Request, Response } from "express";
import {
  adminApproveRejectMatchSchema,
  adminGrantFreeAccessSchema,
  adminSetGrantAccessAmountSchema,
  agentRequestGrantAccessSchema,
  createRequestMatchSchema,
  getMatchSchema,
  getMatchesForRequestSchema,
  processStripePaymentSchema,
} from "./request-match.schema";
import { RequestMatchService } from "./request-match.service";

/**
 * Request Match Controller
 * Handles HTTP requests for request matches
 */
export class RequestMatchController {
  private service: RequestMatchService;

  constructor() {
    this.service = new RequestMatchService();
  }

  /**
   * AGENT: Create request match (click "Request Match")
   * POST /request-match
   */
  createMatch = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(createRequestMatchSchema, req);
      const agentId = req.user!.userId;

      const result = await this.service.createRequestMatch(
        agentId,
        validated.body
      );

      ApiResponse.created(res, result, "Request match created successfully");
    }
  );

  /**
   * AGENT: Get own match requests
   * GET /request-match
   */
  getAgentMatches = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const agentId = req.user!.userId;

      const result = await this.service.getAgentMatches(agentId);

      ApiResponse.success(
        res,
        result,
        "Request matches retrieved successfully"
      );
    }
  );

  /**
   * AGENT: Get single match details
   * GET /request-match/:matchId
   */
  getMatchDetails = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(getMatchSchema, req);
      const agentId = req.user!.userId;

      const result = await this.service.getMatchDetails(
        agentId,
        validated.params.matchId
      );

      ApiResponse.success(res, result, "Match details retrieved successfully");
    }
  );

  /**
   * AGENT: Request grant access
   * POST /request-match/:matchId/request-grant-access
   */
  requestGrantAccess = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(agentRequestGrantAccessSchema, req);
      const agentId = req.user!.userId;

      const result = await this.service.requestGrantAccess(
        agentId,
        validated.params.matchId
      );

      ApiResponse.success(res, result, "Grant access requested successfully");
    }
  );

  /**
   * AGENT: Process Stripe payment
   * POST /request-match/:matchId/process-payment
   */
  processPayment = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(processStripePaymentSchema, req);
      const agentId = req.user!.userId;

      const result = await this.service.processStripePayment(
        agentId,
        validated.params.matchId,
        validated.body.stripePaymentMethodId
      );

      ApiResponse.success(res, result, "Payment processed successfully");
    }
  );

  /**
   * ADMIN: Get all request matches
   * GET /request-match/admin/all
   */
  adminGetAllMatches = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const result = await this.service.adminGetAllMatches();

      ApiResponse.success(
        res,
        result,
        "Request matches retrieved successfully"
      );
    }
  );

  /**
   * ADMIN: Get matches for specific pre-market request
   * GET /request-match/admin/pre-market-request/:preMarketRequestId
   */
  adminGetMatchesForRequest = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(getMatchesForRequestSchema, req);

      const result = await this.service.adminGetMatchesForRequest(
        validated.params.preMarketRequestId
      );

      ApiResponse.success(
        res,
        result,
        "Request matches for pre-market request retrieved successfully"
      );
    }
  );

  /**
   * ADMIN: Get pending matches for pre-market request
   * GET /request-match/admin/pre-market-request/:preMarketRequestId/pending
   */
  adminGetPendingMatchesForRequest = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(getMatchesForRequestSchema, req);

      const result = await this.service.adminGetPendingMatchesForRequest(
        validated.params.preMarketRequestId
      );

      ApiResponse.success(
        res,
        result,
        "Pending matches retrieved successfully"
      );
    }
  );

  /**
   * ADMIN: Approve or reject match
   * POST /request-match/admin/:matchId/status
   */
  adminUpdateMatchStatus = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(adminApproveRejectMatchSchema, req);

      const result = await this.service.adminUpdateMatchStatus(
        validated.params.matchId,
        validated.body
      );

      ApiResponse.success(res, result, "Match status updated successfully");
    }
  );

  /**
   * ADMIN: Set grant access amount
   * POST /request-match/admin/:matchId/set-grant-access-amount
   */
  adminSetGrantAccessAmount = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(adminSetGrantAccessAmountSchema, req);

      const result = await this.service.adminSetGrantAccessAmount(
        validated.params.matchId,
        validated.body
      );

      ApiResponse.success(res, result, "Grant access amount set successfully");
    }
  );

  /**
   * ADMIN: Grant free access
   * POST /request-match/admin/:matchId/grant-free-access
   */
  adminGrantFreeAccess = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(adminGrantFreeAccessSchema, req);

      const result = await this.service.adminGrantFreeAccess(
        validated.params.matchId
      );

      ApiResponse.success(res, result, "Free access granted successfully");
    }
  );

  /**
   * ADMIN: Reject match
   * POST /request-match/admin/:matchId/reject
   */
  adminRejectMatch = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { matchId } = req.params;
      const { adminNotes } = req.body;

      const result = await this.service.adminRejectMatch(matchId, adminNotes);

      ApiResponse.success(res, result, "Match rejected successfully");
    }
  );

  /**
   * Get grant access status
   * GET /request-match/:matchId/grant-access-status
   */
  getGrantAccessStatus = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(getMatchSchema, req);

      const result = await this.service.getGrantAccessStatus(
        validated.params.matchId
      );

      ApiResponse.success(
        res,
        result,
        "Grant access status retrieved successfully"
      );
    }
  );
}
