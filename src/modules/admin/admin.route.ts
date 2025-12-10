// file: src/modules/admin/routes/admin-pre-market.route.ts

import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { AdminPreMarketController } from "../controllers/admin-pre-market.controller";

const router = Router();
const controller = new AdminPreMarketController();

/**
 * ============================================
 * ADMIN PRE-MARKET LIST ROUTES
 * ============================================
 */

/**
 * GET /admin/pre-market/list
 * Get all pre-market requests with filters and pagination
 * Protected: Admins only
 *
 * Query Parameters:
 *   page=1&limit=10&borough=Manhattan&minPrice=2000&maxPrice=5000
 *   &bedrooms=1BR,2BR&bathrooms=1,2&status=active
 */
router.get(
  "/list",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getAllPreMarketRequests.bind(controller)
);

/**
 * GET /admin/pre-market/:requestId
 * Get complete pre-market request details for admin
 *
 * Includes:
 * - Renter info (name, email, phone, registration type, email verification, account status)
 * - Referral info (if referred by agent/admin)
 * - Complete request details (location, price, bedrooms, bathrooms, features, pet policy, guarantor, moving dates)
 * - Payment info (charge amount, payment status, payment date)
 * - Agent requests stats (total, approved, pending, rejected)
 *
 * Protected: Admins only
 */
router.get(
  "/:requestId",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getPreMarketRequestDetail.bind(controller)
);

/**
 * GET /admin/pre-market/statistics
 * Get summary statistics for admin dashboard
 *
 * Returns:
 * - Total requests, active, archived
 * - Total agents requesting
 * - Payment pending/succeeded counts
 *
 * Protected: Admins only
 */
router.get(
  "/statistics",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getSummaryStatistics.bind(controller)
);

export default router;
