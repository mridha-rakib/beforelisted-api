// file: src/modules/auth/auth.route.ts

import { Router } from "express";
import { AuthController } from "./auth.controller";

const router = Router();
const authController = new AuthController();

// ============================================
// REMOVED: POST /auth/register
// ============================================
// Use instead:
// - POST /agent/register (for agents)
// - POST /renter/register (for renters)

/**
 * POST /auth/login
 * Login user (all roles)
 */
router.post("/login", authController.login);

/**
 * GET /auth/verify-email
 * Verify email with token
 */
router.get("/verify-email", authController.verifyEmail);

/**
 * POST /auth/resend-verification
 * Resend verification code (UPDATED)
 */
router.post("/resend-verification", authController.resendVerificationCode);

/**
 * POST /auth/request-password-reset
 * Request OTP for password reset
 */
router.post("/request-password-reset", authController.requestPasswordReset);

/**
 * POST /auth/verify-otp
 * Verify OTP code
 */
router.post("/verify-otp", authController.verifyOTP);

/**
 * POST /auth/reset-password
 * Reset password with OTP
 */
router.post("/reset-password", authController.resetPassword);

/**
 * POST /auth/refresh-token
 * Refresh access token
 */
router.post("/refresh-token", authController.refreshToken);

export default router;
