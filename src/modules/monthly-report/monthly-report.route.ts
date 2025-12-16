// file: src/modules/monthly-report/monthly-report.route.ts

import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { MonthlyReportController } from "./monthly-report.controller";

const router = Router();
const controller = new MonthlyReportController();

// ============================================
// PUBLIC ROUTES (Anyone can view)
// ============================================

/**
 * GET /monthly-report
 * Get all active reports
 */
router.get("/", controller.getAllPublicReports.bind(controller));

/**
 * GET /monthly-report/:id
 * Get single report by ID
 */
router.get("/:id", controller.getReportById.bind(controller));

/**
 * GET /monthly-report/year/:year
 * Get reports by year
 */
router.get("/year/:year", controller.getReportsByYear.bind(controller));

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * GET /monthly-report/admin/all
 * Get all reports (including inactive)
 * Protected: Admin only
 */
router.get(
  "/admin/all",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getAllReports.bind(controller)
);

/**
 * POST /monthly-report/admin
 * Create new report
 * Protected: Admin only
 */
router.post(
  "/admin",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.createReport.bind(controller)
);

/**
 * PUT /monthly-report/admin/:id
 * Update report
 * Protected: Admin only
 */
router.put(
  "/admin/:id",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.updateReport.bind(controller)
);

/**
 * DELETE /monthly-report/admin/:id
 * Delete report (soft delete)
 * Protected: Admin only
 */
router.delete(
  "/admin/:id",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.deleteReport.bind(controller)
);

/**
 * DELETE /monthly-report/admin/:id/hard-delete
 * Hard delete report (permanent)
 * Protected: Admin only
 */
router.delete(
  "/admin/:id/hard-delete",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.hardDeleteReport.bind(controller)
);

export default router;
