// file: src/services/email.service.notification-methods.ts

import { logger } from "@/middlewares/pino-logger";
import type {
  IPreMarketAdminNotificationPayload,
  IPreMarketAgentNotificationPayload,
} from "@/services/email-notification.types";
import type { IEmailOptions, IEmailResult } from "@/services/email.types";

export async function sendPreMarketNotificationToAgent(
  this: any,
  payload: IPreMarketAgentNotificationPayload
): Promise<IEmailResult> {
  try {
    logger.debug(
      { email: payload.to, agentType: payload.agentType },
      "Sending pre-market notification to agent"
    );

    // Render template - WITHOUT renter info
    const html = this.templates.preMarketAgentNotification(
      payload.agentName,
      payload.listingTitle,
      payload.listingDescription,
      payload.location,
      payload.serviceType,
      payload.listingUrl,
      this.config.logoUrl,
      this.config.brandColor
    );

    // Prepare email options
    const emailOptions: IEmailOptions = {
      to: { email: payload.to, name: payload.agentName },
      subject: `New Pre-Market Listing Opportunity - ${payload.listingTitle}`,
      html,
      priority: "high",
    };

    // Send email
    return await this.sendEmail(
      emailOptions,
      "PRE_MARKET_AGENT_NOTIFICATION",
      payload.to
    );
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        email: payload.to,
      },
      "Failed to send pre-market agent notification"
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
      attempt: 1,
      maxAttempts: this.config.maxRetries,
    };
  }
}

export async function sendPreMarketNotificationToAdmin(
  this: any,
  payload: IPreMarketAdminNotificationPayload
): Promise<IEmailResult> {
  try {
    logger.debug(
      { email: payload.to, preMarketRequestId: payload.preMarketRequestId },
      "Sending pre-market notification to admin with renter info"
    );

    // Render template - WITH renter info
    const html = this.templates.preMarketAdminNotification(
      payload.listingTitle,
      payload.listingDescription,
      payload.location,
      payload.serviceType,
      payload.renterName,
      payload.renterEmail,
      payload.renterPhone,
      payload.listingUrl,
      payload.preMarketRequestId,
      this.config.logoUrl,
      this.config.brandColor
    );

    // Prepare email options
    const emailOptions: IEmailOptions = {
      to: { email: payload.to, name: "Administrator" },
      subject: `[ADMIN] New Pre-Market Request - ${payload.listingTitle}`,
      html,
      priority: "high",
    };

    // Send email
    return await this.sendEmail(
      emailOptions,
      "PRE_MARKET_ADMIN_NOTIFICATION",
      payload.to
    );
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        email: payload.to,
      },
      "Failed to send pre-market admin notification"
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
      attempt: 1,
      maxAttempts: this.config.maxRetries,
    };
  }
}
