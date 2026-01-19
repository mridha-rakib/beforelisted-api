// file: src/modules/pre-market/pre-market.route.ts

import { authMiddleware } from "@/middlewares/auth.middleware";

import { Router } from "express";
import { PreMarketController } from "./pre-market.controller";

const router = Router();

const controller = new PreMarketController();

router.post(
  "/create",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Renter"),
  controller.createRequest.bind(controller),
);

router.get(
  "/my-requests",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Renter"),
  controller.getRenterRequests.bind(controller),
);

router.get(
  "/renter/requests/with-agents",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Renter"),
  controller.getRenterRequestsWithAgents.bind(controller),
);

// ============================================
// AGENT ROUTES - GRANT ACCESS AGENTS and normal agents
// ============================================
router.get(
  "/agent/all-requests",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Agent"),
  controller.getAllRequestsForAgent.bind(controller),
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
  controller.getRequestDetailsForGrantAccessAgent.bind(controller),
);

router.post(
  "/agent/:requestId/match",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Agent"),
  controller.matchRequestForAgent.bind(controller),
);

// ============================================
// AGENT ROUTES - GENERIC (ALL AGENTS)
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
  controller.getAllRequests.bind(controller),
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
  controller.getRequestDetails.bind(controller),
);

/**
 * GET /pre-market/:requestId/details
 * Alternative route for request details (deprecated - use /:requestId)
 */
router.get(
  "/:requestId/details",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Agent"),
  controller.getRequestDetails.bind(controller),
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
  controller.requestAccess.bind(controller),
);

/**
 * POST /pre-market/payment/create-intent
 * Create Stripe payment intent for access
 */
router.post(
  "/payment/create-intent",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Agent"),
  controller.createPaymentIntent.bind(controller),
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
  controller.getAllRequestsForAdmin.bind(controller),
);

/**
 * GET /pre-market/admin/requests/:requestId
 * Admin views a single pre-market request with full details.
 */
router.get(
  "/admin/requests/:requestId",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getRequestByIdForAdmin.bind(controller),
);

router.post(
  "/grant-access/admin/:requestId/approve",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.adminApprove.bind(controller),
);

router.post(
  "/grant-access/admin/:requestId/charge",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.adminCharge.bind(controller),
);

router.post(
  "/grant-access/admin/:requestId/reject",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.adminReject.bind(controller),
);

router.delete(
  "/admin/requests/:requestId",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.adminDeleteRequest.bind(controller),
);

router.put(
  "/admin/renters/:renterId/listings/:listingId/toggle-status",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.adminToggleListingStatus.bind(controller),
);

// Admin Excel endpoints
router.get(
  "/admin/excel-download",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.downloadConsolidatedExcel,
);

router.get(
  "/admin/excel-renter-listings",
  authMiddleware.verifyToken,
  controller.downloadPreMarketListingsExcel.bind(controller),
);

router.get(
  "/admin/excel-stats",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getExcelStats,
);
// show all listings with all data
router.get(
  "/",
  authMiddleware.verifyToken,
  controller.getAllListingsWithAllData.bind(controller),
);

// ===========================================RENTER ROUTES
router.get(
  "/renter/:requestId",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Renter"),
  controller.getRenterRequestById.bind(controller),
);

router.put(
  "/:requestId",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Renter"),
  controller.updateRequest.bind(controller),
);

router.delete(
  "/:requestId",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Renter"),
  controller.deleteRequest.bind(controller),
);

router.put(
  "/:requestId/toggle-status",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Renter"),
  controller.toggleListingActivation.bind(controller),
);
// ===========================================RENTER ROUTES

export default router;
