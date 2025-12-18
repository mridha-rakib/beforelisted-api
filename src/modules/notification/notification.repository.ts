// file: src/modules/notification/notification.repository.ts

import { BaseRepository } from "@/modules/base/base.repository";
import type { INotification } from "./notification.interface";
import { Notification } from "./notification.model";

export class NotificationRepository extends BaseRepository<INotification> {
  constructor() {
    super(Notification);
  }

  async getUserNotifications(
    userId: string,
    limit: number = 20,
    skip: number = 0
  ): Promise<INotification[]> {
    return this.model
      .find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.model.countDocuments({
      recipientId: userId,
      isRead: false,
    });
  }

  async getUnreadNotifications(userId: string): Promise<INotification[]> {
    return this.model
      .find({ recipientId: userId, isRead: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  async markAsRead(notificationId: string): Promise<INotification | null> {
    return this.model.findByIdAndUpdate(
      notificationId,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
  }

  async markAllAsRead(userId: string): Promise<any> {
    return this.model.updateMany(
      { recipientId: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  async deleteNotification(notificationId: string): Promise<any> {
    return this.model.findByIdAndDelete(notificationId);
  }

  async getByType(userId: string, type: string): Promise<INotification[]> {
    return this.model
      .find({ recipientId: userId, type })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getAllAdmins(): Promise<any[]> {
    const User = this.model.db.collection("users");
    return User.find({ role: "Admin" }).toArray();
  }

  async cleanupOldReadNotifications(daysOld: number = 30): Promise<any> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    return this.model.deleteMany({
      isRead: true,
      readAt: { $lt: cutoffDate },
    });
  }
}
