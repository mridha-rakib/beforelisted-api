// file: src/modules/renter/renter.route.ts

import { AuthMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { RenterController } from "./renter.controller";

const router = Router();
const controller = new RenterController();
const authMiddleware = new AuthMiddleware();

// ============================================
// REGISTRATION ROUTES (Public)
// ============================================

/**
 * POST /renter/register
 * Auto-detects registration type: Normal, Agent Referral, Admin Referral
 */
router.post("/register", controller.registerRenter);

/**
 * POST /renter/register/normal
 * Explicit normal registration
 */
router.post("/register/normal", controller.registerNormalRenter);

/**
 * POST /renter/register/agent-referral
 * Explicit agent referral registration
 */
router.post("/register/agent-referral", controller.registerAgentReferralRenter);

/**
 * POST /renter/register/admin-referral
 * Explicit admin referral registration (passwordless)
 */
router.post("/register/admin-referral", controller.registerAdminReferralRenter);

// ============================================
// PROFILE ROUTES (Authenticated)
// ============================================

/**
 * GET /renter/profile
 * Get authenticated renter's profile
 */
router.get("/profile", controller.getRenterProfile);

/**
 * PUT /renter/profile
 * Update authenticated renter's profile
 */
router.put(
  "/profile",

  controller.updateRenterProfile
);

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * GET /renter/admin/:userId
 * Admin: Get renter profile by ID
 */
router.get(
  "/admin/:userId",

  controller.adminGetRenterProfile
);

export default router;
