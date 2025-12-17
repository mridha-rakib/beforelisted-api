// file: src/modules/grant-access/grant-access.route.ts

import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { PaymentService } from "../payment/payment.service";
import { PreMarketNotifier } from "../pre-market/pre-market-notifier";
import { PreMarketRepository } from "../pre-market/pre-market.repository";
import { GrantAccessController } from "./grant-access.controller"; // ✅ FIX #1
import { GrantAccessRepository } from "./grant-access.repository";
import { GrantAccessService } from "./grant-access.service"; // ✅ ADD THIS

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

// Soft delete
router.delete(
  "/admin/payments/:paymentId/soft",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.softDeletePayment.bind(controller)
);

// Bulk delete
router.post(
  "/admin/payments/bulk-delete",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.bulkDeletePayments.bind(controller)
);

// Restore
router.put(
  "/admin/payments/:paymentId/restore",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.restorePayment.bind(controller)
);

// History
router.get(
  "/admin/payments/:paymentId/deletion-history",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getPaymentDeletionHistory.bind(controller)
);

export default router;
