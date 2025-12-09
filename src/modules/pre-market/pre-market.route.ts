// file: src/modules/pre-market/pre-market.route.ts

import { authMiddleware } from "@/middlewares/auth.middleware";

import { Router } from "express";
import { PreMarketController } from "./pre-market.controller";

const router = Router();

const controller = new PreMarketController();
// ============================================
// RENTER ROUTES
// ============================================

router.post(
  "/create",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Renter"),
  controller.createRequest.bind(controller)
);

router.get(
  "/my-requests",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Renter"),
  controller.getRenterRequests.bind(controller)
);

router.put(
  "/:requestId",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Renter"),
  controller.updateRequest.bind(controller)
);

router.delete(
  "/:requestId",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Renter"),
  controller.deleteRequest.bind(controller)
);

// ============================================
// AGENT ROUTES
// ============================================

router.get(
  "/all",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Agent"),
  controller.getAllRequests.bind(controller)
);

/**
 * GET /pre-market/agent/all-requests
 * Agent views all available pre-market requests
 * Data visibility depends on agent type:
 * - Normal Agent: No renter info
 * - Grant Access Agent: Full renter info included
 * Protected: Agents only
 */
router.get(
  "/agent/all-requests",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Agent"),
  controller.getAllRequestsForAgent.bind(controller)
);

router.get(
  "/agent/:requestId",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Agent"),
  controller.getRequestForAgent.bind(controller)
);

router.get(
  "/:requestId/details",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Agent"),
  controller.getRequestDetails.bind(controller)
);

router.post(
  "/grant-access/request",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Agent"),
  controller.requestAccess.bind(controller)
);

router.post(
  "/payment/create-intent",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Agent"),
  controller.createPaymentIntent.bind(controller)
);

// ============================================
// ADMIN ROUTES
// ============================================

router.post(
  "/grant-access/admin/:requestId/approve",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.adminApprove.bind(controller)
);

router.post(
  "/grant-access/admin/:requestId/charge",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.adminCharge.bind(controller)
);

router.post(
  "/grant-access/admin/:requestId/reject",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.adminReject.bind(controller)
);

// ============================================
// WEBHOOK (No auth required)
// ============================================

router.post("/payment/webhook", controller.handleWebhook.bind(controller));

export default router;
