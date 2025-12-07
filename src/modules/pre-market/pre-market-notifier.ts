// file: src/modules/pre-market/pre-market-notifier.ts

import { logger } from "@/middlewares/pino-logger";
import { emailService } from "@/services/email.service";
import { AgentProfileRepository } from "../agent/agent.repository";

// ============================================
// NOTIFICATION TYPES
// ============================================

interface IPreMarketNotificationPayload {
  preMarketRequestId: string;
  title: string;
  description: string;
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

// ============================================
// PRE-MARKET NOTIFIER SERVICE
// ============================================

export class PreMarketNotifier {
  private agentRepository = new AgentProfileRepository();
  /**
   * Notify agents and admin about new pre-market request
   * Called immediately after renter creates listing
   *
   * @param payload - Pre-market notification data
   * @returns Promise with notification results
   */
  async notifyNewRequest(
    payload: IPreMarketNotificationPayload
  ): Promise<INotificationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let agentsNotified = 0;
    let adminNotified = false;
    let emailsSent = 0;

    try {
      logger.info(
        { preMarketRequestId: payload.preMarketRequestId },
        "🔔 Starting notification process for new pre-market request"
      );

      // ============================================
      // 1. NOTIFY ALL AGENTS (Both types)
      // ============================================
      try {
        const agentNotificationResult =
          await this.notifyAgentsAboutNewRequest(payload);
        agentsNotified = agentNotificationResult.agentsNotified;
        emailsSent += agentNotificationResult.emailsSent;

        if (agentNotificationResult.errors.length > 0) {
          errors.push(...agentNotificationResult.errors);
        }

        logger.info(
          {
            preMarketRequestId: payload.preMarketRequestId,
            agentsNotified,
            emailsSent: agentNotificationResult.emailsSent,
          },
          "✅ Agents notified successfully"
        );
      } catch (error) {
        const errorMsg = `Agent notification failed: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        logger.error(
          { error, preMarketRequestId: payload.preMarketRequestId },
          "❌ Agent notification error"
        );
      }

      // ============================================
      // 2. NOTIFY ADMIN (With full renter info)
      // ============================================
      try {
        const adminNotificationResult =
          await this.notifyAdminAboutNewRequest(payload);
        adminNotified = adminNotificationResult.adminNotified;
        emailsSent += adminNotificationResult.emailsSent;

        if (adminNotificationResult.errors.length > 0) {
          errors.push(...adminNotificationResult.errors);
        }

        logger.info(
          {
            preMarketRequestId: payload.preMarketRequestId,
            adminNotified,
          },
          "✅ Admin notified successfully"
        );
      } catch (error) {
        const errorMsg = `Admin notification failed: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        logger.error(
          { error, preMarketRequestId: payload.preMarketRequestId },
          "❌ Admin notification error"
        );
      }

      const duration = Date.now() - startTime;

      logger.info(
        {
          preMarketRequestId: payload.preMarketRequestId,
          agentsNotified,
          adminNotified,
          emailsSent,
          duration: `${duration}ms`,
          errorCount: errors.length,
        },
        "📊 Notification process completed"
      );

      return {
        success: errors.length === 0,
        agentsNotified,
        adminNotified,
        emailsSent,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      logger.error(
        {
          error,
          preMarketRequestId: payload.preMarketRequestId,
        },
        "❌ Critical error in notification process"
      );

      return {
        success: false,
        agentsNotified: 0,
        adminNotified: false,
        emailsSent: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  // ============================================
  // PRIVATE: NOTIFY AGENTS
  // ============================================

  /**
   * Send notifications to all agents (both Grant Access + Normal)
   * WITHOUT renter information
   */
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
      // Get all agents from database
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
              listingDescription: payload.description,
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

  // ============================================
  // PRIVATE: NOTIFY ADMIN
  // ============================================

  /**
   * Send notification to admin with full renter information
   */
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
        listingDescription: payload.description,
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

  // ============================================
  // PRIVATE: DATABASE QUERIES
  // ============================================

  /**
   * Get all agents from database
   * Returns both Grant Access and Normal agents
   */
  private async getAllAgents(): Promise<
    Array<{
      id: string;
      name: string;
      email: string;
      hasGrantAccess: boolean;
    }>
  > {
    try {
      const agents = await this.agentRepository.find({
        // Optional: filter for active agents
        // status: "ACTIVE"
      });

      return agents.map((agent) => ({
        id: agent._id.toString(),
        name: agent.fullName || agent.name,
        email: agent.email,
        hasGrantAccess: agent.hasGrantAccess || false,
      }));
    } catch (error) {
      logger.error({ error }, "❌ Error fetching agents from database");
      throw error;
    }
  }

  /**
   * Get admin information
   */
  private async getAdmin(): Promise<{
    id: string;
    name: string;
    email: string;
  } | null> {
    try {
      // TODO: Implement actual admin retrieval
      // For now, using environment variable

      const adminEmail = process.env.ADMIN_EMAIL;
      const adminName = process.env.ADMIN_NAME || "Administrator";

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
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const preMarketNotifier = new PreMarketNotifier();
