// file: src/modules/auth/auth.route.ts

import { Router } from "express";

import { authMiddleware } from "@/middlewares/auth.middleware";
import { authLimiter } from "@/middlewares/rate-limit.middleware";

import passwordResetRoutes from "../password/password.route";
import { AuthController } from "./auth.controller";

const router = Router();
const authController = new AuthController();

router.post("/admin/login", authLimiter, authController.login);
router.post("/login", authLimiter, authController.login);

router.post("/verify-email", authLimiter, authController.verifyEmail);

router.post(
  "/resend-verification",
  authLimiter,
  authController.resendVerificationCode,
);

router.post("/verify-otp", authLimiter, authController.verifyOTP);

router.post("/refresh-token", authController.refreshToken);

router.use("/", passwordResetRoutes);

router.put(
  "/change-password",
  authMiddleware.verifyToken,
  authController.changePassword,
);

router.post("/logout", authMiddleware.verifyToken, authController.logout);

export default router;
