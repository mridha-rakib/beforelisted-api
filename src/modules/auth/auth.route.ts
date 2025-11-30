// file: src/modules/auth/auth.route.ts

import { Router } from "express";
import { PasswordResetController } from "../password/password.controller";
import passwordResetRoutes from "../password/password.route";
import { AuthController } from "./auth.controller";

const router = Router();
const authController = new AuthController();
const passwordResetController = new PasswordResetController();

/**
 * POST /auth/login
 * Login user (all roles)
 */
router.post("/login", authController.login);

/**
 * POST /auth/verify-email
 * Verify email with token
 */
router.post("/verify-email", authController.verifyEmail);

/**
 * POST /auth/resend-verification
 * Resend verification code
 */
router.post("/resend-verification", authController.resendVerificationCode);

/**
 * POST /auth/verify-otp
 * Verify OTP code
 */
router.post("/verify-otp", authController.verifyOTP);

/**
 * POST /auth/refresh-token
 * Refresh access token
 */
router.post("/refresh-token", authController.refreshToken);

/**
 * user forget password
 */
router.use("/", passwordResetRoutes);

/**
 * PUT /auth/change-password
 * change current user password
 */
router.put(
  "/change-password", // ← Required for all roles
  authController.changePassword
);

router.post("/logout", authController.logout);

export default router;
