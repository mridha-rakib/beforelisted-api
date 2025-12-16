// file: src/modules/renter/renter.route.ts

import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { RenterController } from "./renter.controller";

const router = Router();
const controller = new RenterController();

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
router.get(
  "/profile",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Renter"),
  controller.getRenterProfile
);

/**
 * PUT /renter/profile
 * Update authenticated renter's profile
 */
router.put(
  "/profile",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Renter"),
  controller.updateRenterProfile
);

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * GET /admin/renters
 * Get all renters with pagination and optional filtering
 * Query params: page, limit, accountStatus
 * Protected: Admins only
 */
router.get(
  "/admin/renters",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getAllRenters.bind(controller)
);

/**
 * GET /admin/renters/:renterId
 * Get detailed renter profile with referral info and listings
 * Protected: Admins only
 */
router.get(
  "/admin/renters/:renterId",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getRenterDetailsForAdmin.bind(controller)
);

/**
 * GET /admin/:userId
 * Existing admin route - Get renter profile by ID
 * Protected: Admins only
 */
router.get(
  "/admin/:userId",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.adminGetRenterProfile.bind(controller)
);


export default router;
