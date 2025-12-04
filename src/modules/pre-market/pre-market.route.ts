// file: src/modules/pre-market/pre-market.route.ts

import { authMiddleware } from "@/middlewares/auth.middleware";

import { Router } from "express";
import { GrantAccessRepository } from "../grant-access/grant-access.repository";
import { PaymentService } from "../payment/payment.service";
import { PreMarketController } from "./pre-market.controller";
import { PreMarketRepository } from "./pre-market.repository";
import { PreMarketService } from "./pre-market.service";

// ============================================
// ROUTER SETUP
// ============================================

const router = Router();

// Initialize dependencies
const preMarketService = new PreMarketService(
  new PreMarketRepository(),
  new GrantAccessRepository(),
  new PaymentService(new GrantAccessRepository(), new PreMarketRepository()),
  new PreMarketNotifier()
);

const controller = new PreMarketController(
  preMarketService,
  new GrantAccessService(new GrantAccessRepository(), new PaymentService()),
  new PaymentService(new GrantAccessRepository(), new PreMarketRepository()),
  new AgentProfileRepository()
);

// ============================================
// RENTER ROUTES
// ============================================

router.post(
  "/create",
  authMiddleware,
  roleGuard(["Renter"]),
  controller.createRequest.bind(controller)
);

router.get(
  "/my-requests",
  authMiddleware,
  roleGuard(["Renter"]),
  controller.getRenterRequests.bind(controller)
);

router.put(
  "/:requestId",
  authMiddleware,
  roleGuard(["Renter"]),
  controller.updateRequest.bind(controller)
);

router.delete(
  "/:requestId",
  authMiddleware,
  roleGuard(["Renter"]),
  controller.deleteRequest.bind(controller)
);

// ============================================
// AGENT ROUTES
// ============================================

router.get(
  "/all",
  authMiddleware,
  roleGuard(["Agent"]),
  controller.getAllRequests.bind(controller)
);

router.get(
  "/:requestId/details",
  authMiddleware,
  roleGuard(["Agent"]),
  controller.getRequestDetails.bind(controller)
);

router.post(
  "/grant-access/request",
  authMiddleware,
  roleGuard(["Agent"]),
  controller.requestAccess.bind(controller)
);

router.post(
  "/payment/create-intent",
  authMiddleware,
  roleGuard(["Agent"]),
  controller.createPaymentIntent.bind(controller)
);

// ============================================
// ADMIN ROUTES
// ============================================

router.post(
  "/grant-access/admin/:requestId/approve",
  authMiddleware,
  roleGuard(["Admin"]),
  controller.adminApprove.bind(controller)
);

router.post(
  "/grant-access/admin/:requestId/charge",
  authMiddleware,
  roleGuard(["Admin"]),
  controller.adminCharge.bind(controller)
);

router.post(
  "/grant-access/admin/:requestId/reject",
  authMiddleware,
  roleGuard(["Admin"]),
  controller.adminReject.bind(controller)
);

// ============================================
// WEBHOOK (No auth required)
// ============================================

router.post("/payment/webhook", controller.handleWebhook.bind(controller));

export default router;
