// file: src/modules/pre-market-request/pre-market-request.controller.ts

import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { NextFunction, Request, Response } from "express";
import {
  activateRequestSchema,
  adminFilterRequestsSchema,
  createPreMarketRequestSchema,
  deactivateRequestSchema,
  getPreMarketRequestSchema,
  updatePreMarketRequestSchema,
} from "./pre-market-request.schema";
import { PreMarketRequestService } from "./pre-market-request.service";

/**
 * Pre-Market Request Controller
 * Handles HTTP requests for pre-market requests
 */
export class PreMarketRequestController {
  private service: PreMarketRequestService;

  constructor() {
    this.service = new PreMarketRequestService();
  }

  /**
   * RENTER: Create pre-market request
   * POST /pre-market-request
   */
  createRequest = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(createPreMarketRequestSchema, req);
      const renterId = req.user!.userId;

      const result = await this.service.createPreMarketRequest(
        renterId,
        validated.body
      );

      ApiResponse.created(
        res,
        result,
        "Pre-market request created successfully"
      );
    }
  );

  /**
   * RENTER: Get own requests
   * GET /pre-market-request
   */
  getRenterRequests = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const renterId = req.user!.userId;

      const result = await this.service.getRenterRequests(renterId);

      ApiResponse.success(
        res,
        result,
        "Pre-market requests retrieved successfully"
      );
    }
  );

  /**
   * RENTER: Get single own request
   * GET /pre-market-request/:requestId
   */
  getRenterRequest = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(getPreMarketRequestSchema, req);
      const renterId = req.user!.userId;

      const result = await this.service.getRenterRequest(
        renterId,
        validated.params.requestId
      );

      ApiResponse.success(
        res,
        result,
        "Pre-market request retrieved successfully"
      );
    }
  );

  /**
   * RENTER: Update request name (title only)
   * PATCH /pre-market-request/:requestId
   */
  updateRequestName = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(updatePreMarketRequestSchema, req);
      const { requestId } = req.params;
      const renterId = req.user!.userId;

      const result = await this.service.updateRequestName(
        renterId,
        requestId,
        validated.body
      );

      ApiResponse.success(res, result, "Request name updated successfully");
    }
  );

  /**
   * RENTER: Deactivate request
   * POST /pre-market-request/:requestId/deactivate
   */
  deactivateRequest = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(deactivateRequestSchema, req);
      const renterId = req.user!.userId;

      const result = await this.service.deactivateRequest(
        renterId,
        validated.params.requestId
      );

      ApiResponse.success(res, result, "Request deactivated successfully");
    }
  );

  /**
   * RENTER: Activate request
   * POST /pre-market-request/:requestId/activate
   */
  activateRequest = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(activateRequestSchema, req);
      const renterId = req.user!.userId;

      const result = await this.service.activateRequest(
        renterId,
        validated.params.requestId
      );

      ApiResponse.success(res, result, "Request activated successfully");
    }
  );

  /**
   * AGENT: Get all active requests (filterable)
   * GET /pre-market-request/agent/all
   */
  agentGetRequests = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { location, minBudget, maxBudget } = req.query;

      let result;

      if (location) {
        result = await this.service.getRequestsByLocations([
          location as string,
        ]);
      } else if (minBudget || maxBudget) {
        result = await this.service.getRequestsByBudgetRange(
          parseInt(minBudget as string) || 0,
          parseInt(maxBudget as string) || 999999999
        );
      } else {
        result = await this.service.getActiveRequests(req.user?.userId);
      }

      ApiResponse.success(
        res,
        result,
        "Pre-market requests retrieved successfully"
      );
    }
  );

  /**
   * AGENT: Get single request details
   * GET /pre-market-request/agent/:requestId
   */
  agentGetRequestDetails = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(getPreMarketRequestSchema, req);

      const result = await this.service.getRequestDetails(
        validated.params.requestId
      );

      ApiResponse.success(
        res,
        result,
        "Request details retrieved successfully"
      );
    }
  );

  /**
   * ADMIN: Get all requests with pagination and filters
   * GET /pre-market-request/admin/all
   */
  adminGetRequests = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(adminFilterRequestsSchema, req);
      const {
        page,
        limit,
        location,
        budgetMin,
        budgetMax,
        bedrooms,
        bathrooms,
        isActive,
      } = validated.query;

      const result = await this.service.adminGetRequestsPaginated(page, limit, {
        location: location as string,
        budgetMin: budgetMin as number,
        budgetMax: budgetMax as number,
        bedrooms: bedrooms as string,
        bathrooms: bathrooms as string,
        isActive: isActive === "true",
      });

      ApiResponse.paginated(
        res,
        result.data,
        result.pagination,
        "Pre-market requests retrieved successfully"
      );
    }
  );

  /**
   * ADMIN: Get single request
   * GET /pre-market-request/admin/:requestId
   */
  adminGetRequest = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(getPreMarketRequestSchema, req);

      const result = await this.service.adminGetRequest(
        validated.params.requestId
      );

      ApiResponse.success(res, result, "Request retrieved successfully");
    }
  );

  /**
   * ADMIN: Update request
   * PUT /pre-market-request/admin/:requestId
   */
  adminUpdateRequest = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { requestId } = req.params;

      const result = await this.service.adminUpdateRequest(requestId, req.body);

      ApiResponse.success(res, result, "Request updated successfully");
    }
  );

  /**
   * ADMIN: Deactivate request
   * POST /pre-market-request/admin/:requestId/deactivate
   */
  adminDeactivateRequest = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(deactivateRequestSchema, req);

      const result = await this.service.adminDeactivateRequest(
        validated.params.requestId
      );

      ApiResponse.success(res, result, "Request deactivated successfully");
    }
  );

  /**
   * ADMIN: Delete request
   * DELETE /pre-market-request/admin/:requestId
   */
  adminDeleteRequest = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { requestId } = req.params;

      const result = await this.service.adminDeleteRequest(requestId);

      ApiResponse.success(res, result);
    }
  );
}
