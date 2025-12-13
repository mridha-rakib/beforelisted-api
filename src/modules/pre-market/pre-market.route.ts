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

router.get(
  "/renter/:requestId",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Renter"),
  controller.getRenterRequestById.bind(controller)
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
// AGENT ROUTES - GRANT ACCESS AGENTS FIRST
// (More specific routes BEFORE generic ones)
// ============================================
/**
 * GET /pre-market/agent/all-requests
 * Grant Access Agents: View ALL requests with FULL renter info
 */
router.get(
  "/agent/all-requests",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Agent"),
  controller.getAllRequestsForGrantAccessAgents.bind(controller)
);

/**
 * GET /pre-market/agent/:requestId
 * Grant Access Agents: View SPECIFIC request with FULL renter info
 * Path must include agent to avoid conflicting with /:requestId
 */
router.get(
  "/agent/:requestId",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Agent"),
  controller.getRequestDetailsForGrantAccessAgent.bind(controller)
);

// ============================================
// AGENT ROUTES - GENERIC (ALL AGENTS)
// (Less specific routes AFTER specific ones)
// ============================================

/**
 * GET /pre-market/all
 * Normal Agents: View all AVAILABLE requests
 * Renter info visibility depends on access level
 */
router.get(
  "/all",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Agent"),
  controller.getAllRequests.bind(controller)
);

/**
 * GET /pre-market/:requestId
 * Normal Agents: View specific request details
 * Must request/pay for renter information
 */
router.get(
  "/:requestId",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Agent"),
  controller.getRequestDetails.bind(controller)
);

/**
 * GET /pre-market/:requestId/details
 * Alternative route for request details (deprecated - use /:requestId)
 */
router.get(
  "/:requestId/details",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Agent"),
  controller.getRequestDetails.bind(controller)
);

// ============================================
// AGENT ACCESS MANAGEMENT
// ============================================
/**
 * POST /pre-market/grant-access/request
 * Request access to view renter information
 */
router.post(
  "/grant-access/request",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Agent"),
  controller.requestAccess.bind(controller)
);

/**
 * POST /pre-market/payment/create-intent
 * Create Stripe payment intent for access
 */
router.post(
  "/payment/create-intent",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Agent"),
  controller.createPaymentIntent.bind(controller)
);

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * GET /pre-market/admin/requests
 * Admin views all pre-market requests with full details.
 */
router.get(
  "/admin/requests",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getAllRequestsForAdmin.bind(controller)
);

/**
 * GET /pre-market/admin/requests/:requestId
 * Admin views a single pre-market request with full details.
 */
router.get(
  "/admin/requests/:requestId",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getRequestByIdForAdmin.bind(controller)
);

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

/**
 * DELETE /pre-market/admin/requests/:requestId
 * Admin deletes any pre-market request
 * Protected: Admins only
 * Performs soft delete
 */
router.delete(
  "/admin/requests/:requestId",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.adminDeleteRequest.bind(controller)
);

// ============================================
// WEBHOOK (No auth required)
// ============================================

// router.post("/payment/webhook", controller.handleWebhook.bind(controller));

export default router;
