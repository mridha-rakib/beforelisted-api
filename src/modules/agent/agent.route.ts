// file: src/modules/agent/agent.route.ts (EXAMPLE WITH AUTH)

import { ROLES } from "@/constants/app.constants";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { AgentController } from "./agent.controller";

const router = Router();
const agentController = new AgentController();

/**
 * GET /agent/profile
 * Get agent profile
 * Protected: Agent role only
 */
router.get(
  "/profile",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.AGENT),
  agentController.getProfile
);

/**
 * PUT /agent/profile
 * Update agent profile
 * Protected: Agent role only
 */
router.put(
  "/profile",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.AGENT),
  agentController.updateProfile
);

/**
 * GET /agent/requests
 * Get matched requests for agent
 * Protected: Agent role only
 */
router.get(
  "/requests",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.AGENT),
  agentController.getRequests
);

export default router;
