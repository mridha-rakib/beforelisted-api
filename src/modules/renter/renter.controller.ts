// file: src/modules/renter/renter.controller.ts

import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { NextFunction, Request, Response } from "express";
import {
  getRenterProfileSchema,
  renterRegisterSchema,
  updateNotificationPreferencesSchema,
} from "./renter.schema";
import { RenterService } from "./renter.service";

/**
 * Renter Controller
 * Handles HTTP requests for renter profiles
 */
export class RenterController {
  private service: RenterService;

  constructor() {
    this.service = new RenterService();
  }

  // ============================================
  // PUBLIC ROUTES
  // ============================================

  /**
   * PUBLIC: Register as renter (complete registration)
   * POST /renter/register
   */
  registerRenter = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(renterRegisterSchema, req);

      const result = await this.service.registerRenter(validated.body);

      ApiResponse.created(res, result, "Renter registered successfully");
    }
  );

  // ============================================
  // PROTECTED RENTER ROUTES
  // ============================================

  /**
   * RENTER: Get own profile
   * GET /renter/profile
   */
  getRenterProfile = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user!.userId;

      const result = await this.service.getRenterProfile(userId);

      ApiResponse.success(res, result, "Renter profile retrieved successfully");
    }
  );

  /**
   * RENTER: Update notification preferences
   * PUT /renter/settings
   */
  updateNotificationPreferences = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(updateNotificationPreferencesSchema, req);
      const userId = req.user!.userId;

      const result = await this.service.updateNotificationPreferences(
        userId,
        validated.body
      );

      ApiResponse.success(
        res,
        result,
        "Notification preferences updated successfully"
      );
    }
  );

  /**
   * RENTER: Acknowledge auto-generated password
   * POST /renter/acknowledge-password
   */
  acknowledgeAutoPassword = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user!.userId;

      const result = await this.service.acknowledgeAutoPassword(userId);

      ApiResponse.success(res, result, "Auto-generated password acknowledged");
    }
  );

  /**
   * RENTER: Unsubscribe from email
   * POST /renter/unsubscribe
   */
  unsubscribeFromEmail = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user!.userId;

      const result = await this.service.unsubscribeFromEmail(userId);

      ApiResponse.success(
        res,
        result,
        "Unsubscribed from email notifications successfully"
      );
    }
  );

  /**
   * RENTER: Get own statistics
   * GET /renter/stats
   */
  getRenterStats = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user!.userId;

      const result = await this.service.getRenterStats(userId);

      ApiResponse.success(
        res,
        result,
        "Renter statistics retrieved successfully"
      );
    }
  );

  // ============================================
  // ADMIN ROUTES
  // ============================================

  /**
   * ADMIN: Get all renters
   * GET /renter/admin/all
   */
  adminGetAllRenters = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const result = await this.service.adminGetAllRenters();

      ApiResponse.success(res, result, "Renters retrieved successfully");
    }
  );

  /**
   * ADMIN: Get single renter
   * GET /renter/admin/:userId
   */
  adminGetRenter = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(getRenterProfileSchema, req);

      const result = await this.service.adminGetRenter(
        validated.params.userId!
      );

      ApiResponse.success(res, result, "Renter retrieved successfully");
    }
  );
}
