// file: src/modules/pre-market/pre-market-notifier.ts

import { env } from "@/env";
import { logger } from "@/middlewares/pino-logger";
import { NotificationService } from "@/modules/notification/notification.service";
import { emailService } from "@/services/email.service";
import { ObjectId } from "mongoose";
import { AgentProfileRepository } from "../agent/agent.repository";
import { IGrantAccessRequest } from "../grant-access/grant-access.model";
import { GrantAccessRepository } from "../grant-access/grant-access.repository";
import { UserRepository } from "../user/user.repository";
import { IPreMarketNotificationCreateResponse } from "./pre-market-notification.types";
import { IPreMarketRequest } from "./pre-market.model";
import { PreMarketRepository } from "./pre-market.repository";

const DEFAULT_REFERRAL_AGENT_EMAIL = "tmor@corcoran.com";
const DEFAULT_REFERRAL_AGENT_NAME = "Tuval";

interface IPreMarketNotificationPayload {
  preMarketRequestId: string;
  requestId: string;
  title: string;
  listingDescription: string;
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
  private grantAccessRepository = new GrantAccessRepository();
  private notificationService: NotificationService;
  private preMarketRepository = new PreMarketRepository();
  private userRepository = new UserRepository();

  constructor() {
    this.notificationService = new NotificationService();
  }

  async notifyNewRequest(
    preMarketRequest: IPreMarketRequest,
    renterData: {
      renterId: string | ObjectId;
      renterName: string;
      renterEmail: string;
      renterPhone?: string;
      referringAgentEmail?: string;
      referringAgentName?: string;
    }
  ): Promise<void> {
    try {
      // Build comprehensive description from request details
      const buildDescription = (request: IPreMarketRequest): string => {
        const parts: string[] = [];

        // Price range
        if (request.priceRange) {
          parts.push(
            `Price: $${request.priceRange.min} - $${request.priceRange.max}`
          );
        }

        // Moving dates
        if (request.movingDateRange) {
          const earliest = new Date(
            request.movingDateRange.earliest
          ).toLocaleDateString();
          const latest = new Date(
            request.movingDateRange.latest
          ).toLocaleDateString();
          parts.push(`Move Date: ${earliest} - ${latest}`);
        }

        // Bedrooms
        if (request.bedrooms && request.bedrooms.length > 0) {
          parts.push(`Bedrooms: ${request.bedrooms.join(", ")}`);
        }

        // Bathrooms
        if (request.bathrooms && request.bathrooms.length > 0) {
          parts.push(`Bathrooms: ${request.bathrooms.join(", ")}`);
        }

        // Locations with neighborhoods
        if (request.locations && request.locations.length > 0) {
          const locParts = request.locations.map(
            (l) =>
              `${l.borough}${l.neighborhoods && l.neighborhoods.length > 0 ? ` (${l.neighborhoods.join(", ")})` : ""}`
          );
          parts.push(`Location: ${locParts.join(", ")}`);
        }

        // Preferences
        if (request.preferences && request.preferences.length > 0) {
          parts.push(`Preferences: ${request.preferences.join(", ")}`);
        }

        return parts.length > 0 ? parts.join(" | ") : "No description provided";
      };

      const payload: IPreMarketNotificationPayload = {
        preMarketRequestId: preMarketRequest._id?.toString() || "",
        requestId: preMarketRequest.requestId || "Unknown",
        title: preMarketRequest.requestName || "New Pre-Market Listing",
        listingDescription: buildDescription(preMarketRequest),
        location:
          preMarketRequest.locations?.map((l) => l.borough).join(", ") ||
          "Multiple Locations",
        serviceType: "Pre-Market Rental Request",
        renterId: renterData.renterId.toString(),
        renterName: renterData.renterName,
        renterEmail: renterData.renterEmail,
        renterPhone: renterData.renterPhone,
        listingUrl: `${env.CLIENT_URL}/listings/${preMarketRequest._id}`,
      };

      await this.notifyAgentsAboutNewRequest(payload);
      await this.notifyAdminAboutNewRequest(payload);
      await this.notifyRenterAboutNewRequest(payload, renterData);
      await this.notifyReferringAgentAboutNewRequest(
        preMarketRequest,
        renterData
      );

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

  async notifyAgentsAboutUpdatedRequest(
    preMarketRequest: IPreMarketRequest,
    changedFields: string[],
    updatedAt: Date
  ): Promise<void> {
    try {
      const recipients = await this.getAgentsWithRenterAccess(
        preMarketRequest._id?.toString() || ""
      );

      if (recipients.length === 0) {
        logger.info(
          { preMarketRequestId: preMarketRequest._id },
          "No agents with renter access to notify about request update"
        );
        return;
      }

      const formattedUpdatedAt = this.formatEasternTime(updatedAt);
      const requestId =
        preMarketRequest.requestId || preMarketRequest._id?.toString() || "";
      const normalizedFields =
        changedFields.length > 0 ? changedFields : ["Request details updated"];

      for (const recipient of recipients) {
        const emailResult =
          await emailService.sendPreMarketRequestUpdatedNotificationToAgent({
            to: recipient.email,
            agentName: recipient.name,
            requestId,
            updatedFields: normalizedFields,
            updatedAt: formattedUpdatedAt,
          });

        if (emailResult.success) {
          logger.debug(
            { email: recipient.email, requestId },
            "? Agent update notification sent"
          );
        } else {
          const errorMessage =
            emailResult.error instanceof Error
              ? emailResult.error.message
              : String(emailResult.error);
          logger.warn(
            { email: recipient.email, error: errorMessage },
            "? Agent update notification failed"
          );
        }
      }
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          preMarketRequestId: preMarketRequest._id,
        },
        "Failed to notify agents about request update"
      );
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

      for (const agent of agents) {
        try {
          const emailResult =
          await emailService.sendPreMarketNotificationToAgent({
            to: agent.email,
            agentName: agent.name,
            agentType: agent.hasGrantAccess ? "Grant Access" : "Normal",
            listingTitle: payload.title,
            listingDescription: payload.listingDescription,
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
      const adminEmail = process.env.ADMIN_EMAIL || "admin@beforelisted.com";

      logger.debug(
        { adminEmail, preMarketRequestId: payload.preMarketRequestId },
        "Sending notification to admin with renter info"
      );

      const emailResult = await emailService.sendPreMarketNotificationToAdmin({
        to: adminEmail,
        listingTitle: payload.title,
        listingDescription: payload.listingDescription,
        location: payload.location,
        serviceType: payload.serviceType,
        renterName: payload.renterName || "Unknown",
        renterEmail: payload.renterEmail || "N/A",
        renterPhone: payload.renterPhone || "N/A",
        listingUrl: payload.listingUrl,
        preMarketRequestId: payload.preMarketRequestId,
        requestId: payload.requestId,
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

  private async notifyRenterAboutNewRequest(
    payload: IPreMarketNotificationPayload,
    renterData: {
      renterName: string;
      renterEmail: string;
      referringAgentEmail?: string;
      referringAgentName?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const emailResult =
        await emailService.sendPreMarketRequestConfirmationToRenter({
          to: renterData.renterEmail,
          renterName: renterData.renterName,
        });

      if (emailResult.success) {
        logger.debug(
          { email: renterData.renterEmail, requestId: payload.requestId },
          "? Renter confirmation email sent"
        );
        return { success: true };
      }

      const errorMessage =
        emailResult.error instanceof Error
          ? emailResult.error.message
          : String(emailResult.error);
      logger.warn(
        { email: renterData.renterEmail, error: errorMessage },
        "? Renter confirmation email failed"
      );

      return { success: false, error: errorMessage };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        { error: errorMessage, email: renterData.renterEmail },
        "? Failed to send renter confirmation email"
      );
      return { success: false, error: errorMessage };
    }
  }

  private async notifyReferringAgentAboutNewRequest(
    preMarketRequest: IPreMarketRequest,
    renterData: {
      renterName: string;
      renterEmail: string;
      referringAgentEmail?: string;
      referringAgentName?: string;
    }
  ): Promise<void> {
    try {
      const agentEmail =
        renterData.referringAgentEmail || DEFAULT_REFERRAL_AGENT_EMAIL;
      const agentName =
        renterData.referringAgentName || DEFAULT_REFERRAL_AGENT_NAME;
      const shouldNotify = await this.isAgentEmailSubscriptionEnabledByEmail(
        agentEmail
      );
      if (!shouldNotify) {
        logger.info(
          { email: agentEmail },
          "Agent email subscription disabled; skipping referral notification"
        );
        return;
      }
      const requestId =
        preMarketRequest.requestId || preMarketRequest._id?.toString() || "";
      const borough = this.formatBorough(preMarketRequest.locations);
      const bedrooms = this.formatBedrooms(preMarketRequest.bedrooms);
      const maxRent = this.formatMaxRent(preMarketRequest.priceRange?.max);
      const submittedAt = this.formatEasternTime(
        new Date(preMarketRequest.createdAt ?? Date.now())
      );

      const emailResult =
        await emailService.sendRenterRequestConfirmationToAgent({
          to: agentEmail,
          agentName,
          requestId,
          borough,
          bedrooms,
          maxRent,
          submittedAt,
        });

      if (emailResult.success) {
        logger.debug(
          { email: agentEmail, requestId },
          "? Referring agent request confirmation sent"
        );
        return;
      }

      const errorMessage =
        emailResult.error instanceof Error
          ? emailResult.error.message
          : String(emailResult.error);
      logger.warn(
        { email: agentEmail, error: errorMessage },
        "? Referring agent request confirmation failed"
      );
    } catch (error) {
      logger.error(
        { error, preMarketRequestId: preMarketRequest._id },
        "? Failed to notify referring agent about new request"
      );
    }
  }

  private async getAgentsWithRenterAccess(
    preMarketRequestId: string
  ): Promise<Array<{ name: string; email: string }>> {
    const recipients = new Map<string, { name: string; email: string }>();

    const grantAccessAgents = await this.agentRepository.findActiveAgents();
    for (const agent of grantAccessAgents) {
      if (!agent.hasGrantAccess || !agent.email) {
        continue;
      }
      const name = agent.fullName || agent.email;
      recipients.set(agent.email.toLowerCase(), {
        name,
        email: agent.email,
      });
    }

    const accessRecords =
      await this.grantAccessRepository.findByPreMarketRequestId(
        preMarketRequestId
      );
    const eligibleAgentIds = Array.from(
      new Set(
        accessRecords
          .filter(
            (record) => record.status === "free" || record.status === "paid"
          )
          .map((record) => record.agentId.toString())
      )
    );

    for (const agentId of eligibleAgentIds) {
      const agentProfile = await this.agentRepository.findByUserId(agentId);
      if (!agentProfile) {
        continue;
      }

      if (agentProfile.isActive === false) {
        continue;
      }

      if (agentProfile.emailSubscriptionEnabled === false) {
        continue;
      }

      const userInfo = agentProfile.userId as {
        fullName?: string;
        email?: string;
      };
      const email = userInfo?.email;
      if (!email) {
        continue;
      }

      const name = userInfo?.fullName || email;
      const key = email.toLowerCase();
      if (!recipients.has(key)) {
        recipients.set(key, { name, email });
      }
    }

    return Array.from(recipients.values());
  }

  private formatEasternTime(value: Date): string {
    return value.toLocaleString("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
  }

  private formatBorough(locations?: Array<{ borough?: string }>): string {
    if (!locations || locations.length === 0) {
      return "Not specified";
    }

    const boroughs = Array.from(
      new Set(
        locations
          .map((location) => location.borough?.trim())
          .filter((borough): borough is string => Boolean(borough))
      )
    );

    return boroughs.length > 0 ? boroughs.join(", ") : "Not specified";
  }

  private formatBedrooms(bedrooms?: string[]): string {
    if (!bedrooms || bedrooms.length === 0) {
      return "Any";
    }

    return bedrooms.join(", ");
  }

  private formatMaxRent(maxRent?: number): string {
    if (!maxRent && maxRent !== 0) {
      return "Not specified";
    }

    return `$${Number(maxRent).toLocaleString("en-US")}`;
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

  private async isAgentEmailSubscriptionEnabledByEmail(
    agentEmail: string
  ): Promise<boolean> {
    if (!agentEmail) {
      return false;
    }

    const agentUser = await this.userRepository.findByEmail(agentEmail);
    if (!agentUser) {
      return true;
    }

    const agentProfile = await this.agentRepository.findByUserId(
      agentUser._id.toString()
    );
    if (!agentProfile) {
      return true;
    }

    return agentProfile.emailSubscriptionEnabled !== false;
  }

  async notifyAdminOfGrantAccessRequest(
    grantAccess: IGrantAccessRequest
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const adminInfo = await this.getAdmin();
      const adminEmail =
        adminInfo?.email || env.ADMIN_EMAIL || "admin@beforelisted.com";
      const adminName = adminInfo?.name || "Admin";
      const agentUser = await this.userRepository.findById(
        grantAccess.agentId.toString()
      );
      const agentProfile = await this.agentRepository.findByUserId(
        grantAccess.agentId.toString()
      );

      if (!agentUser) {
        logger.warn(
          { agentId: grantAccess.agentId },
          "Agent not found for admin notification"
        );
        return { success: false, error: "Agent not found" };
      }

      const preMarketRequest = await this.preMarketRepository.findById(
        grantAccess.preMarketRequestId.toString()
      );

      if (!preMarketRequest) {
        logger.warn(
          { preMarketRequestId: grantAccess.preMarketRequestId },
          "Pre-market request not found for admin notification"
        );
        return { success: false, error: "Pre-market request not found" };
      }

      const propertyTitle =
        preMarketRequest.requestName || "Pre-Market Listing";
      const location =
        preMarketRequest.locations
          ?.map((l) => l.borough)
          .filter(Boolean)
          .join(", ") || "Multiple Locations";

      logger.info(
        { grantAccessId: grantAccess._id, adminEmail },
        "📧 Sending grant access request notification to admin"
      );

      const emailResult = await emailService.sendGrantAccessRequestToAdmin({
        to: adminEmail,
        adminName,
        agentName: agentUser.fullName || "Agent",
        agentEmail: agentUser.email,
        agentCompany: agentProfile?.brokerageName || null,
        preMarketRequestId: grantAccess.preMarketRequestId.toString(),
        propertyTitle,
        location,
        requestedAt: this.formatEasternTime(
          new Date(grantAccess.createdAt || Date.now())
        ),
        adminDashboardLink: `${env.CLIENT_URL}/admin/pre-market/${preMarketRequest._id}?grantAccessId=${grantAccess._id}`,
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
        const errorMessage =
          emailResult.error instanceof Error
            ? emailResult.error.message
            : emailResult.error;
        return { success: false, error: errorMessage };
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
      const agentProfile = await this.agentRepository.findByUserId(
        grantAccess.agentId.toString()
      );
      if (!agentUser) {
        logger.warn(
          { agentId: grantAccess.agentId },
          "Agent not found for approval notification"
        );
        return { success: false, error: "Agent not found" };
      }

      if (agentProfile?.emailSubscriptionEnabled === false) {
        logger.info(
          { agentId: grantAccess.agentId, email: agentUser.email },
          "Agent email subscription disabled; skipping approval notification"
        );
        return { success: true };
      }

      const preMarketRequest = await this.preMarketRepository.findById(
        grantAccess.preMarketRequestId.toString()
      );

      if (!preMarketRequest) {
        logger.warn(
          { preMarketRequestId: grantAccess.preMarketRequestId },
          "Pre-market request not found for approval notification"
        );
        return { success: false, error: "Pre-market request not found" };
      }

      const propertyTitle =
        preMarketRequest.requestName || "Pre-Market Listing";
      const location =
        preMarketRequest.locations
          ?.map((l) => l.borough)
          .filter(Boolean)
          .join(", ") || "Multiple Locations";
      const accessLink = `${env.CLIENT_URL}/listings/${preMarketRequest._id}`;
      const chargeAmount = grantAccess.adminDecision?.chargeAmount;

      logger.info(
        { grantAccessId: grantAccess._id, agentEmail: agentUser.email },
        "📧 Sending approval notification to agent"
      );

      const emailResult = await emailService.sendGrantAccessApprovalToAgent({
        to: agentUser.email,
        agentName: agentUser.fullName || "Agent",
        isFree,
        chargeAmount,
        propertyTitle,
        location,
        accessLink,
      });

      if (emailResult.success) {
        logger.info(
          { messageId: emailResult.messageId },
          "✅ Approval notification sent to agent"
        );
        return { success: true };
      } else {
        const errorMessage =
          emailResult.error instanceof Error
            ? emailResult.error.message
            : emailResult.error;
        logger.warn(
          { error: emailResult.error },
          "❌ Failed to send approval notification"
        );
        return { success: false, error: errorMessage };
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
      const agentProfile = await this.agentRepository.findByUserId(
        grantAccess.agentId.toString()
      );
      const agentUser = await this.userRepository.findById(
        grantAccess.agentId.toString()
      );

      if (!agentProfile || !agentUser) {
        logger.warn(
          { agentId: grantAccess.agentId },
          "Agent not found for rejection notification"
        );
        return { success: false, error: "Agent not found" };
      }

      if (agentProfile.emailSubscriptionEnabled === false) {
        logger.info(
          { agentId: grantAccess.agentId, email: agentUser.email },
          "Agent email subscription disabled; skipping rejection notification"
        );
        return { success: true };
      }

      const preMarketRequest = await this.preMarketRepository.findById(
        grantAccess.preMarketRequestId.toString()
      );

      if (!preMarketRequest) {
        logger.warn(
          { preMarketRequestId: grantAccess.preMarketRequestId },
          "Pre-market request not found for rejection notification"
        );
        return { success: false, error: "Pre-market request not found" };
      }

      const propertyTitle =
        preMarketRequest.requestName || "Pre-Market Listing";

      logger.info(
        { grantAccessId: grantAccess._id, agentEmail: agentUser.email },
        "📧 Sending rejection notification to agent"
      );

      const emailResult = await emailService.sendGrantAccessRejectionToAgent({
        to: agentUser.email,
        agentName: agentUser.fullName || "Agent",
        propertyTitle,
        rejectionReason:
          grantAccess.adminDecision?.notes || "Request was not free",
        contactEmail: process.env.ADMIN_EMAIL || "admin@beforelisted.com",
      });

      if (emailResult.success) {
        logger.info(
          { messageId: emailResult.messageId },
          "✅ Rejection notification sent to agent"
        );
        return { success: true };
      } else {
        const errorMessage =
          emailResult.error instanceof Error
            ? emailResult.error.message
            : emailResult.error;
        logger.warn(
          { error: emailResult.error },
          "❌ Failed to send rejection notification"
        );
        return { success: false, error: errorMessage };
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
      const agentProfile = await this.agentRepository.findByUserId(
        grantAccess.agentId.toString()
      );
      const agentUser = await this.userRepository.findById(
        grantAccess.agentId.toString()
      );

      if (!agentProfile || !agentUser) {
        logger.warn(
          { agentId: grantAccess.agentId },
          "Agent not found for payment notification"
        );
        return { success: false, error: "Agent not found" };
      }

      if (agentProfile.emailSubscriptionEnabled === false) {
        logger.info(
          { agentId: grantAccess.agentId, email: agentUser.email },
          "Agent email subscription disabled; skipping payment link"
        );
        return { success: true };
      }

      const preMarketRequest = await this.preMarketRepository.findById(
        grantAccess.preMarketRequestId.toString()
      );

      if (!preMarketRequest) {
        logger.warn(
          { preMarketRequestId: grantAccess.preMarketRequestId },
          "Pre-market request not found for payment notification"
        );
        return { success: false, error: "Pre-market request not found" };
      }

      const propertyTitle =
        preMarketRequest.requestName || "Pre-Market Listing";
      const chargeAmount = grantAccess.payment?.amount || 0;

      logger.info(
        {
          grantAccessId: grantAccess._id,
          agentEmail: agentUser.email,
          chargeAmount,
        },
        "📧 Sending payment link to agent"
      );

      const emailResult = await emailService.sendPaymentLinkToAgent({
        to: agentUser.email,
        agentName: agentUser.fullName || "Agent",
        propertyTitle,
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
        const errorMessage =
          emailResult.error instanceof Error
            ? emailResult.error.message
            : emailResult.error;
        logger.warn(
          { error: emailResult.error },
          "❌ Failed to send payment link"
        );
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      logger.error({ error }, "❌ Error sending payment link to agent");
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async createInAppNotifications(
    preMarketRequest: IPreMarketRequest,
    renterData: {
      renterId: string;
      renterName: string;
      renterEmail: string;
      renterPhone?: string;
      referringAgentEmail?: string;
      referringAgentName?: string;
    }
  ): Promise<IPreMarketNotificationCreateResponse> {
    try {
      logger.info(
        { preMarketRequestId: preMarketRequest._id },
        "Creating in-app notifications for new pre-market listing"
      );

      const agentIds = await this.preMarketRepository.getAllActiveAgentIds();

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
