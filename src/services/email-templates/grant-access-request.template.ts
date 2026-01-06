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
    return `BeforeListed™ - Match Approval Request`;
  }

  getEmailPriority(): "high" | "normal" | "low" {
    return "high";
  }

  render(): string {
    this.logRender("GrantAccessRequest");

    const header = this.generateHeader(
      "BeforeListed™ - Match Approval Needed",
      "Action Required"
    );

    const introduction = `
      <div class="section">
        <p>Hi ${this.adminName},</p>
        <p>An agent has requested approval to match with a renter request but does not currently have Grant Access enabled.</p>
      </div>
    `;

    const requestDetails = `
      <div class="section">
        <div class="section-title">Details</div>
        ${this.generateInfoBox([
          {
            label: "Renter Request ID:",
            value: `<code style="background: #F3F4F6; padding: 2px 6px; border-radius: 3px;">${this.preMarketRequestId}</code>`,
          },
          { label: "Request Location:", value: this.location },
          { label: "Date & Time:", value: this.requestedAt },
        ])}
      </div>
    `;

    const agentInfo = `
      <div class="section">
        <div class="section-title">Agent</div>
        ${this.generateInfoBox([
          { label: "Agent:", value: this.agentName },
          {
            label: "Agent Email:",
            value: `<a href="mailto:${this.agentEmail}" style="color: ${this.brandColor};">${this.agentEmail}</a>`,
          },
        ])}
      </div>
    `;

    const actionRequired = `
      <div class="section">
        <p>To proceed, please review the request in the Admin Dashboard and either:</p>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>Approve access for this specific request, or</li>
          <li>Enable Grant Access for the agent (if appropriate)</li>
        </ul>
      </div>
    `;

    const cta = this.generateButton(
      "Go to Admin Dashboard",
      this.adminDashboardLink
    );

    const note = `
      <div class="section">
        <p>Until approval is granted, the match will remain pending and the renter will not be notified.</p>
        <p>Thank you,<br><strong>BeforeListed™ System</strong></p>
      </div>
    `;

    const body =
      introduction + requestDetails + agentInfo + actionRequired + cta + note;

    return this.wrapInHTML(header, body);
  }
}
