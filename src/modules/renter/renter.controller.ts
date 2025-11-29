// file: src/modules/renter/renter.controller.ts

import { COOKIE_CONFIG } from "@/config/cookie.config";
import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { NextFunction, Request, Response } from "express";
import {
  adminReferralRenterRegisterSchema,
  agentReferralRenterRegisterSchema,
  getRenterProfileSchema,
  normalRenterRegisterSchema,
  renterRegisterSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  updateRenterProfileSchema,
  verifyOTPSchema,
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

  // ============================================
  // PASSWORD MANAGEMENT ENDPOINTS
  // ============================================

  /**
   * PUBLIC: Request password reset (forgot password)
   * POST /renter/forgot-password
   */
  requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(requestPasswordResetSchema, req);
    const result = await this.service.requestPasswordReset(
      validated.body.email
    );

    ApiResponse.success(
      res,
      result,
      "If account exists, password reset code will be sent"
    );
  });

  /**
   * PUBLIC: Verify password reset OTP
   * POST /renter/verify-reset-otp
   */
  verifyOTP = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(verifyOTPSchema, req);
    const result = await this.service.verifyOTP(
      validated.body.email,
      validated.body.otp
    );

    ApiResponse.success(res, result, "OTP verified successfully");
  });

  /**
   * PUBLIC: Reset password with OTP
   * POST /renter/reset-password
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(resetPasswordSchema, req);
    const result = await this.service.resetPassword(validated.body);

    ApiResponse.success(res, result, "Password reset successfully");
  });

  // ============================================
  // PROFILE ENDPOINTS
  // ============================================

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
}
