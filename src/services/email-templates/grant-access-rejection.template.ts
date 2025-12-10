// file: src/services/email-templates/grant-access-rejection.template.ts

import { BaseEmailTemplate } from "./base-email-template";

/**
 * Email template for grant access rejection (Agent notification)
 */
export class GrantAccessRejectionTemplate extends BaseEmailTemplate {
  private agentName: string;
  private propertyTitle: string;
  private rejectionReason: string | null;
  private contactEmail: string;

  constructor(
    agentName: string,
    propertyTitle: string,
    rejectionReason: string | null,
    contactEmail: string,
    logoUrl: string | undefined,
    brandColor: string = "#3B82F6"
  ) {
    super(logoUrl, brandColor);
    this.agentName = agentName;
    this.propertyTitle = propertyTitle;
    this.rejectionReason = rejectionReason;
    this.contactEmail = contactEmail;
  }

  getSubject(): string {
    return `Access Request Update - ${this.propertyTitle}`;
  }

  render(): string {
    this.logRender("GrantAccessRejection");

    const header = this.generateHeader("❌ Access Request Not Approved", "");

    const alert = this.generateAlert(
      "Your access request for this property has been declined.",
      "error"
    );

    const introduction = `
      <div class="section">
        <p>Hi ${this.agentName},</p>
        <p>We regret to inform you that your request to access the renter contact information for this property has not been approved at this time.</p>
      </div>
    `;

    const propertyDetails = `
      <div class="section">
        <div class="section-title">📍 Property</div>
        <div class="info-box">
          <p style="margin: 0;"><strong>${this.propertyTitle}</strong></p>
        </div>
      </div>
    `;

    const reasonSection = this.rejectionReason
      ? `
      <div class="section">
        <div class="section-title">📝 Reason</div>
        <p>${this.rejectionReason}</p>
      </div>
    `
      : "";

    const nextSteps = `
      <div style="background: #DBEAFE; border-left: 4px solid ${this.brandColor}; padding: 15px; margin: 20px 0; border-radius: 4px; color: #1E40AF;">
        <strong>What you can do:</strong>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>Contact us to discuss your request: <a href="mailto:${this.contactEmail}" style="color: #1E40AF;"><strong>${this.contactEmail}</strong></a></li>
          <li>Check if you meet the requirements for access</li>
          <li>Browse other available properties on the platform</li>
        </ul>
      </div>
    `;

    const cta = this.generateButton(
      "Contact Support",
      `mailto:${this.contactEmail}?subject=Grant%20Access%20Request%20Appeal`
    );

    const note = `
      <div class="section">
        <p style="font-size: 13px; color: #6B7280; margin: 0;">
          If you believe this is in error or have questions about the decision, please don't hesitate to reach out to our support team.
        </p>
      </div>
    `;

    const body =
      alert +
      introduction +
      propertyDetails +
      reasonSection +
      nextSteps +
      cta +
      note;

    return this.wrapInHTML(header, body);
  }
}
