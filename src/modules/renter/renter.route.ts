// file: src/modules/renter/renter.route.ts

import { ROLES } from "@/constants/app.constants";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { RenterController } from "./renter.controller";

const router = Router();
const controller = new RenterController();

/**
 * ===========================
 * RENTER ROUTES
 * ===========================
 */

/**
 * GET /renter/profile
 * Get renter profile
 * Protected: Renter only
 */
router.get(
  "/profile",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.RENTER),
  controller.getRenterProfile
);

/**
 * PUT /renter/settings
 * Update notification preferences
 * Protected: Renter only
 */
router.put(
  "/settings",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.RENTER),
  controller.updateNotificationPreferences
);

/**
 * POST /renter/unsubscribe
 * Unsubscribe from email
 * Protected: Renter only
 */
router.post(
  "/unsubscribe",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.RENTER),
  controller.unsubscribeFromEmail
);

/**
 * GET /renter/stats
 * Get renter statistics
 * Protected: Renter only
 */
router.get(
  "/stats",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.RENTER),
  controller.getRenterStats
);

/**
 * ===========================
 * ADMIN ROUTES
 * ===========================
 */

/**
 * GET /renter/admin/all
 * Get all renters
 * Protected: Admin only
 */
router.get(
  "/admin/all",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.adminGetAllRenters
);

/**
 * GET /renter/admin/:userId
 * Get single renter
 * Protected: Admin only
 */
router.get(
  "/admin/:userId",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.adminGetRenter
);

export default router;
