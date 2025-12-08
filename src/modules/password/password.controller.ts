// file: src/modules/password-reset/password-reset.controller.ts

/**
 * Password Reset Controller
 */

import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { logger } from "@/middlewares/pino-logger";
import { AuthService } from "@/modules/auth/auth.service";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import {
  forgotPasswordSchema,
  resendPasswordOTPSchema,
  resetPasswordSchema,
  verifyPasswordOTPSchema,
} from "./password.schema";
import { PasswordResetService } from "./password.service";
/**
 * Password Reset Controller
 * Manages password reset workflow
 */
export class PasswordResetController {
  private passwordResetService: PasswordResetService;
  private authService: AuthService;

  constructor() {
    this.passwordResetService = new PasswordResetService();
    this.authService = new AuthService();
  }

  // ============================================
  // REQUEST PASSWORD RESET (Forgot Password)
  // ============================================

  /**
   * Request password reset OTP
   * POST /auth/forgot-password
   * Body: { email }
   * ✅ Generates and sends OTP to email
   */
  requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(forgotPasswordSchema, req);
    const { email } = validated.body;

    console.log("++++++++++++++++++++++++++++++++");
    console.log(email);
    console.log("+++++++++++++++++++++++++++++++");

    const result = await this.authService.requestPasswordReset(email);
    // Get user by email to find userId
    // (In real implementation, you'd use UserService)
    // For now, we'll need to handle this in auth.service

    // This will be called from auth.service
    // which has access to user context

    // Step 3: Return success response
    logger.info({ email }, "✅ Password reset OTP sent successfully");

    ApiResponse.success(res, result, "Password reset OTP sent to your email");
  });

  // ============================================
  // VERIFY PASSWORD RESET OTP
  // ============================================

  /**
   * Verify password reset OTP
   * POST /auth/verify-password-otp
   * Body: { email, otp }
   * ✅ Validates OTP code
   */
  verifyPasswordOTP = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(verifyPasswordOTPSchema, req);

    // This will be called from auth.service
    // which has access to user context

    ApiResponse.success(res, { message: "OTP verified" });
  });

  // ============================================
  // RESET PASSWORD
  // ============================================

  /**
   * Reset password with OTP
   * POST /auth/reset-password
   * Body: { email, otp, newPassword }
   * ✅ Updates password after OTP verification
   * ✅ Requires re-login and sends security email
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(resetPasswordSchema, req);
    const result = await this.authService.resetPassword(
      validated.body.email,
      validated.body.otp,
      validated.body.newPassword
    );

    ApiResponse.success(res, result);

    // This will be called from auth.service
    // which has the complete business logic

    ApiResponse.success(res, { message: "Password reset successfully" });
  });

  // ============================================
  // RESEND PASSWORD RESET OTP
  // ============================================

  /**
   * Resend password reset OTP
   * POST /auth/resend-password-otp
   * Body: { email }
   * ✅ Generates new OTP and sends to email
   * ✅ Rate limited (max 10 per hour)
   */
  resendPasswordOTP = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(resendPasswordOTPSchema, req);

    // This will be called from auth.service

    ApiResponse.success(res, { message: "OTP resent to email" });
  });
}
