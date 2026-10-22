// file: src/modules/support/support.route.ts

import { Router } from "express";

import { apiLimiter } from "@/middlewares/rate-limit.middleware";

import { SupportController } from "./support.controller";

const router = Router();
const controller = new SupportController();

// ============================================
// PUBLIC ROUTE
// ============================================

/**
 * POST /support/contact
 * Send a message to admin (public)
 */
router.post(
  "/contact",
  apiLimiter,
  controller.sendContactMessage.bind(controller),
);

export default router;
