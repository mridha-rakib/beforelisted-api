// file: src/modules/notification/notification.service.ts

import { logger } from "@/middlewares/pino-logger";
import type { Types } from "mongoose";
import type { INotification, NotificationType } from "./notification.interface";
import { NotificationRepository } from "./notification.repository";

export class NotificationService {
  private repository: NotificationRepository;

  constructor() {
    this.repository = new NotificationRepository();
  }

  async createNotification(data: {
    recipientId: string | Types.ObjectId;
    recipientRole: "Admin" | "Agent" | "Renter";
    title: string;
    message: string;
    type: "info" | "warning" | "success" | "alert";
    notificationType?: NotificationType;
    relatedEntityType?: "Agent" | "Renter" | "Request" | "Payment";
    relatedEntityId?: string | Types.ObjectId;
    actionUrl?: string;
    actionData?: Record<string, any>;
  }): Promise<INotification> {
    const notification = await this.repository.create({
      recipientId: data.recipientId,
      recipientRole: data.recipientRole,
      title: data.title,
      message: data.message,
      type: data.type,
      relatedEntityType: data.relatedEntityType,
      relatedEntityId: data.relatedEntityId,
      actionUrl: data.actionUrl,
      actionData: data.actionData,
      isRead: false,
    });

    logger.info(
      {
        notificationId: notification._id,
        recipientId: data.recipientId,
        type: data.notificationType,
      },
      "Notification created"
    );

    return notification;
  }

  async notifyAdminsAgentPendingApproval(agentData: {
    agentId: string | Types.ObjectId;
    agentEmail: string;
    agentName: string;
    licenseNumber: string;
  }): Promise<void> {
    try {
      const admins = await this.repository.getAllAdmins();

      if (admins.length === 0) {
        logger.warn("No admins found to notify");
        return;
      }

      const notificationPromises = admins.map((admin) =>
        this.createNotification({
          recipientId: admin._id,
          recipientRole: "Admin",
          title: "New Agent Pending Approval",
          message: `Agent ${agentData.agentName} (${agentData.agentEmail}) has completed email verification and is pending your approval.`,
          type: "alert",
          notificationType: "agent_pending_approval",
          relatedEntityType: "Agent",
          relatedEntityId: agentData.agentId,
          actionUrl: `/admin/agents/pending/${agentData.agentId}`,
          actionData: {
            agentId: agentData.agentId,
            agentEmail: agentData.agentEmail,
            agentName: agentData.agentName,
            licenseNumber: agentData.licenseNumber,
          },
        })
      );

      await Promise.all(notificationPromises);

      logger.info(
        { agentId: agentData.agentId, adminCount: admins.length },
        "Admins notified about pending agent approval"
      );
    } catch (error) {
      logger.error(
        { error, agentId: agentData.agentId },
        "Failed to notify admins about agent approval"
      );
      throw error;
    }
  }

  async notifyAgentActivated(agentData: {
    agentId: string | Types.ObjectId;
    agentEmail: string;
    agentName: string;
    activatedBy: string;
  }): Promise<void> {
    try {
      await this.createNotification({
        recipientId: agentData.agentId,
        recipientRole: "Agent",
        title: "Account Activated",
        message: `Your account has been activated by admin ${agentData.activatedBy}. You can now log in to the system.`,
        type: "success",
        notificationType: "agent_activated",
        relatedEntityType: "Agent",
        relatedEntityId: agentData.agentId,
        actionUrl: `/agent/login`,
      });

      logger.info(
        { agentId: agentData.agentId },
        "Agent notified about activation"
      );
    } catch (error) {
      logger.error(
        { error, agentId: agentData.agentId },
        "Failed to notify agent about activation"
      );
      throw error;
    }
  }

  async notifyAgentDeactivated(agentData: {
    agentId: string | Types.ObjectId;
    agentName: string;
    reason?: string;
  }): Promise<void> {
    try {
      await this.createNotification({
        recipientId: agentData.agentId,
        recipientRole: "Agent",
        title: "Account Deactivated",
        message: `Your account has been deactivated. ${agentData.reason ? `Reason: ${agentData.reason}` : ""}`,
        type: "warning",
        notificationType: "agent_deactivated",
        relatedEntityType: "Agent",
        relatedEntityId: agentData.agentId,
      });

      logger.info(
        { agentId: agentData.agentId },
        "Agent notified about deactivation"
      );
    } catch (error) {
      logger.error(
        { error, agentId: agentData.agentId },
        "Failed to notify agent about deactivation"
      );
      throw error;
    }
  }

  async notifyAgentAccessGranted(agentData: {
    agentId: string | Types.ObjectId;
    agentName: string;
    grantedBy: string;
  }): Promise<void> {
    try {
      await this.createNotification({
        recipientId: agentData.agentId,
        recipientRole: "Agent",
        title: "Access Granted",
        message: `You have been granted access by ${agentData.grantedBy}. You can now view pre-market requests.`,
        type: "success",
        notificationType: "agent_access_granted",
        relatedEntityType: "Agent",
        relatedEntityId: agentData.agentId,
        actionUrl: `/agent/dashboard`,
      });

      logger.info(
        { agentId: agentData.agentId },
        "Agent notified about access granted"
      );
    } catch (error) {
      logger.error(
        { error, agentId: agentData.agentId },
        "Failed to notify agent about access granted"
      );
      throw error;
    }
  }

  async notifyAgentAccessRevoked(agentData: {
    agentId: string | Types.ObjectId;
    agentName: string;
    reason?: string;
  }): Promise<void> {
    try {
      await this.createNotification({
        recipientId: agentData.agentId,
        recipientRole: "Agent",
        title: "Access Revoked",
        message: `Your access has been revoked. ${agentData.reason ? `Reason: ${agentData.reason}` : ""}`,
        type: "warning",
        notificationType: "agent_access_revoked",
        relatedEntityType: "Agent",
        relatedEntityId: agentData.agentId,
      });

      logger.info(
        { agentId: agentData.agentId },
        "Agent notified about access revoked"
      );
    } catch (error) {
      logger.error(
        { error, agentId: agentData.agentId },
        "Failed to notify agent about access revoked"
      );
      throw error;
    }
  }

  async getUserNotifications(
    userId: string,
    limit: number = 20,
    skip: number = 0
  ): Promise<{ notifications: INotification[]; total: number }> {
    const [notifications, total] = await Promise.all([
      this.repository.getUserNotifications(userId, limit, skip),
      this.repository.countDocuments({ recipientId: userId }),
    ]);

    return { notifications, total };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.repository.getUnreadCount(userId);
  }

  async markAsRead(notificationId: string): Promise<INotification | null> {
    return this.repository.markAsRead(notificationId);
  }

  async markAllAsRead(userId: string): Promise<any> {
    return this.repository.markAllAsRead(userId);
  }

  async deleteNotification(notificationId: string): Promise<any> {
    return this.repository.deleteNotification(notificationId);
  }
}
