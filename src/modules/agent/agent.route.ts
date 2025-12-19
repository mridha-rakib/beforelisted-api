// file: src/modules/agent/agent.route.ts

import { ROLES } from "@/constants/app.constants";
import { agentActivationMiddleware } from "@/middlewares/agent-activation.middleware";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { AgentController } from "./agent.controller";

const router = Router();
const controller = new AgentController();

// PUBLIC ROUTES
/**
 * POST /agent/register
 * Complete agent registration (user + profile)
 */
router.post("/register", controller.registerAgent);

// AUTHENTICATED ROUTES (Agent)
/**
 * GET /agent/profile
 * Get own agent profile
 */

router.get(
  "/profile",
  authMiddleware.verifyToken,
  authMiddleware.verifyEmailVerified,
  agentActivationMiddleware.verify,
  authMiddleware.authorize(ROLES.AGENT),
  controller.getAgentProfile
);

/**
 * PUT /agent/profile
 * Update own agent profile
 */
router.put(
  "/profile",
  authMiddleware.verifyToken,
  authMiddleware.verifyEmailVerified,
  agentActivationMiddleware.verify,
  authMiddleware.authorize(ROLES.AGENT),
  controller.updateAgentProfile
);

/**
 * NEW: GET /agent/referral-link
 * Get agent's referral code and link
 */
router.get(
  "/referral-link",
  authMiddleware.verifyToken,
  authMiddleware.verifyEmailVerified,
  agentActivationMiddleware.verify,
  authMiddleware.authorize(ROLES.AGENT),
  controller.getReferralLink
);

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * GET /agent/admin/all
 * Get all agents (admin only)
 */
router.get(
  "/admin/all",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.adminGetAllAgents
);

/**
 * GET /agent/admin/excel-download
 * Download agent Excel (admin only)
 * NOTE: Must be before /admin/:userId to avoid route conflict
 */
router.get(
  "/admin/excel-download",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.downloadAgentConsolidatedExcel
);

/**
 * GET /agent/admin/:userId
 * Get specific agent profile (admin only)
 */
router.get(
  "/admin/:userId",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.adminGetAgent
);

/**
 * Toggle agent access
 * POST /agent/:agentId/toggle-access
 * Admin only
 */
router.post(
  "/:agentId/toggle-access",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.toggleAccess
);

/**
 * Get agent access status
 * GET /agent/:agentId/access-status
 * Admin only
 */
router.get(
  "/:agentId/access-status",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.getAccessStatus
);

/**
 * POST /agent/admin/:userId/toggle-active
 * Toggle agent active/deactivate (automatic switch)
 */
router.post(
  "/admin/:userId/toggle-active",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.toggleAgentActive
);
/**
 * GET /agent/admin/:userId/activation-history
 * Get agent activation history
 */
router.get(
  "/admin/:userId/activation-history",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.getActivationHistory
);

export default router;
