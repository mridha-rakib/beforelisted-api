// file: src/modules/user/user.route.ts

import { ROLES } from "@/constants/app.constants";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { UserController } from "./user.controller";

const router = Router();
const userController = new UserController();

/**
 * ===========================
 * USER ROUTES (Authenticated)
 * ===========================
 */

/**
 * GET /user/profile
 * Get authenticated user's profile
 * Protected: Any authenticated user
 */
router.get("/profile", authMiddleware.verifyToken, userController.getProfile);

/**
 * PUT /user/profile
 * Update authenticated user's profile
 * Protected: Any authenticated user
 */
router.put(
  "/profile",
  authMiddleware.verifyToken,
  userController.updateProfile
);

/**
 * POST /user/change-email
 * Request email change (sends verification)
 * Protected: Any authenticated user
 */
router.post(
  "/change-email",
  authMiddleware.verifyToken,
  userController.requestEmailChange
);

/**
 * POST /user/verify-new-email
 * Verify new email with code
 * Protected: Any authenticated user
 */
router.post(
  "/verify-new-email",
  authMiddleware.verifyToken,
  userController.verifyNewEmail
);

/**
 * DELETE /user
 * Delete own account (soft delete)
 * Protected: Any authenticated user
 */
router.delete("/", authMiddleware.verifyToken, userController.deleteAccount);

/**
 * ===========================
 * ADMIN ROUTES
 * ===========================
 */

/**
 * GET /user/:userId
 * Get specific user by ID
 * Protected: Admin only
 */
router.get(
  "/:userId",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  userController.adminGetUser
);

/**
 * DELETE /user/:userId
 * Soft delete user
 * Protected: Admin only
 */
router.delete(
  "/:userId",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  userController.adminDeleteUser
);

/**
 * POST /user/:userId/restore
 * Restore soft-deleted user
 * Protected: Admin only
 */
router.post(
  "/:userId/restore",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  userController.adminRestoreUser
);

/**
 * DELETE /user/:userId/permanent
 * Permanently delete user (hard delete)
 * Protected: Admin only
 */
router.delete(
  "/:userId/permanent",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  userController.adminPermanentlyDeleteUser
);

export default router;
