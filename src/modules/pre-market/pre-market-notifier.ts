// file: src/modules/pre-market/pre-market-notifier.ts

import { env } from "@/env";
import { logger } from "@/middlewares/pino-logger";
import { NotificationService } from "@/modules/notification/notification.service";
import { emailService } from "@/services/email.service";
import { ObjectId } from "mongoose";
import { AgentProfileRepository } from "../agent/agent.repository";
import { IGrantAccessRequest } from "../grant-access/grant-access.model";
import { UserRepository } from "../user/user.repository";
import { IPreMarketNotificationCreateResponse } from "./pre-market-notification.types";
import { IPreMarketRequest } from "./pre-market.model";
import { PreMarketRepository } from "./pre-market.repository";

interface IPreMarketNotificationPayload {
  preMarketRequestId: string;
  title: string;
  location: string;
  serviceType: string;
  renterId: string;
  renterName?: string;
  renterEmail?: string;
  renterPhone?: string;
  listingUrl: string;
}

interface INotificationResult {
  success: boolean;
  agentsNotified: number;
  adminNotified: boolean;
  emailsSent: number;
  errors?: string[];
}

export class PreMarketNotifier {
  private agentRepository = new AgentProfileRepository();
  private notificationService: NotificationService;
  private preMarketRepository = new PreMarketRepository();
  private userRepository = new UserRepository();

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Notify agents and admin about new pre-market request
   * Called immediately after renter creates listing
   */
  async notifyNewRequest(
    preMarketRequest: IPreMarketRequest,
    renterData: {
      renterId: string | ObjectId;
      renterName: string;
      renterEmail: string;
      renterPhone?: string;
    }
  ): Promise<void> {
    try {
      const payload: IPreMarketNotificationPayload = {
        preMarketRequestId: preMarketRequest._id?.toString() || "",
        title: preMarketRequest.requestName || "New Pre-Market Listing",
        location:
          preMarketRequest.locations?.map((l) => l.borough).join(", ") ||
          "Multiple Locations",
        serviceType: "Pre-Market Rental",
        renterId: renterData.renterId.toString(),
        renterName: renterData.renterName,
        renterEmail: renterData.renterEmail,
        renterPhone: renterData.renterPhone,
        listingUrl: `${env.CLIENT_URL}/listings/${preMarketRequest._id}`,
      };

      // // EMAIL notifications
      await this.notifyAgentsAboutNewRequest(payload);
      await this.notifyAdminAboutNewRequest(payload);

      // IN-APP notifications
      await this.createInAppNotifications(preMarketRequest, {
        ...renterData,
        renterId: renterData.renterId.toString(),
      });

      logger.info(
        { preMarketRequestId: preMarketRequest._id },
        "✅ All notifications sent"
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          preMarketRequestId: preMarketRequest._id,
        },
        "Error in notifyNewRequest"
      );

      throw error;
    }
  }

  private async notifyAgentsAboutNewRequest(
    payload: IPreMarketNotificationPayload
  ): Promise<{
    agentsNotified: number;
    emailsSent: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let agentsNotified = 0;
    let emailsSent = 0;

    try {
      const agents = await this.getAllAgents();
      agentsNotified = agents.length;

      logger.debug(
        {
          agentCount: agents.length,
          preMarketRequestId: payload.preMarketRequestId,
        },
        `Found ${agents.length} agents to notify`
      );

      // Send email to each agent (both types get the same email)
      for (const agent of agents) {
        try {
          const emailResult =
            await emailService.sendPreMarketNotificationToAgent({
              to: agent.email,
              agentName: agent.name,
              agentType: agent.hasGrantAccess ? "Grant Access" : "Normal",
              listingTitle: payload.title,
              location: payload.location,
              serviceType: payload.serviceType,
              listingUrl: payload.listingUrl,
            });

          if (emailResult.success) {
            emailsSent++;
            logger.debug(
              { agentId: agent.id, email: agent.email },
              "✅ Agent email sent"
            );
          } else {
            const errorMsg = `Email failed for agent ${agent.id}: ${emailResult.error}`;
            errors.push(errorMsg);
            logger.warn(
              { agentId: agent.id, error: emailResult.error },
              "❌ Agent email failed"
            );
          }
        } catch (error) {
          const errorMsg = `Error notifying agent ${agent.id}: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          logger.error(
            { agentId: agent.id, error },
            "❌ Error during agent notification"
          );
        }
      }

      return { agentsNotified, emailsSent, errors };
    } catch (error) {
      const errorMsg = `Failed to get agents list: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      logger.error({ error }, "❌ Failed to retrieve agents");

      return { agentsNotified: 0, emailsSent: 0, errors };
    }
  }

  private async notifyAdminAboutNewRequest(
    payload: IPreMarketNotificationPayload
  ): Promise<{
    adminNotified: boolean;
    emailsSent: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let emailsSent = 0;

    try {
      // Get admin email from config or database
      const adminEmail = process.env.ADMIN_EMAIL || "admin@beforelisted.com";

      logger.debug(
        { adminEmail, preMarketRequestId: payload.preMarketRequestId },
        "Sending notification to admin with renter info"
      );

      // Send email to admin WITH renter information
      const emailResult = await emailService.sendPreMarketNotificationToAdmin({
        to: adminEmail,
        listingTitle: payload.title,
        location: payload.location,
        serviceType: payload.serviceType,
        renterName: payload.renterName || "Unknown",
        renterEmail: payload.renterEmail || "N/A",
        renterPhone: payload.renterPhone || "N/A",
        listingUrl: payload.listingUrl,
        preMarketRequestId: payload.preMarketRequestId,
      });

      if (emailResult.success) {
        emailsSent++;
        logger.debug(
          { adminEmail, messageId: emailResult.messageId },
          "✅ Admin email sent"
        );
      } else {
        const errorMsg = `Admin email failed: ${emailResult.error}`;
        errors.push(errorMsg);
        logger.warn(
          { adminEmail, error: emailResult.error },
          "❌ Admin email failed"
        );
      }

      return { adminNotified: emailsSent > 0, emailsSent, errors };
    } catch (error) {
      const errorMsg = `Failed to notify admin: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      logger.error({ error }, "❌ Failed to notify admin");

      return { adminNotified: false, emailsSent: 0, errors };
    }
  }

  private async getAllAgents(): Promise<
    Array<{
      id: string;
      name: string;
      email: string;
      hasGrantAccess: boolean;
    }>
  > {
    try {
      const agents = await this.agentRepository.findActiveAgents();

      return agents.map((agent) => ({
        id: agent._id.toString(),
        name: agent.fullName,
        email: agent.email,
        hasGrantAccess: agent.hasGrantAccess || false,
      }));
    } catch (error) {
      logger.error({ error }, "❌ Error fetching agents from database");
      throw error;
    }
  }

  private async getAdmin(): Promise<{
    id: string;
    name: string;
    email: string;
  } | null> {
    try {
      const adminEmail = env.ADMIN_EMAIL;
      const adminName = "Tuval Mor";

      if (!adminEmail) {
        logger.warn("ADMIN_EMAIL not configured in environment");
        return null;
      }

      return {
        id: "admin-001",
        name: adminName,
        email: adminEmail,
      };
    } catch (error) {
      logger.error({ error }, "❌ Error fetching admin information");
      throw error;
    }
  }

  async notifyAdminOfGrantAccessRequest(
    grantAccess: IGrantAccessRequest
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const adminEmail = env.ADMIN_EMAIL || "admin@beforelisted.com";

      logger.info(
        { grantAccessId: grantAccess._id, adminEmail },
        "📧 Sending grant access request notification to admin"
      );

      const emailResult = await emailService.sendGrantAccessRequestToAdmin({
        to: adminEmail,
        grantAccessId: grantAccess._id.toString(),
        agentId: grantAccess.agentId.toString(),
        preMarketRequestId: grantAccess.preMarketRequestId.toString(),
        status: grantAccess.status,
        requestedAt: new Date(
          grantAccess.createdAt || Date.now()
        ).toLocaleString(),
      });

      if (emailResult.success) {
        logger.info(
          { messageId: emailResult.messageId },
          "✅ Grant access request notification sent to admin"
        );
        return { success: true };
      } else {
        logger.warn(
          { error: emailResult.error },
          "Failed to send grant access request notification"
        );
        return { success: false, error: emailResult.error };
      }
    } catch (error) {
      logger.error({ error }, " Error notifying admin of grant access request");
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async notifyAgentOfApproval(
    grantAccess: IGrantAccessRequest,
    isFree: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      
      const agentUser = await this.userRepository.findById(
        grantAccess.agentId.toString()
      );
      if (!agentUser) {
        logger.warn(
          { agentId: grantAccess.agentId },
          "Agent not found for approval notification"
        );
        return { success: false, error: "Agent not found" };
      }

      logger.info(
        { grantAccessId: grantAccess._id, agentEmail: agent.email },
        "📧 Sending approval notification to agent"
      );

      const emailResult = await emailService.sendGrantAccessApprovalToAgent({
        to: agentUser.email,
        agentName: agentUser.fullName || "Agent",
        preMarketRequestId: grantAccess.preMarketRequestId.toString(),
        grantAccessId: grantAccess._id.toString(),
        isFree,
        approvalType: isFree ? "free" : "paid",
        approvalDate: new Date().toLocaleString(),
      });

      if (emailResult.success) {
        logger.info(
          { messageId: emailResult.messageId },
          "✅ Approval notification sent to agent"
        );
        return { success: true };
      } else {
        logger.warn(
          { error: emailResult.error },
          "❌ Failed to send approval notification"
        );
        return { success: false, error: emailResult.error };
      }
    } catch (error) {
      logger.error({ error }, "❌ Error notifying agent of approval");
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async notifyAgentOfRejection(
    grantAccess: IGrantAccessRequest
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const agent = await this.agentRepository.findById(
        grantAccess.agentId.toString()
      );

      if (!agent) {
        logger.warn(
          { agentId: grantAccess.agentId },
          "Agent not found for rejection notification"
        );
        return { success: false, error: "Agent not found" };
      }

      logger.info(
        { grantAccessId: grantAccess._id, agentEmail: agent.email },
        "📧 Sending rejection notification to agent"
      );

      const emailResult = await emailService.sendGrantAccessRejectionToAgent({
        to: agent.email,
        agentName: agent.fullName || agent.name || "Agent",
        preMarketRequestId: grantAccess.preMarketRequestId.toString(),
        grantAccessId: grantAccess._id.toString(),
        rejectionReason:
          grantAccess.adminDecision?.notes || "Request was not approved",
        contactEmail: process.env.ADMIN_EMAIL || "admin@beforelisted.com",
      });

      if (emailResult.success) {
        logger.info(
          { messageId: emailResult.messageId },
          "✅ Rejection notification sent to agent"
        );
        return { success: true };
      } else {
        logger.warn(
          { error: emailResult.error },
          "❌ Failed to send rejection notification"
        );
        return { success: false, error: emailResult.error };
      }
    } catch (error) {
      logger.error({ error }, "❌ Error notifying agent of rejection");
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async sendPaymentLinkToAgent(
    grantAccess: IGrantAccessRequest
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const agent = await this.agentRepository.findById(
        grantAccess.agentId.toString()
      );

      if (!agent) {
        logger.warn(
          { agentId: grantAccess.agentId },
          "Agent not found for payment notification"
        );
        return { success: false, error: "Agent not found" };
      }

      const chargeAmount = grantAccess.payment?.amount || 0;

      logger.info(
        {
          grantAccessId: grantAccess._id,
          agentEmail: agent.email,
          chargeAmount,
        },
        "📧 Sending payment link to agent"
      );

      const emailResult = await emailService.sendPaymentLinkToAgent({
        to: agent.email,
        agentName: agent.fullName || agent.name || "Agent",
        preMarketRequestId: grantAccess.preMarketRequestId.toString(),
        grantAccessId: grantAccess._id.toString(),
        chargeAmount,
        paymentLink: `${process.env.FRONTEND_URL || "https://app.beforelisted.com"}/payment/${grantAccess._id}`,
        paymentDeadline: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toLocaleString(), // 7 days
      });

      if (emailResult.success) {
        logger.info(
          { messageId: emailResult.messageId },
          "✅ Payment link sent to agent"
        );
        return { success: true };
      } else {
        logger.warn(
          { error: emailResult.error },
          "❌ Failed to send payment link"
        );
        return { success: false, error: emailResult.error };
      }
    } catch (error) {
      logger.error({ error }, "❌ Error sending payment link to agent");
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // =============================New methods can be added here============================
  async createInAppNotifications(
    preMarketRequest: IPreMarketRequest,
    renterData: {
      renterId: string;
      renterName: string;
      renterEmail: string;
      renterPhone?: string;
    }
  ): Promise<IPreMarketNotificationCreateResponse> {
    try {
      logger.info(
        { preMarketRequestId: preMarketRequest._id },
        "Creating in-app notifications for new pre-market listing"
      );

      const agentIds = await this.preMarketRepository.getAllActiveAgentIds();

      console.log("+=====================================");
      console.log(agentIds);
      console.log("+=====================================");
      logger.debug({ agentCount: agentIds.length }, "Retrieved active agents");

      const adminId =
        await this.preMarketRepository.getAdminIdForNotification();

      if (!adminId) {
        logger.warn(
          { adminEmail: env.ADMIN_EMAIL },
          "No admin found for notification"
        );
      }

      let agentNotificationsCreated = 0;
      let adminNotificationCreated = false;

      // NOTIFY AGENTS
      if (agentIds.length > 0) {
        try {
          const agentNotificationPromises = agentIds.map((agentId) =>
            this.notificationService.createNotification({
              recipientId: agentId,
              recipientRole: "Agent",
              title: "New Pre-Market Listing Available",
              message: `A new listing "${preMarketRequest.requestName}" was posted in ${preMarketRequest.locations}`,
              type: "info",
              notificationType: "new_pre_market_listing",
              relatedEntityType: "Request",
              relatedEntityId: preMarketRequest._id?.toString(),
              actionUrl: `/listings/${preMarketRequest._id}`,
              actionData: {
                preMarketRequestId: preMarketRequest._id,
                requestId: preMarketRequest.requestId,
                listingTitle: preMarketRequest.requestName,
                location: preMarketRequest.locations,
              },
            })
          );

          await Promise.all(agentNotificationPromises);
          agentNotificationsCreated = agentIds.length;

          logger.info(
            { agentCount: agentNotificationsCreated },
            "✅ Agent notifications created"
          );
        } catch (error) {
          logger.error(
            {
              error: error instanceof Error ? error.message : String(error),
              preMarketRequestId: preMarketRequest._id,
            },
            "Failed to create agent notifications"
          );
        }
      }

      // NOTIFY ADMIN
      if (adminId) {
        try {
          await this.notificationService.createNotification({
            recipientId: adminId,
            recipientRole: "Admin",
            title: "New Pre-Market Listing Available",
            message: `${renterData.renterName} posted "${preMarketRequest.requestName}" in ${preMarketRequest.locations}`,
            type: "alert",
            notificationType: "new_pre_market_listing_admin",
            relatedEntityType: "Request",
            relatedEntityId: preMarketRequest._id!.toString(),
            actionUrl: `/admin/listings/${preMarketRequest._id}`,
            actionData: {
              preMarketRequestId: preMarketRequest._id,
              requestId: preMarketRequest.requestId,
              requestNumber: preMarketRequest.requestNumber,
              listingTitle: preMarketRequest.requestName,
              location: preMarketRequest.locations,
              renterName: renterData.renterName,
              renterEmail: renterData.renterEmail,
              renterPhone: renterData.renterPhone,
              renterId: renterData.renterId,
            },
          });

          adminNotificationCreated = true;

          logger.info({ adminId }, "✅ Admin notification created");
        } catch (error) {
          logger.error(
            {
              error: error instanceof Error ? error.message : String(error),
              preMarketRequestId: preMarketRequest._id,
              adminId,
            },
            "Failed to create admin notification"
          );
        }
      }

      return {
        agentNotificationsCreated,
        adminNotificationCreated,
        success: agentNotificationsCreated > 0 || adminNotificationCreated,
        message:
          `Created ${agentNotificationsCreated} agent notifications` +
          (adminNotificationCreated ? " and 1 admin notification" : ""),
      };
    } catch (error) {
      console.log("Error creating in-app notifications:", error);
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          preMarketRequestId: preMarketRequest._id,
        },
        "❌ Error creating in-app notifications"
      );

      return {
        agentNotificationsCreated: 0,
        adminNotificationCreated: false,
        success: false,
        message: "Failed to create in-app notifications",
      };
    }
  }
}

export const preMarketNotifier = new PreMarketNotifier();
