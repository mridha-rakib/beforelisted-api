// file: src/modules/auth/auth.controller.ts

import { MESSAGES } from "@/constants/app.constants";
import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { NextFunction, Request, Response } from "express";
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  verifyOTPSchema,
} from "./auth.schema";
import { AuthService } from "./auth.service";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Register endpoint
   * POST /auth/register
   */
  register = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(registerSchema, req);
      const result = await this.authService.register(validated.body);

      ApiResponse.created(res, result, MESSAGES.AUTH.REGISTER_SUCCESS);
    }
  );

  /**
   * Login endpoint
   * POST /auth/login
   */
  login = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(loginSchema, req);
      const result = await this.authService.login(validated.body);

      ApiResponse.success(res, result, MESSAGES.AUTH.LOGIN_SUCCESS);
    }
  );

  /**
   * Verify email endpoint
   * GET /auth/verify-email?token=xxx
   */
  verifyEmail = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(verifyEmailSchema, req);
      const result = await this.authService.verifyEmail(validated.query.token);

      ApiResponse.success(res, result, MESSAGES.AUTH.EMAIL_VERIFIED_SUCCESS);
    }
  );

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
      const validated = await zParse(refreshTokenSchema, req);
      const result = await this.authService.refreshAccessToken(
        validated.body.refreshToken
      );

      ApiResponse.success(res, result);
    }
  );
}
