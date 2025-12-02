// file: src/modules/agent/agent.route.ts

import { ROLES } from "@/constants/app.constants";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { AgentController } from "./agent.controller";

const router = Router();
const controller = new AgentController();

// PUBLIC ROUTES
/**
 * POST /agent/register
 * Complete agent registration (user + profile)
 * Public - No authentication required
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
  authMiddleware.authorize(ROLES.AGENT),
  controller.updateAgentProfile
);

/**
 * ✅ NEW: GET /agent/referral-link
 * Get agent's referral code and link
 */
router.get(
  "/referral-link",
  authMiddleware.verifyToken,
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
 * GET /agent/admin/metrics
 * Get agent metrics (admin only)
 */
// router.get(
//   "/admin/metrics",
//   authMiddleware.verifyToken,
//   authMiddleware.authorize(ROLES.ADMIN),
//   controller.adminGetMetrics
// );

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
 * POST /agent/admin/approve/:userId
 * Approve agent (admin only)
 */
router.post(
  "/admin/approve/:userId",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.adminApproveAgent
);

/**
 * POST /agent/admin/verify/:userId
 * Verify agent (admin only)
 */
router.post(
  "/admin/verify/:userId",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.adminVerifyAgent
);

/**
 * POST /agent/admin/suspend/:userId
 * Suspend agent (admin only)
 */
router.post(
  "/admin/suspend/:userId",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.adminSuspendAgent
);

export default router;
