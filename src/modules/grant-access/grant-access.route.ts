// file: src/modules/grant-access/grant-access.route.ts

import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { PaymentService } from "../payment/payment.service";
import { PreMarketNotifier } from "../pre-market/pre-market-notifier";
import { PreMarketRepository } from "../pre-market/pre-market.repository";
import { GrantAccessController } from "./grant-access.controller";
import { GrantAccessRepository } from "./grant-access.repository";
import { GrantAccessService } from "./grant-access.service";

// ========================================
// ROUTER SETUP
// ========================================

const router = Router();

// Initialize dependencies
const grantAccessRepository = new GrantAccessRepository();
const preMarketRepository = new PreMarketRepository();
const paymentService = new PaymentService(
  grantAccessRepository,
  preMarketRepository
);
const notifier = new PreMarketNotifier();

// ✅ FIX #2: Create service first, then pass to controller
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
// router.post(
//   "/payment/create-intent",
//   authMiddleware.verifyToken,
//   authMiddleware.authorize("Agent"),
//   controller.createPaymentIntent.bind(controller)
// );

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * GET /grant-access/statistics
 * Get grant access statistics
 * Protected: Admins only
 */
// router.get(
//   "/statistics",
//   authMiddleware.verifyToken,
//   authMiddleware.authorize("Admin"),
//   controller.getStatistics.bind(controller)
// );

router.get(
  "/admin/payments",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getAllPayments.bind(controller)
);

router.get(
  "/admin/payments/stats",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getPaymentStats.bind(controller)
);

router.delete(
  "/admin/payments/:paymentId",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.deletePayment.bind(controller)
);

// History
router.get(
  "/admin/payments/:paymentId/deletion-history",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getPaymentDeletionHistory.bind(controller)
);

// ============================================
// ADMIN ROUTES - INCOME ANALYTICS
// ============================================

/**
 * GET /admin/income/monthly
 * Get monthly income breakdown
 * Query: ?year=2025
 */
router.get(
  "/admin/income/monthly",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getMonthlyIncome.bind(controller)
);

/**
 * GET /admin/income/monthly/:year/:month
 * Get detailed income for specific month
 */
router.get(
  "/admin/income/monthly/:year/:month",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getMonthlyIncomeDetail.bind(controller)
);

/**
 * GET /admin/income/range
 * Get income for date range
 * Query: ?startDate=2025-01-01&endDate=2025-12-31
 */
router.get(
  "/admin/income/range",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getIncomeByRange.bind(controller)
);

/**
 * GET /admin/income/year/:year
 * Get yearly income breakdown
 */
router.get(
  "/admin/income/year/:year",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getYearlyIncome.bind(controller)
);

export default router;
