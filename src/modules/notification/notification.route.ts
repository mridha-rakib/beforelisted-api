import { authMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { NotificationController } from "./notification.controller";

const router = Router();
const controller = new NotificationController();

router.get("/", authMiddleware.verifyToken, controller.getNotifications);
router.get(
  "/unread-count",
  authMiddleware.verifyToken,
  controller.getUnreadCount
);
router.patch(
  "/:notificationId/read",
  authMiddleware.verifyToken,
  controller.markAsRead
);
router.patch("/read-all", authMiddleware.verifyToken, controller.markAllAsRead);
router.delete(
  "/:notificationId",
  authMiddleware.verifyToken,
  controller.deleteNotification
);

export default router;
