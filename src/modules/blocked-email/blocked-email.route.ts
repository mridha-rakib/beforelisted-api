import { ROLES } from "@/constants/app.constants";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { BlockedEmailController } from "./blocked-email.controller";

const router = Router();
const controller = new BlockedEmailController();

router.get(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.list,
);

router.post(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.block,
);

router.patch(
  "/:id/unblock",
  authMiddleware.verifyToken,
  authMiddleware.authorize(ROLES.ADMIN),
  controller.unblock,
);

export default router;
