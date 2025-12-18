// file: src/modules/notification/notification.controller.ts

import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import type { NextFunction, Request, Response } from "express";
import { NotificationService } from "./notification.service";

export class NotificationController {
  private service: NotificationService;

  constructor() {
    this.service = new NotificationService();
  }

  getNotifications = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user!.userId;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = parseInt(req.query.skip as string) || 0;

      const result = await this.service.getUserNotifications(
        userId,
        limit,
        skip
      );

      ApiResponse.success(res, result, "Notifications retrieved successfully");
    }
  );

  getUnreadCount = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user!.userId;
      const count = await this.service.getUnreadCount(userId);

      ApiResponse.success(res, { unreadCount: count });
    }
  );

  markAsRead = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { notificationId } = req.params;
      const result = await this.service.markAsRead(notificationId);

      ApiResponse.success(
        res,
        result,
        "Notification marked as read successfully"
      );
    }
  );

  markAllAsRead = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user!.userId;
      await this.service.markAllAsRead(userId);

      ApiResponse.success(res, { message: "All notifications marked as read" });
    }
  );

  deleteNotification = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { notificationId } = req.params;
      await this.service.deleteNotification(notificationId);

      ApiResponse.success(res, {
        message: "Notification deleted successfully",
      });
    }
  );
}
