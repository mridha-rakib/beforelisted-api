// file: src/services/email-templates/email-template.factory.ts

import { logger } from "@/middlewares/pino-logger";
import { BaseEmailTemplate } from "./base-email-template";
import { GrantAccessApprovalTemplate } from "./grant-access-approval.template";
import { GrantAccessRejectionTemplate } from "./grant-access-rejection.template";
import { GrantAccessRequestTemplate } from "./grant-access-request.template";
import { PaymentLinkTemplate } from "./payment-link.template";

/**
 * Factory for creating email template instances
 * Provides centralized template creation and management
 * Follows same pattern as your services
 */
export class EmailTemplateFactory {
  private logoUrl: string | undefined;
  private brandColor: string;

  constructor(logoUrl: string | undefined, brandColor: string = "#3B82F6") {
    this.logoUrl = logoUrl;
    this.brandColor = brandColor;
  }

  /**
   * Create grant access request template (Admin notification)
   */
  createGrantAccessRequest(
    agentName: string,
    agentEmail: string,
    agentCompany: string | null,
    preMarketRequestId: string,
    propertyTitle: string,
    location: string,
    requestedAt: string,
    adminDashboardLink: string
  ): BaseEmailTemplate {
    return new GrantAccessRequestTemplate(
      agentName,
      agentEmail,
      agentCompany,
      preMarketRequestId,
      propertyTitle,
      location,
      requestedAt,
      adminDashboardLink,
      this.logoUrl,
      this.brandColor
    );
  }

  /**
   * Create grant access approval template (Agent notification)
   */
  createGrantAccessApproval(
    agentName: string,
    propertyTitle: string,
    location: string,
    approvalType: "free" | "paid",
    chargeAmount: number | null,
    accessLink: string
  ): BaseEmailTemplate {
    return new GrantAccessApprovalTemplate(
      agentName,
      propertyTitle,
      location,
      approvalType,
      chargeAmount,
      accessLink,
      this.logoUrl,
      this.brandColor
    );
  }

  /**
   * Create grant access rejection template (Agent notification)
   */
  createGrantAccessRejection(
    agentName: string,
    propertyTitle: string,
    rejectionReason: string | null,
    contactEmail: string
  ): BaseEmailTemplate {
    return new GrantAccessRejectionTemplate(
      agentName,
      propertyTitle,
      rejectionReason,
      contactEmail,
      this.logoUrl,
      this.brandColor
    );
  }

  /**
   * Create payment link template (Agent notification)
   */
  createPaymentLink(
    agentName: string,
    propertyTitle: string,
    chargeAmount: number,
    paymentLink: string,
    paymentDeadline: string
  ): BaseEmailTemplate {
    return new PaymentLinkTemplate(
      agentName,
      propertyTitle,
      chargeAmount,
      paymentLink,
      paymentDeadline,
      this.logoUrl,
      this.brandColor
    );
  }

  /**
   * Update branding (useful for multi-tenant scenarios)
   */
  updateBranding(logoUrl: string | undefined, brandColor: string): void {
    this.logoUrl = logoUrl;
    this.brandColor = brandColor;
    logger.info(
      { logoUrl, brandColor },
      "Email template factory branding updated"
    );
  }
}
