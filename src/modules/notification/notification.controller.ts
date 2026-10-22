// file: src/modules/notification/notification.controller.ts

import type { NextFunction, Request, Response } from "express";

import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { logger } from "@/middlewares/pino-logger";
import { NotFoundException } from "@/utils/app-error.utils";
import { ApiResponse } from "@/utils/response.utils";
import { requiredRouteParam } from "@/utils/request-param.utils";

import { NotificationService } from "./notification.service";

export class NotificationController {
  private service: NotificationService;

  constructor() {
    this.service = new NotificationService();
  }

  getNotifications = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const userId = req.user!.userId;
      const limit = Math.min(Number.parseInt(req.query.limit as string) || 20, 100);
      const skip = Number.parseInt(req.query.skip as string) || 0;

      const result = await this.service.getUserNotifications(
        userId,
        limit,
        skip,
      );

      ApiResponse.success(res, result, "Notifications retrieved successfully");
    },
  );

  getUserNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const limit = Number.parseInt(req.query.limit as string) || 20;
    const skip = Number.parseInt(req.query.skip as string) || 0;

    const result = await this.service.getUserNotifications(userId, limit, skip);

    logger.info(
      { userId, count: result.notifications.length },
      "User notifications retrieved",
    );

    ApiResponse.success(
      res,
      {
        count: result.notifications.length,
        total: result.total,
        notifications: result.notifications,
      },
      "Notifications retrieved",
    );
  });

  getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const count = await this.service.getUnreadCount(userId);

    ApiResponse.success(res, { unreadCount: count });
  });

  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const notificationId = requiredRouteParam(req.params.notificationId, "notificationId");
    const notification = await this.service.markAsRead(
      notificationId,
      req.user!.userId,
    );

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    ApiResponse.success(
      res,
      notification,
      "Notification marked as read successfully",
    );
  });

  markAllAsRead = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const userId = req.user!.userId;
      await this.service.markAllAsRead(userId);

      ApiResponse.success(res, { message: "All notifications marked as read" });
    },
  );

  deleteNotification = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const notificationId = requiredRouteParam(req.params.notificationId, "notificationId");
      const notification = await this.service.deleteNotification(
        notificationId,
        req.user!.userId,
      );

      if (!notification) {
        throw new NotFoundException("Notification not found");
      }

      ApiResponse.success(res, {
        message: "Notification deleted successfully",
      });
    },
  );
}
