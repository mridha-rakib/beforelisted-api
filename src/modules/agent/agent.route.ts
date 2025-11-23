// file: src/modules/agent/agent.route.ts

import { Router } from "express";
import { AgentController } from "./agent.controller";

const router = Router();
const controller = new AgentController();

/**
 * ===========================
 * PUBLIC ROUTES
 * ===========================
 */

/**
 * POST /agent/register
 * Complete agent registration (user + profile)
 * Public - No authentication required
 */
router.post("/register", controller.registerAgent);

/**
 * ===========================
 * AGENT ROUTES (Protected)
 * ===========================
 */

// ... rest of your existing routes

export default router;
