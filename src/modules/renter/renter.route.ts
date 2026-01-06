// file: src/modules/renter/renter.route.ts

import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { RenterController } from "./renter.controller";

const router = Router();
const controller = new RenterController();

router.post("/register", controller.registerRenter);

router.post("/register/normal", controller.registerNormalRenter);

router.post("/register/agent-referral", controller.registerAgentReferralRenter);

router.post("/register/admin-referral", controller.registerAdminReferralRenter);

router.get(
  "/profile",
  authMiddleware.verifyToken,
  authMiddleware.verifyEmailVerified,
  authMiddleware.authorize("Renter"),
  controller.getRenterProfile
);

router.put(
  "/profile",
  authMiddleware.verifyToken,
  authMiddleware.verifyEmailVerified,
  authMiddleware.authorize("Renter"),
  controller.updateRenterProfile
);

/**
 * DELETE /renter/profile
 * Delete own renter profile
 */
router.delete(
  "/profile",
  authMiddleware.verifyToken,
  authMiddleware.verifyEmailVerified,
  authMiddleware.authorize("Renter"),
  controller.deleteRenterProfile
);

/**
 * POST /renter/email-subscription/toggle
 * Toggle email subscription ON/OFF
 */
router.post(
  "/email-subscription/toggle",
  authMiddleware.verifyToken,
  authMiddleware.verifyEmailVerified,
  authMiddleware.authorize("Renter"),
  controller.toggleEmailSubscription
);

router.get(
  "/admin/excel-download",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.downloadRentersConsolidatedExcel
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
