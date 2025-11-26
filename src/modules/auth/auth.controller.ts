// file: src/modules/auth/auth.controller.ts

import { COOKIE_CONFIG } from "@/config/cookie.config";
import { MESSAGES } from "@/constants/app.constants";
import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { NextFunction, Request, Response } from "express";
import {
  loginSchema,
  requestPasswordResetSchema,
  resendVerificationCodeSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  verifyOTPSchema,
} from "./auth.schema";
import { AuthService } from "./auth.service";
import { AuthControllerResponse } from "./auth.type";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // ============================================
  // REMOVED: register endpoint
  // ============================================
  // Use instead:
  // - POST /agent/register
  // - POST /renter/register

  /**
   * Login endpoint
   * POST /auth/login
   */
  login = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(loginSchema, req);
      const result = await this.authService.login(validated.body);

      res.cookie(
        COOKIE_CONFIG.REFRESH_TOKEN.name,
        result.tokens.refreshToken,
        COOKIE_CONFIG.REFRESH_TOKEN.options
      );

      const response: AuthControllerResponse = {
        user: result.user,
        accessToken: result.tokens.accessToken,
        expiresIn: result.tokens.expiresIn,
        mustChangePassword: result.mustChangePassword,
      };

      ApiResponse.success(res, response, MESSAGES.AUTH.LOGIN_SUCCESS);
    }
  );

  /**
   * Verify email with code
   * POST /auth/verify-email
   * ✅ UPDATED: Use code in body instead of token in query
   */
  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(verifyEmailSchema, req);
    const result = await this.authService.verifyEmail(
      validated.body.email,
      validated.body.code
    );

    ApiResponse.success(res, result, MESSAGES.AUTH.EMAIL_VERIFIED_SUCCESS);
  });

  /**
   * Resend verification code
   * POST /auth/resend-verification
   * ✅ UPDATED: Name change for clarity
   */
  resendVerificationCode = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(resendVerificationCodeSchema, req);

    const result = await this.authService.resendVerificationCode({
      email: validated.body.email,
    });

    ApiResponse.success(res, result, MESSAGES.AUTH.VERIFICATION_CODE_SENT);
  });

  /**
   * Request password reset
   * POST /auth/request-password-reset
   */
  requestPasswordReset = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(requestPasswordResetSchema, req);
      const result = await this.authService.requestPasswordReset(
        validated.body.email
      );

      ApiResponse.success(res, result, MESSAGES.AUTH.PASSWORD_RESET_OTP_SENT);
    }
  );

  /**
   * Verify OTP
   * POST /auth/verify-otp
   */
  verifyOTP = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(verifyOTPSchema, req);
      const result = await this.authService.verifyOTP(
        validated.body.email,
        validated.body.otp
      );

      ApiResponse.success(res, result);
    }
  );

  /**
   * Reset password
   * POST /auth/reset-password
   */
  resetPassword = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(resetPasswordSchema, req);
      const result = await this.authService.resetPassword(
        validated.body.email,
        validated.body.otp,
        validated.body.newPassword
      );

      ApiResponse.success(res, result);
    }
  );

  /**
   * Refresh token
   * POST /auth/refresh-token
   */
  refreshToken = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const refreshToken = req.cookies[COOKIE_CONFIG.REFRESH_TOKEN.name];
      if (!refreshToken) {
        throw new Error("Refresh token not found");
      }

      const result = await this.authService.refreshAccessToken(refreshToken);

      ApiResponse.success(res, result);
    }
  );

  // ============================================
  // LOGOUT (UPDATED - Clear Cookie)
  // ============================================

  /**
   * Logout endpoint
   * POST /auth/logout
   * ✅ Clear refresh token cookie
   */

  logout = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user!.userId;
      const token = req.headers.authorization?.replace("Bearer ", "") || "";

      const result = await this.authService.logout(token, userId);

      // ✅ NEW: Clear refresh token cookie
      res.clearCookie(COOKIE_CONFIG.REFRESH_TOKEN.name, {
        httpOnly: true,
        secure: COOKIE_CONFIG.REFRESH_TOKEN.options.secure,
        sameSite: COOKIE_CONFIG.REFRESH_TOKEN.options.sameSite,
        path: "/",
      });

      ApiResponse.success(res, result, MESSAGES.AUTH.LOGOUT_SUCCESS);
    }
  );
}
