// file: src/services/email-templates/grant-access-request.template.ts

import { BaseEmailTemplate } from "./base-email-template";

/**
 * Email template for grant access request (Admin notification)
 * Extends BaseEmailTemplate - follows inheritance pattern
 */
export class GrantAccessRequestTemplate extends BaseEmailTemplate {
  private agentName: string;
  private agentEmail: string;
  private agentBrokarage: string | null;
  private preMarketRequestId: string;
  private propertyTitle: string;
  private location: string;
  private requestedAt: string;
  private adminDashboardLink: string;

  constructor(
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
    return `[ADMIN] New Grant Access Request - ${this.propertyTitle}`;
  }

  getEmailPriority(): "high" | "normal" | "low" {
    return "high";
  }

  render(): string {
    this.logRender("GrantAccessRequest");

    const header = this.generateHeader(
      "🔐 New Grant Access Request",
      "Action Required - Review & Approve/Reject"
    );

    const introduction = `
      <div class="section">
        <p>Hello Administrator,</p>
        <p>An agent has requested access to view renter contact information for a pre-market property. Please review the details below and take action.</p>
      </div>
    `;

    const requestDetails = `
      <div class="section">
        <div class="section-title">📋 Request Details</div>
        ${this.generateInfoBox([
          {
            label: "Request ID:",
            value: `<code style="background: #F3F4F6; padding: 2px 6px; border-radius: 3px;">${this.preMarketRequestId}</code>`,
          },
          { label: "Requested At:", value: this.requestedAt },
          { label: "Property:", value: this.propertyTitle },
          { label: "Location:", value: this.location },
        ])}
      </div>
    `;

    const agentInfo = `
      <div class="section">
        <div class="section-title">👤 Agent Information</div>
        ${this.generateInfoBox([
          { label: "Agent Name:", value: this.agentName },
          {
            label: "Email:",
            value: `<a href="mailto:${this.agentEmail}" style="color: ${this.brandColor};">${this.agentEmail}</a>`,
          },
          ...(this.agentBrokarage
            ? [{ label: "Company:", value: this.agentBrokarage }]
            : []),
        ])}
      </div>
    `;

    const actionRequired = `
      <div class="section">
        ${this.generateAlert(
          `<strong>⚠️ You have 3 options:</strong>
           <ul style="margin: 10px 0 0 0; padding-left: 20px;">
             <li><strong>Approve (Free):</strong> Grant immediate access at no cost</li>
             <li><strong>Charge:</strong> Set a price and send payment link to agent</li>
             <li><strong>Reject:</strong> Deny access request</li>
           </ul>`,
          "warning"
        )}
      </div>
    `;

    const cta = this.generateButton(
      "Review in Admin Dashboard",
      this.adminDashboardLink
    );

    const note = `
      <div class="section">
        <p style="font-size: 13px; color: #6B7280;">
          <strong>Note:</strong> If approved, the agent will immediately be able to see renter contact information for this property.
        </p>
      </div>
    `;

    const body =
      introduction + requestDetails + agentInfo + actionRequired + cta + note;

    return this.wrapInHTML(header, body);
  }
}
