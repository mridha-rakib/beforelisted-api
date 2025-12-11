// file: src/modules/grant-access/grant-access.route.ts

import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { GrantAccessController } from "../grant-access/grant-access.service";
import { PaymentService } from "../payment/payment.service";
import { PreMarketNotifier } from "../pre-market/pre-market-notifier";
import { PreMarketRepository } from "../pre-market/pre-market.repository";
import { GrantAccessRepository } from "./grant-access.repository";
import { GrantAccessService } from "./grant-access.service";

// ============================================
// ROUTER SETUP
// ============================================

const router = Router();

// Initialize dependencies (can be improved with DI container)
const grantAccessRepository = new GrantAccessRepository();
const preMarketRepository = new PreMarketRepository();
const paymentService = new PaymentService(
  grantAccessRepository,
  preMarketRepository
);
const notifier = new PreMarketNotifier();

const grantAccessService = new GrantAccessService(
  grantAccessRepository,
  preMarketRepository,
  paymentService,
  notifier
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
  authMiddleware.verifyToken,
  authMiddleware.authorize("Agent"),
  controller.createPaymentIntent.bind(controller)
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
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getStatistics.bind(controller)
);

export default router;
