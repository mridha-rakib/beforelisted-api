// file: src/modules/pre-market-request/pre-market-request.route.ts

import { ROLES } from "@/constants/app.constants";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { PreMarketRequestController } from "./pre-market-request.controller";

const router = Router();
const controller = new PreMarketRequestController();

/**
 * ===========================
 * RENTER ROUTES
 * ===========================
 */

/**
 * POST /pre-market-request
 * Create pre-market request
 * Protected: Renter only
 */
router.post(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.RENTER),
  controller.createRequest
);

/**
 * GET /pre-market-request
 * Get own pre-market requests
 * Protected: Renter only
 */
router.get(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.RENTER),
  controller.getRenterRequests
);

/**
 * GET /pre-market-request/:requestId
 * Get single own request
 * Protected: Renter only
 */
router.get(
  "/:requestId",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.RENTER),
  controller.getRenterRequest
);

/**
 * PATCH /pre-market-request/:requestId
 * Update request name (title only)
 * Protected: Renter only
 */
router.patch(
  "/:requestId",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.RENTER),
  controller.updateRequestName
);

/**
 * POST /pre-market-request/:requestId/deactivate
 * Deactivate request
 * Protected: Renter only
 */
router.post(
  "/:requestId/deactivate",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.RENTER),
  controller.deactivateRequest
);

/**
 * POST /pre-market-request/:requestId/activate
 * Activate request
 * Protected: Renter only
 */
router.post(
  "/:requestId/activate",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.RENTER),
  controller.activateRequest
);

/**
 * ===========================
 * AGENT ROUTES
 * ===========================
 */

/**
 * GET /pre-market-request/agent/all
 * Get all active requests (with optional filters)
 * Protected: Agent only
 */
router.get(
  "/agent/all",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.AGENT),
  controller.agentGetRequests
);

/**
 * GET /pre-market-request/agent/:requestId
 * Get request details
 * Protected: Agent only
 */
router.get(
  "/agent/:requestId",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.AGENT),
  controller.agentGetRequestDetails
);

/**
 * ===========================
 * ADMIN ROUTES
 * ===========================
 */

/**
 * GET /pre-market-request/admin/all
 * Get all requests (paginated with filters)
 * Protected: Admin only
 */
router.get(
  "/admin/all",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.adminGetRequests
);

/**
 * GET /pre-market-request/admin/:requestId
 * Get single request
 * Protected: Admin only
 */
router.get(
  "/admin/:requestId",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.adminGetRequest
);

/**
 * PUT /pre-market-request/admin/:requestId
 * Update request
 * Protected: Admin only
 */
router.put(
  "/admin/:requestId",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.adminUpdateRequest
);

/**
 * POST /pre-market-request/admin/:requestId/deactivate
 * Deactivate request
 * Protected: Admin only
 */
router.post(
  "/admin/:requestId/deactivate",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.adminDeactivateRequest
);

/**
 * DELETE /pre-market-request/admin/:requestId
 * Delete request
 * Protected: Admin only
 */
router.delete(
  "/admin/:requestId",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.adminDeleteRequest
);

export default router;
