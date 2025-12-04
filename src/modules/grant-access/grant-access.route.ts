// file: src/modules/grant-access/grant-access.route.ts

import { ROLES } from "@/constants/app.constants";
import { authenticateToken } from "@/middlewares/auth.middleware";
import { authorizeRole } from "@/middlewares/authorize.middleware";
import { Router } from "express";
import { GrantAccessController } from "./grant-access.controller";
import { GrantAccessRepository } from "./grant-access.repository";
import { GrantAccessService } from "./grant-access.service";

// ============================================
// ROUTER SETUP
// ============================================

const router = Router();

// Initialize dependencies (can be improved with DI container)
const grantAccessService = new GrantAccessService(
  new GrantAccessRepository(),
  new PreMarketRepository(),
  new PaymentService(new GrantAccessRepository(), new PreMarketRepository()),
  new PreMarketNotifier()
);

const controller = new GrantAccessController(grantAccessService);

// ============================================
// AGENT ROUTES
// ============================================

/**
 * POST /grant-access/payment/create-intent
 * Create payment intent for grant access
 * Protected: Agents only
 */
router.post(
  "/payment/create-intent",
  authenticateToken,
  authorizeRole(ROLES.AGENT),
  controller.createPaymentIntent
);

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * GET /grant-access/statistics
 * Get grant access statistics
 * Protected: Admins only
 */
router.get(
  "/statistics",
  authenticateToken,
  authorizeRole(ROLES.ADMIN),
  controller.getStatistics
);

export default router;
