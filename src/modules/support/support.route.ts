// file: src/modules/support/support.route.ts

import { Router } from "express";
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
router.post("/contact", controller.sendContactMessage.bind(controller));

export default router;
