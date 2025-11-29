// file: src/modules/renter/renter.route.ts

import { AuthMiddleware } from "@/middlewares/auth.middleware";
import type { Router } from "express";
import { RenterController } from "./renter.controller";

/**
 * Renter Routes
 * ✅ Authentication routes (public + protected)
 * ✅ Profile management routes (authenticated)
 */
export class RenterRoute {
  private controller: RenterController;
  private authMiddleware: AuthMiddleware;

  constructor() {
    this.controller = new RenterController();
    this.authMiddleware = new AuthMiddleware();
  }

  /**
   * Setup all renter routes
   */
  public setupRoutes(router: Router): void {
    // ============================================
    // REGISTRATION ROUTES (Public)
    // ============================================

    /**
     * POST /renter/register
     * Auto-detects registration type: Normal, Agent Referral, Admin Referral
     */
    router.post("/renter/register", this.controller.registerRenter);

    /**
     * POST /renter/register/normal
     * Explicit normal registration
     */
    router.post(
      "/renter/register/normal",
      this.controller.registerNormalRenter
    );

    /**
     * POST /renter/register/agent-referral
     * Explicit agent referral registration
     */
    router.post(
      "/renter/register/agent-referral",
      this.controller.registerAgentReferralRenter
    );

    /**
     * POST /renter/register/admin-referral
     * Explicit admin referral registration (passwordless)
     */
    router.post(
      "/renter/register/admin-referral",
      this.controller.registerAdminReferralRenter
    );

    // ============================================
    // EMAIL VERIFICATION ROUTES (Public)
    // ============================================

    /**
     * POST /renter/verify-email
     * Verify email with OTP code
     */
    router.post("/renter/verify-email", this.controller.verifyEmail);

    /**
     * POST /renter/resend-verification-code
     * Resend verification code
     */
    router.post(
      "/renter/resend-verification-code",
      this.controller.resendVerificationCode
    );

    // ============================================
    // PASSWORD MANAGEMENT ROUTES (Public)
    // ============================================

    /**
     * POST /renter/forgot-password
     * Request password reset
     */
    router.post(
      "/renter/forgot-password",
      this.controller.requestPasswordReset
    );

    /**
     * POST /renter/verify-reset-otp
     * Verify password reset OTP
     */
    router.post("/renter/verify-reset-otp", this.controller.verifyOTP);

    /**
     * POST /renter/reset-password
     * Reset password with OTP and new password
     */
    router.post("/renter/reset-password", this.controller.resetPassword);

    // ============================================
    // PROFILE ROUTES (Authenticated)
    // ============================================

    /**
     * GET /renter/profile
     * Get authenticated renter's profile
     */
    router.get(
      "/renter/profile",
      this.authMiddleware.verifyToken,
      this.controller.getRenterProfile
    );

    /**
     * PUT /renter/profile
     * Update authenticated renter's profile
     */
    router.put(
      "/renter/profile",
      this.authMiddleware.verifyToken,
      this.controller.updateRenterProfile
    );

    // ============================================
    // ADMIN ROUTES
    // ============================================

    /**
     * GET /renter/admin/:userId
     * Admin: Get renter profile by ID
     */
    router.get(
      "/renter/admin/:userId",
      this.authMiddleware.verifyToken,
      this.authMiddleware.authorize(["admin"]),
      this.controller.adminGetRenterProfile
    );
  }
}
