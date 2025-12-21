// file: src/modules/notification/notification.service.ts

import { logger } from "@/middlewares/pino-logger";
import type { Types } from "mongoose";
import { AgentProfileRepository } from "../agent/agent.repository";
import type { INotification, NotificationType } from "./notification.interface";
import { NotificationRepository } from "./notification.repository";

export class NotificationService {
  private repository: NotificationRepository;
  private agentRepository: AgentProfileRepository;

  constructor() {
    this.repository = new NotificationRepository();
    this.agentRepository = new AgentProfileRepository();
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
    grantedBy: string | Types.ObjectId;
  }): Promise<void> {
    try {
      await this.createNotification({
        recipientId: agentData.agentId,
        recipientRole: "Agent",
        title: "Access Granted",
        message: `You have been granted access by admin. You can now view pre-market requests with renter information.`,
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

  // ✅ NEW METHODS FOR GRANT ACCESS NOTIFICATIONS:

  /**
   * Notify admin when agent requests grant access
   */
  async notifyAdminAboutGrantAccessRequest(data: {
    agentId: string | Types.ObjectId;
    agentName: string;
    agentEmail: string;
    agentCompany?: string;
    licenseNumber?: string;
    preMarketRequestId: string;
    propertyTitle: string;
    location: string;
    renterName?: string;
    grantAccessId: string;
  }): Promise<void> {
    try {
      const admins = await this.repository.getAllAdmins();
      if (admins.length === 0) {
        logger.warn("No admins found to notify about grant access request");
        return;
      }

      console.log(
        "Admins to notify:",
        admins.map((a) => a._id.toString())
      );

      const notificationPromises = admins.map((admin) =>
        this.createNotification({
          recipientId: admin._id,
          recipientRole: "Admin",
          title: `Grant Access Request from ${data.agentName}`,
          message: `Agent ${data.agentName} requested access to view renter information for "${data.propertyTitle}" at ${data.location}`,
          type: "alert",
          notificationType: "grant_access_request",
          relatedEntityType: "Request",
          relatedEntityId: data.grantAccessId,
          actionUrl: `/admin/grant-access-requests/${data.grantAccessId}`,
          actionData: {
            agentId: data.agentId,
            agentName: data.agentName,
            agentEmail: data.agentEmail,
            agentCompany: data.agentCompany,
            licenseNumber: data.licenseNumber,
            preMarketRequestId: data.preMarketRequestId,
            propertyTitle: data.propertyTitle,
            location: data.location,
            renterName: data.renterName,
            grantAccessId: data.grantAccessId,
          },
        })
      );

      await Promise.all(notificationPromises);
      logger.info(
        { agentId: data.agentId, adminCount: admins.length },
        "✅ Admins notified about grant access request"
      );
    } catch (error) {
      logger.error(
        { error, agentId: data.agentId },
        "Failed to notify admins about grant access request"
      );
    }
  }

  /**
   * Notify admin when grant access is approved
   */
  async notifyAdminAboutGrantAccessApproved(data: {
    grantAccessId: string;
    agentName: string;
    propertyTitle: string;
    approvedBy: string;
  }): Promise<void> {
    try {
      const admins = await this.repository.getAllAdmins();
      const notificationPromises = admins.map((admin) =>
        this.createNotification({
          recipientId: admin._id,
          recipientRole: "Admin",
          title: `Grant Access Approved - ${data.agentName}`,
          message: `You approved grant access for ${data.agentName} to view "${data.propertyTitle}"`,
          type: "success",
          notificationType: "grant_access_approved",
          relatedEntityType: "Request",
          relatedEntityId: data.grantAccessId,
          actionUrl: `/admin/grant-access-requests/${data.grantAccessId}`,
          actionData: {
            agentName: data.agentName,
            propertyTitle: data.propertyTitle,
            approvedBy: data.approvedBy,
          },
        })
      );

      await Promise.all(notificationPromises);
      logger.info(
        { grantAccessId: data.grantAccessId },
        "✅ Admins notified about grant access approval"
      );
    } catch (error) {
      logger.error({ error }, "Failed to notify admins about approval");
      // Non-blocking
    }
  }

  /**
   * Notify admin when grant access is rejected
   */
  async notifyAdminAboutGrantAccessRejected(data: {
    grantAccessId: string;
    agentName: string;
    propertyTitle: string;
    rejectionReason?: string;
    rejectedBy: string;
  }): Promise<void> {
    try {
      const admins = await this.repository.getAllAdmins();
      const notificationPromises = admins.map((admin) =>
        this.createNotification({
          recipientId: admin._id,
          recipientRole: "Admin",
          title: `Grant Access Rejected - ${data.agentName}`,
          message: `You rejected grant access for ${data.agentName} to view "${data.propertyTitle}"${
            data.rejectionReason ? `: ${data.rejectionReason}` : ""
          }`,
          type: "warning",
          notificationType: "grant_access_rejected",
          relatedEntityType: "Request",
          relatedEntityId: data.grantAccessId,
          actionUrl: `/admin/grant-access-requests/${data.grantAccessId}`,
          actionData: {
            agentName: data.agentName,
            propertyTitle: data.propertyTitle,
            rejectionReason: data.rejectionReason,
            rejectedBy: data.rejectedBy,
          },
        })
      );

      await Promise.all(notificationPromises);
      logger.info(
        { grantAccessId: data.grantAccessId },
        "✅ Admins notified about grant access rejection"
      );
    } catch (error) {
      logger.error({ error }, "Failed to notify admins about rejection");
      // Non-blocking
    }
  }

  async notifyAgentAboutGrantAccessApproved(data: {
    grantAccessId: string;
    agentId: string | Types.ObjectId;
    agentName: string;
    propertyTitle: string;
    location: string;
    approvedBy: string;
    isFree: boolean;
    notes?: string;
  }): Promise<void> {
    try {
      await this.createNotification({
        recipientId: data.agentId,
        recipientRole: "Agent",
        title: "Grant Access Approved! 🎉",
        message: `Your request to access "${data.propertyTitle}" at ${data.location} has been approved by admin. ${
          data.isFree
            ? "You can now view renter information for FREE!"
            : "Please complete the payment to view renter information."
        }`,
        type: "success",
        notificationType: "grant_access_approved",
        relatedEntityType: "Request",
        relatedEntityId: data.grantAccessId,
        actionUrl: `/agent/grant-access/${data.grantAccessId}`,
        actionData: {
          grantAccessId: data.grantAccessId,
          propertyTitle: data.propertyTitle,
          location: data.location,
          isFree: data.isFree,
          approvedBy: data.approvedBy,
          notes: data.notes,
        },
      });

      logger.info(
        { agentId: data.agentId, grantAccessId: data.grantAccessId },
        "✅ Agent notified about grant access approval"
      );
    } catch (error) {
      logger.error(
        { error, agentId: data.agentId, grantAccessId: data.grantAccessId },
        "Failed to notify agent about grant access approval (non-blocking)"
      );
    }
  }

  /**
   * ✅ NEW METHOD
   * Notify agent when admin charges for grant access
   */
  async notifyAgentAboutGrantAccessCharged(data: {
    grantAccessId: string;
    agentId: string | Types.ObjectId;
    agentName: string;
    propertyTitle: string;
    location: string;
    chargeAmount: number;
    currency: string;
    chargedBy: string;
    paymentLink?: string;
    notes?: string;
  }): Promise<void> {
    try {
      await this.createNotification({
        recipientId: data.agentId,
        recipientRole: "Agent",
        title: "Payment Required for Grant Access",
        message: `Your request to access "${data.propertyTitle}" at ${data.location} requires payment of ${data.currency} ${data.chargeAmount}. Click to proceed with payment.`,
        type: "alert",
        notificationType: "grant_access_request",
        relatedEntityType: "Payment",
        relatedEntityId: data.grantAccessId,
        actionUrl:
          data.paymentLink || `/agent/grant-access/${data.grantAccessId}/pay`,
        actionData: {
          grantAccessId: data.grantAccessId,
          propertyTitle: data.propertyTitle,
          location: data.location,
          chargeAmount: data.chargeAmount,
          currency: data.currency,
          chargedBy: data.chargedBy,
          notes: data.notes,
        },
      });

      logger.info(
        {
          agentId: data.agentId,
          grantAccessId: data.grantAccessId,
          amount: data.chargeAmount,
        },
        "✅ Agent notified about grant access charge"
      );
    } catch (error) {
      logger.error(
        { error, agentId: data.agentId, grantAccessId: data.grantAccessId },
        "Failed to notify agent about grant access charge (non-blocking)"
      );
    }
  }

  /**
   * ✅ NEW METHOD
   * Notify agent when admin rejects grant access
   */
  async notifyAgentAboutGrantAccessRejected(data: {
    grantAccessId: string;
    agentId: string | Types.ObjectId;
    agentName: string;
    propertyTitle: string;
    location: string;
    rejectionReason?: string;
    rejectedBy: string;
    notes?: string;
  }): Promise<void> {
    try {
      await this.createNotification({
        recipientId: data.agentId,
        recipientRole: "Agent",
        title: "Grant Access Request Rejected",
        message: `Your request to access "${data.propertyTitle}" at ${data.location} has been rejected by admin.${
          data.rejectionReason ? ` Reason: ${data.rejectionReason}` : ""
        }`,
        type: "warning",
        notificationType: "grant_access_rejected",
        relatedEntityType: "Request",
        relatedEntityId: data.grantAccessId,
        actionUrl: `/agent/grant-access/${data.grantAccessId}`,
        actionData: {
          grantAccessId: data.grantAccessId,
          propertyTitle: data.propertyTitle,
          location: data.location,
          rejectionReason: data.rejectionReason,
          rejectedBy: data.rejectedBy,
          notes: data.notes,
        },
      });

      logger.info(
        { agentId: data.agentId, grantAccessId: data.grantAccessId },
        "✅ Agent notified about grant access rejection"
      );
    } catch (error) {
      logger.error(
        { error, agentId: data.agentId, grantAccessId: data.grantAccessId },
        "Failed to notify agent about grant access rejection (non-blocking)"
      );
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
