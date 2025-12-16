// file: src/modules/faq/faq.route.ts

import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { FAQController } from "./faq.controller";

const router = Router();
const controller = new FAQController();

// ============================================
// PUBLIC ROUTES (Anyone can view)
// ============================================

/**
 * GET /faq
 * Get all active FAQs
 */
router.get("/", controller.getAllFAQs.bind(controller));

/**
 * GET /faq/:id
 * Get single FAQ by ID
 */
router.get("/:id", controller.getFAQById.bind(controller));

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * GET /faq/admin/all
 * Get all FAQs (including inactive)
 * Protected: Admin only
 */
router.get(
  "/admin/all",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getAllFAQsForAdmin.bind(controller)
);

/**
 * POST /faq/admin
 * Create new FAQ
 * Protected: Admin only
 */
router.post(
  "/admin",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.createFAQ.bind(controller)
);

/**
 * PUT /faq/admin/:id
 * Update FAQ
 * Protected: Admin only
 */
router.put(
  "/admin/:id",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.updateFAQ.bind(controller)
);

/**
 * DELETE /faq/admin/:id
 * Delete FAQ (soft delete)
 * Protected: Admin only
 */
router.delete(
  "/admin/:id",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.deleteFAQ.bind(controller)
);

/**
 * DELETE /faq/admin/:id/hard-delete
 * Permanently delete FAQ (irreversible)
 * Protected: Admin only
 */
router.delete(
  "/admin/:id/hard-delete",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.hardDeleteFAQ.bind(controller)
);

export default router;
