// file: src/modules/admin/admin.route.ts

import { ROLES } from "@/constants/app.constants";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { AdminController } from "./admin.controller";

const router = Router();
const controller = new AdminController();

/**
 * ===========================
 * ADMIN ROUTES - ALL PROTECTED
 * ===========================
 */

/**
 * GET /admin/dashboard/metrics
 * Get dashboard overview metrics
 * Protected: Admin only
 */
router.get(
  "/dashboard/metrics",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.getDashboardMetrics
);

/**
 * GET /admin/reports/revenue
 * Get revenue report
 * Protected: Admin only
 */
router.get(
  "/reports/revenue",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.getRevenueReport
);

/**
 * GET /admin/reports/agents
 * Get agent performance report
 * Protected: Admin only
 */
router.get(
  "/reports/agents",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.getAgentPerformanceReport
);

/**
 * POST /admin/reports/generate
 * Generate comprehensive report
 * Protected: Admin only
 */
router.post(
  "/reports/generate",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.generateComprehensiveReport
);

/**
 * GET /admin/analytics/history
 * Get historical analytics
 * Protected: Admin only
 */
router.get(
  "/analytics/history",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.getHistoricalAnalytics
);

/**
 * GET /admin/system/health
 * Get system health status
 * Protected: Admin only
 */
router.get(
  "/system/health",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.getSystemHealth
);

/**
 * DELETE /admin/users/:userId
 * Delete user and all related data
 * Protected: Admin only
 */
router.delete(
  "/users/:userId",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.deleteUser
);

export default router;
