// file: src/modules/admin/admin.route.ts (EXAMPLE WITH AUTH)

import { ROLES } from "@/constants/app.constants";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { AdminController } from "./admin.controller";

const router = Router();
const adminController = new AdminController();

/**
 * GET /admin/revenue
 * Get revenue analytics
 * Protected: Admin role only
 */
router.get(
  "/revenue",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  authMiddleware.checkTokenExpiration,
  adminController.getRevenue
);

/**
 * GET /admin/agents
 * List all agents
 * Protected: Admin role only
 */
router.get(
  "/agents",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  adminController.listAgents
);

/**
 * POST /admin/agents/:agentId/grant-access
 * Grant agent access
 * Protected: Admin role only
 */
router.post(
  "/agents/:agentId/grant-access",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  adminController.grantAgentAccess
);

/**
 * POST /admin/agents/:agentId/suspend
 * Suspend agent
 * Protected: Admin role only
 */
router.post(
  "/agents/:agentId/suspend",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  adminController.suspendAgent
);

export default router;
