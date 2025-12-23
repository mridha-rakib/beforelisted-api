// file: src/modules/renter/renter.controller.ts

import { COOKIE_CONFIG } from "@/config/cookie.config";
import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { logger } from "@/middlewares/pino-logger";
import { BadRequestException } from "@/utils/app-error.utils";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { NextFunction, Request, Response } from "express";
import {
  adminReferralRenterRegisterSchema,
  agentReferralRenterRegisterSchema,
  getRenterProfileSchema,
  normalRenterRegisterSchema,
  renterListSchema,
  renterRegisterSchema,
  updateRenterProfileSchema,
} from "./renter.schema";
import { RenterService } from "./renter.service";

/**
 * Renter Controller
 * ✅ Handles HTTP requests for renter authentication and profile
 * ✅ Supports three registration flows
 */
export class RenterController {
  private service: RenterService;

  constructor() {
    this.service = new RenterService();
  }

  // ============================================
  // REGISTRATION ENDPOINTS
  // ============================================

  /**
   * PUBLIC: Register as Renter (All Types)
   * POST /renter/register
   * ✅ Auto-detects: Normal, Agent Referral, or Admin Referral
   */
  registerRenter = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(renterRegisterSchema, req);
      const result = await this.service.registerRenter(validated.body);

      // Set refresh token in httpOnly cookie
      res.cookie(
        COOKIE_CONFIG.REFRESH_TOKEN.name,
        result.tokens.refreshToken,
        COOKIE_CONFIG.REFRESH_TOKEN.options
      );

      ApiResponse.created(res, result, "Renter registered successfully");
    }
  );

  /**
   * PUBLIC: Register as Normal Renter (Explicit)
   * POST /renter/register/normal
   */
  registerNormalRenter = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(normalRenterRegisterSchema, req);
    const result = await this.service.registerRenter(validated.body);

    res.cookie(
      COOKIE_CONFIG.REFRESH_TOKEN.name,
      result.tokens.refreshToken,
      COOKIE_CONFIG.REFRESH_TOKEN.options
    );

    ApiResponse.created(res, result, "Normal renter registered successfully");
  });

  /**
   * PUBLIC: Register with Agent Referral (Explicit)
   * POST /renter/register/agent-referral
   */
  registerAgentReferralRenter = asyncHandler(
    async (req: Request, res: Response) => {
      const validated = await zParse(agentReferralRenterRegisterSchema, req);
      const result = await this.service.registerRenter(validated.body);

      res.cookie(
        COOKIE_CONFIG.REFRESH_TOKEN.name,
        result.tokens.refreshToken,
        COOKIE_CONFIG.REFRESH_TOKEN.options
      );

      ApiResponse.created(res, result, "Renter registered via agent referral");
    }
  );

  /**
   * PUBLIC: Register with Admin Referral (Passwordless)
   * POST /renter/register/admin-referral
   */
  registerAdminReferralRenter = asyncHandler(
    async (req: Request, res: Response) => {
      const validated = await zParse(adminReferralRenterRegisterSchema, req);
      const result = await this.service.registerRenter(validated.body);

      res.cookie(
        COOKIE_CONFIG.REFRESH_TOKEN.name,
        result.tokens.refreshToken,
        COOKIE_CONFIG.REFRESH_TOKEN.options
      );

      ApiResponse.created(
        res,
        {
          ...result,
          message:
            "Password has been sent to your email. Please change it on first login.",
        },
        "Renter registered via admin referral (passwordless)"
      );
    }
  );

  /**
   * AUTHENTICATED: Get renter profile
   * GET /renter/profile
   */
  getRenterProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const result = await this.service.getRenterProfile(userId);

    ApiResponse.success(res, result, "Renter profile retrieved successfully");
  });

  /**
   * AUTHENTICATED: Update renter profile
   * PUT /renter/profile
   */
  updateRenterProfile = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateRenterProfileSchema, req);
    const userId = req.user!.userId;
    const result = await this.service.updateRenterProfile(
      userId,
      validated.body
    );

    ApiResponse.success(res, result, "Renter profile updated successfully");
  });

  /**
   * ADMIN: Get renter profile by ID
   * GET /renter/admin/:userId
   */
  adminGetRenterProfile = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(getRenterProfileSchema, req);
    const result = await this.service.getRenterProfile(validated.params.userId);

    ApiResponse.success(res, result, "Renter profile retrieved successfully");
  });

  /**
   * ADMIN: Get all renters (paginated, filterable)
   * GET /admin/renters?page=1&limit=10&accountStatus=active
   * Protected: Admins only
   */
  getAllRenters = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(renterListSchema, req);
    const { accountStatus } = validated.query;

    const result = await this.service.getAllRenters(
      validated.query,
      accountStatus
    );

    ApiResponse.paginated(
      res,
      result.data,
      result.pagination,
      "Renters retrieved successfully"
    );
  });

  /**
   * ADMIN: Get renter details with referral info and listings
   * GET /admin/renters/:renterId
   * Protected: Admins only
   *
   * Response includes:
   * - Basic renter info
   * - Referral information (who referred this renter)
   * - All pre-market listings (active + deactivated)
   */
  getRenterDetailsForAdmin = asyncHandler(
    async (req: Request, res: Response) => {
      const { renterId } = req.params;

      if (!renterId || renterId.length !== 24) {
        throw new BadRequestException("Invalid renter ID format");
      }

      const renter = await this.service.getRenterDetailsForAdmin(renterId);

      logger.info({ renterId }, "Admin viewed renter details");

      ApiResponse.success(res, renter, "Renter details retrieved successfully");
    }
  );

  downloadRentersConsolidatedExcel = asyncHandler(
    async (req: Request, res: Response) => {
      const adminId = req.user!.userId;
      const metadata = await this.service.getRentersConsolidatedExcel();

      ApiResponse.success(
        res,
        {
          fileName: metadata.fileName,
          fileUrl: metadata.fileUrl,
          totalAgents: metadata.totalAgents,
          version: metadata.version,
          lastUpdated: metadata.lastUpdated,
          downloadUrl: metadata.fileUrl,
        },
        "Consolidated Renter Excel file info retrieved"
      );
    }
  );
}
