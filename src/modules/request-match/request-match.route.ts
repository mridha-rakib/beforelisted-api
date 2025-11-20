// file: src/modules/request-match/request-match.route.ts

import { ROLES } from "@/constants/app.constants";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { RequestMatchController } from "./request-match.controller";

const router = Router();
const controller = new RequestMatchController();

/**
 * ===========================
 * AGENT ROUTES
 * ===========================
 */

/**
 * POST /request-match
 * Create request match (agent clicks "Request Match")
 * Protected: Agent only
 */
router.post(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.AGENT),
  controller.createMatch
);

/**
 * GET /request-match
 * Get own match requests
 * Protected: Agent only
 */
router.get(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.AGENT),
  controller.getAgentMatches
);

/**
 * GET /request-match/:matchId
 * Get single match details
 * Protected: Agent only
 */
router.get(
  "/:matchId",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.AGENT),
  controller.getMatchDetails
);

/**
 * POST /request-match/:matchId/request-grant-access
 * Request grant access
 * Protected: Agent only
 */
router.post(
  "/:matchId/request-grant-access",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.AGENT),
  controller.requestGrantAccess
);

/**
 * POST /request-match/:matchId/process-payment
 * Process Stripe payment for grant access
 * Protected: Agent only
 */
router.post(
  "/:matchId/process-payment",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.AGENT),
  controller.processPayment
);

/**
 * GET /request-match/:matchId/grant-access-status
 * Get grant access status
 * Protected: Agent only
 */
router.get(
  "/:matchId/grant-access-status",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.AGENT),
  controller.getGrantAccessStatus
);

/**
 * ===========================
 * ADMIN ROUTES
 * ===========================
 */

/**
 * GET /request-match/admin/all
 * Get all request matches
 * Protected: Admin only
 */
router.get(
  "/admin/all",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.adminGetAllMatches
);

/**
 * GET /request-match/admin/pre-market-request/:preMarketRequestId
 * Get all matches for specific pre-market request
 * Protected: Admin only
 */
router.get(
  "/admin/pre-market-request/:preMarketRequestId",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.adminGetMatchesForRequest
);

/**
 * GET /request-match/admin/pre-market-request/:preMarketRequestId/pending
 * Get pending matches for pre-market request
 * Protected: Admin only
 */
router.get(
  "/admin/pre-market-request/:preMarketRequestId/pending",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.adminGetPendingMatchesForRequest
);

/**
 * POST /request-match/admin/:matchId/status
 * Approve or reject match
 * Protected: Admin only
 */
router.post(
  "/admin/:matchId/status",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.adminUpdateMatchStatus
);

/**
 * POST /request-match/admin/:matchId/set-grant-access-amount
 * Set grant access amount (price)
 * Protected: Admin only
 */
router.post(
  "/admin/:matchId/set-grant-access-amount",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.adminSetGrantAccessAmount
);

/**
 * POST /request-match/admin/:matchId/grant-free-access
 * Grant free access (no payment required)
 * Protected: Admin only
 */
router.post(
  "/admin/:matchId/grant-free-access",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.adminGrantFreeAccess
);

/**
 * POST /request-match/admin/:matchId/reject
 * Reject match
 * Protected: Admin only
 */
router.post(
  "/admin/:matchId/reject",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.adminRejectMatch
);

export default router;
