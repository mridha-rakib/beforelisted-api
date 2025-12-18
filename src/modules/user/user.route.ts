// file: src/modules/user/user.route.ts

import { ROLES } from "@/constants/app.constants";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { UserController } from "./user.controller";

const router = Router();
const userController = new UserController();


router.get("/profile", authMiddleware.verifyToken, userController.getProfile);

router.put(
  "/profile",
  authMiddleware.verifyToken,
  userController.updateProfile
);

router.delete("/", authMiddleware.verifyToken, userController.deleteAccount);

router.get(
  "/admin/referral-link",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  userController.getReferralLink
);

router.get(
  "/:userId",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  userController.adminGetUser
);

export default router;
