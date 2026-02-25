// file: src/services/email-templates/grant-access-request.template.ts

import { BaseEmailTemplate } from "./base-email-template";

/**
 * Email template for grant access request (Admin notification)
 * Extends BaseEmailTemplate - follows inheritance pattern
 */
export class GrantAccessRequestTemplate extends BaseEmailTemplate {
  private adminName: string;
  private agentName: string;
  private agentEmail: string;
  private agentBrokarage: string | null;
  private preMarketRequestId: string;
  private propertyTitle: string;
  private location: string;
  private requestedAt: string;
  private adminDashboardLink: string;

  constructor(
    adminName: string,
    agentName: string,
    agentEmail: string,
    agentBrokarage: string | null,
    preMarketRequestId: string,
    propertyTitle: string,
    location: string,
    requestedAt: string,
    adminDashboardLink: string,
    logoUrl: string | undefined,
    brandColor: string = "#1890FF"
  ) {
    super(logoUrl, brandColor);
    this.adminName = adminName;
    this.agentName = agentName;
    this.agentEmail = agentEmail;
    this.agentBrokarage = agentBrokarage;
    this.preMarketRequestId = preMarketRequestId;
    this.propertyTitle = propertyTitle;
    this.location = location;
    this.requestedAt = requestedAt;
    this.adminDashboardLink = adminDashboardLink;
  }

  getSubject(): string {
    return `Action required: agent match request pending approval | BeforeListed™`;
  }

  getEmailPriority(): "high" | "normal" | "low" {
    return "high";
  }

  render(): string {
    this.logRender("GrantAccessRequest");

    const header = this.generateHeader(
      "Agent Match Request Pending Approval",
      "Action Required"
    );

    const adminFirstName = this.adminName?.trim().split(" ")[0] || this.adminName;
    const safeAdminName = adminFirstName || "Tuval";

    const introduction = `
      <div class="section">
        <p>Hi ${safeAdminName},</p>
        <p>An agent has attempted to submit a match for a renter request; however, Grant Access is not currently enabled for this agent.</p>
      </div>
    `;

    const details = `
      <div class="section">
        <div class="section-title">Details</div>
        ${this.generateInfoBox([
          {
            label: "Agent:",
            value: `${this.agentName} (<a href="mailto:${this.agentEmail}" style="color: ${this.brandColor};">${this.agentEmail}</a>)`,
          },
          {
            label: "Renter Request ID:",
            value: `<code style="background: #F3F4F6; padding: 2px 6px; border-radius: 3px;">${this.preMarketRequestId}</code>`,
          },
          { label: "Request Location:", value: this.location },
          { label: "Date & Time:", value: this.requestedAt },
        ])}
      </div>
    `;

    const actionRequired = `
      <div class="section">
        <div class="section-title">Next steps</div>
        <p>Please review the request in the Admin Dashboard and take one of the following actions:</p>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>Approve access for this specific request, or</li>
          <li>Enable Grant Access for the agent, if appropriate</li>
        </ul>
        <p style="margin-top: 16px;">Admin Dashboard: <a href="${this.adminDashboardLink}" style="color: ${this.brandColor};">${this.adminDashboardLink}</a></p>
      </div>
    `;

    const note = `
      <div class="section">
        <p>Until approval is granted, the match will remain pending and the renter will not be notified.</p>
        <p>Thank you,<br><strong>BeforeListed&trade; Support</strong></p>
      </div>
    `;

    const body =
      introduction + details + actionRequired + note;

    return this.wrapInHTML(header, body);
  }
}
