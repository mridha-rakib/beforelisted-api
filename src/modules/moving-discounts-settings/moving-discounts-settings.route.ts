// file: src/modules/moving-discounts-settings/moving-discounts-settings.route.ts

import { Router } from "express";

import { authMiddleware } from "@/middlewares/auth.middleware";

import { MovingDiscountSettingsController } from "./moving-discounts-settings.controller";

const router = Router();
const controller = new MovingDiscountSettingsController();

/**
 * GET /moving-discounts/settings
 * Public. Returns the disclaimer string.
 */
router.get("/", controller.getPublicSettings.bind(controller));

/**
 * GET /moving-discounts/admin/settings
 * Admin-only. Returns the disclaimer string.
 */
router.get(
  "/admin",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getAdminSettings.bind(controller),
);

/**
 * PATCH /moving-discounts/admin/settings
 * Admin-only. Body: { disclaimer: string }
 */
router.patch(
  "/admin",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.updateDisclaimer.bind(controller),
);

export default router;
