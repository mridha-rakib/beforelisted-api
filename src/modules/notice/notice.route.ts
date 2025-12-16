// file: src/modules/notice/notice.route.ts

import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { NoticeController } from "./notice.controller";

const router = Router();
const controller = new NoticeController();


router.get("/", controller.getNotice.bind(controller));


/**
 * GET /notice/admin
 * Admin views the notice (including inactive)
 * Protected: Admin only
 */
router.get(
  "/admin",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getNoticeForAdmin.bind(controller)
);

/**
 * PUT /notice/admin
 * Update notice
 * Protected: Admin only
 */
router.put(
  "/admin",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.updateNotice.bind(controller)
);

/**
 * PUT /notice/admin/toggle
 * Toggle notice active status
 * Protected: Admin only
 */
router.put(
  "/admin/toggle",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.toggleNoticeStatus.bind(controller)
);

export default router;
