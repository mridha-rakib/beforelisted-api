// file: src/modules/user/user.route.ts
import { authMiddleware } from "@/middlewares/auth.middleware";
import { userImageUpload } from "@/middlewares/multer-s3";
import { Router } from "express";
import { UserController } from "./user.controller";

const router = Router();
const userController = new UserController();

// Public routes
router.post("/login", userController.login);
router.post("/refresh-token", userController.refreshToken);
router.post("/forgot-password", userController.forgotPassword);
router.post("/verify-reset-code", userController.verifyResetCode);
router.post("/reset-password", userController.resetPassword);

// private routes
router.put(
  "/profile/change-password",
  authMiddleware.authenticate,
  userController.changePassword
);
router.post("/logout", authMiddleware.authenticate, userController.logout);

// User management routes - only SuperAdmin can create users
router.post(
  "/create",
  authMiddleware.authenticate,
  authMiddleware.authorize(["SuperAdmin"]),
  userController.createUser
);

// User management routes (Admin/SuperAdmin only)
router.get(
  "/",
  authMiddleware.authenticate,
  authMiddleware.authorize(["SuperAdmin", "Admin"]),
  userController.getAllUsers
);

// Profile routes (All authenticated users)
router.get("/profile", authMiddleware.authenticate, userController.getProfile);

router.put(
  "/profile",
  authMiddleware.authenticate,
  userController.updateProfile
);

// # profile image routes
router.post(
  "/profile/image-upload",
  authMiddleware.authenticate,
  userImageUpload.single("image"),
  userController.uploadProfileImageToS3
);

router.post(
  "/fcm-token",
  authMiddleware.authenticate,
  userController.updateFCMToken
);

router.get(
  "/:id",
  authMiddleware.authenticate,
  authMiddleware.authorize(["SuperAdmin", "Admin"]),
  userController.getUserById
);

router.put(
  "/:id",
  authMiddleware.authenticate,
  authMiddleware.authorize(["SuperAdmin", "Admin"]),
  userController.adminUpdateUser
);

router.delete(
  "/:id",
  authMiddleware.authenticate,
  authMiddleware.authorize(["SuperAdmin", "Admin"]),
  userController.deleteUser
);

export default router;
