// File: src/modules/grant-access/grant-access-notification.service.ts

import { logger } from "@/middlewares/pino-logger";
import { AgentProfileRepository } from "@/modules/agent/agent.repository";
import type { INotification } from "@/modules/notification/notification.interface";
import { NotificationRepository } from "@/modules/notification/notification.repository";
import { PreMarketRepository } from "@/modules/pre-market/pre-market.repository";
import { RenterRepository } from "@/modules/renter/renter.repository";
import { UserRepository } from "@/modules/user/user.repository";

export class GrantAccessNotificationService {
  private userRepository: UserRepository;
  private agentRepository: AgentProfileRepository;
  private renterRepository: RenterRepository;
  private preMarketRepository: PreMarketRepository;
  private notificationRepository: NotificationRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.agentRepository = new AgentProfileRepository();
    this.renterRepository = new RenterRepository();
    this.preMarketRepository = new PreMarketRepository();
    this.notificationRepository = new NotificationRepository();
  }

  /**
   * Create in-app notification when agent requests grant access
   * Only admin receives this notification
   *
   * @param agentId - Agent who requested access
   * @param preMarketRequestId - Pre-market request ID
   * @param grantAccessId - Grant access record ID
   */
  async notifyAdminAboutGrantAccessRequest(
    agentId: string,
    preMarketRequestId: string,
    grantAccessId: string
  ): Promise<void> {
    try {
      const agent = await this.userRepository.findById(agentId);
      if (!agent) {
        logger.warn({ agentId }, "Agent user not found for notification");
        return;
      }

      const agentProfile = await this.agentRepository.findByUserId(agentId);

      // Get pre-market request info
      const preMarketRequest =
        await this.preMarketRepository.findById(preMarketRequestId);
      if (!preMarketRequest) {
        logger.warn({ preMarketRequestId }, "Pre-market request not found");
        return;
      }

      // Get renter info
      let renterName = "Unknown";
      let renterEmail = "";
      const renter = await this.renterRepository.findById(
        preMarketRequest.renterId.toString()
      );
      if (renter) {
        renterName = renter.fullName;
        renterEmail = renter.email;
      }

      // Get location
      const location = preMarketRequest.locations?.[0]?.borough || "Unknown";

      const admins = await this.notificationRepository.getAllAdmins();
      if (admins.length === 0) {
        logger.warn("No admins found for grant access request notification");
        return;
      }

      const notificationPayload = {
        recipientRole: "Admin" as const,
        title: `Grant Access Request from ${agent.fullName}`,
        message: `Agent ${agent.fullName} requested access to view renter information for "${preMarketRequest.requestName}" (${location})`,
        type: "alert" as const,
        relatedEntityType: "Request" as const,
        relatedEntityId: grantAccessId,
        actionUrl: `/admin/grant-access-requests/${grantAccessId}`,
        actionData: {
          agentId,
          agentName: agent.fullName,
          agentEmail: agent.email,
          agentPhone: agent.phoneNumber || "N/A",
          agentCompany: agentProfile?.brokerageName || "N/A",
          agentLicense: agentProfile?.licenseNumber || "N/A",
          propertyTitle: preMarketRequest.requestName,
          renterName,
          renterEmail,
          location,
          requestDate: new Date().toISOString(),
          relatedUserId: agentId,
          relatedPreMarketRequestId: preMarketRequestId,
          relatedGrantAccessId: grantAccessId,
        },
        isRead: false,
      };

      await Promise.all(
        admins.map((admin) =>
          this.notificationRepository.create({
            ...notificationPayload,
            recipientId: admin._id,
          } as Partial<INotification>)
        )
      );

      logger.info(
        { agentId, preMarketRequestId, grantAccessId },
        "✅ Grant access request notification created for admin"
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          agentId,
          preMarketRequestId,
        },
        "Failed to create grant access request notification (non-blocking)"
      );
      // Don't throw - notification failure should not affect main flow
    }
  }

  /**
   * Notify admin when grant access is approved
   */
  async notifyAdminAboutGrantAccessApproved(
    grantAccessId: string,
    agentName: string,
    propertyTitle: string
  ): Promise<void> {
    try {
      const admins = await this.notificationRepository.getAllAdmins();
      if (admins.length === 0) {
        logger.warn("No admins found for grant access approval notification");
        return;
      }

      const notification: Partial<INotification> = {
        recipientRole: "Admin",
        type: "success",
        title: `Grant Access Approved - ${agentName}`,
        message: `You approved grant access for ${agentName} to view "${propertyTitle}"`,
        relatedEntityType: "Request",
        relatedEntityId: grantAccessId,
        actionUrl: `/admin/grant-access-requests/${grantAccessId}`,
        actionData: {
          agentName,
          propertyTitle,
          approvedAt: new Date().toISOString(),
        },
        isRead: false,
      };

      await Promise.all(
        admins.map((admin) =>
          this.notificationRepository.create({
            ...notification,
            recipientId: admin._id,
          })
        )
      );

      logger.info(
        { grantAccessId, agentName },
        "✅ Grant access approved notification created"
      );
    } catch (error) {
      logger.error({ error }, "Failed to create approval notification");
    }
  }

  /**
   * Notify admin when grant access is rejected
   */
  async notifyAdminAboutGrantAccessRejected(
    grantAccessId: string,
    agentName: string,
    propertyTitle: string,
    reason?: string
  ): Promise<void> {
    try {
      const admins = await this.notificationRepository.getAllAdmins();
      if (admins.length === 0) {
        logger.warn("No admins found for grant access rejection notification");
        return;
      }

      const notification: Partial<INotification> = {
        recipientRole: "Admin",
        type: "warning",
        title: `Grant Access Rejected - ${agentName}`,
        message: `You rejected grant access for ${agentName} to view "${propertyTitle}"${
          reason ? `: ${reason}` : ""
        }`,
        relatedEntityType: "Request",
        relatedEntityId: grantAccessId,
        actionUrl: `/admin/grant-access-requests/${grantAccessId}`,
        actionData: {
          agentName,
          propertyTitle,
          reason,
          rejectedAt: new Date().toISOString(),
        },
        isRead: false,
      };

      await Promise.all(
        admins.map((admin) =>
          this.notificationRepository.create({
            ...notification,
            recipientId: admin._id,
          })
        )
      );

      logger.info(
        { grantAccessId, agentName },
        "✅ Grant access rejected notification created"
      );
    } catch (error) {
      logger.error({ error }, "Failed to create rejection notification");
    }
  }
}
