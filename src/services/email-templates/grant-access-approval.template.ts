// file: src/services/email-templates/grant-access-approval.template.ts

import { BaseEmailTemplate } from "./base-email-template";

/**
 * Email template for grant access approval (Agent notification)
 */
export class GrantAccessApprovalTemplate extends BaseEmailTemplate {
  private agentName: string;
  private propertyTitle: string;
  private location: string;
  private approvalType: "free" | "paid";
  private chargeAmount: number | null;
  private accessLink: string;

  constructor(
    agentName: string,
    propertyTitle: string,
    location: string,
    approvalType: "free" | "paid",
    chargeAmount: number | null,
    accessLink: string,
    logoUrl: string | undefined,
    brandColor: string = "#1890FF"
  ) {
    super(logoUrl, brandColor);
    this.agentName = agentName;
    this.propertyTitle = propertyTitle;
    this.location = location;
    this.approvalType = approvalType;
    this.chargeAmount = chargeAmount;
    this.accessLink = accessLink;
  }

  getSubject(): string {
    return `✅ Your Access Request Approved - ${this.propertyTitle}`;
  }

  render(): string {
    this.logRender("GrantAccessApproval");

    const approvalTitle =
      this.approvalType === "free"
        ? "🎉 Your Access Request Approved - Free!"
        : "✅ Payment Received - Access Granted!";

    const approvalMessage =
      this.approvalType === "free"
        ? "Your access request has been approved by our admin team at no charge. You now have full access to renter contact information for this property."
        : `Your payment of $${this.chargeAmount?.toFixed(2)} has been received. Thank you! You now have full access to renter contact information.`;

    const header = this.generateHeader(approvalTitle);

    const successBanner =
      this.approvalType === "free"
        ? this.generateAlert(
            "✅ Your access has been approved. No payment required!",
            "success"
          )
        : this.generateAlert(
            "✅ Payment confirmed. Access granted immediately!",
            "success"
          );

    const introduction = `
      <div class="section">
        <p>Hi ${this.agentName},</p>
        <p>${approvalMessage}</p>
      </div>
    `;

    const propertyDetails = `
      <div class="section">
        <div class="section-title">📍 Property Details</div>
        ${this.generateInfoBox([
          { label: "Property:", value: this.propertyTitle },
          { label: "Location:", value: this.location },
        ])}
      </div>
    `;

    const features = `
      <div class="section" style="background: #F8F9FA; padding: 20px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 15px 0; font-weight: 600; color: #1F2937;">You can now access:</p>
        <div style="display: flex; margin: 10px 0;"><span style="color: ${this.brandColor}; margin-right: 10px; font-weight: bold;">✓</span><span>Renter contact information (name, email, phone)</span></div>
        <div style="display: flex; margin: 10px 0;"><span style="color: ${this.brandColor}; margin-right: 10px; font-weight: bold;">✓</span><span>Full property details and specifications</span></div>
        <div style="display: flex; margin: 10px 0;"><span style="color: ${this.brandColor}; margin-right: 10px; font-weight: bold;">✓</span><span>Referrer information</span></div>
        <div style="display: flex; margin: 10px 0;"><span style="color: ${this.brandColor}; margin-right: 10px; font-weight: bold;">✓</span><span>Direct contact with the renter</span></div>
      </div>
    `;

    // const cta = this.generateButton("View Property Details", this.accessLink);

    const note = `
      <div class="section">
        <p style="font-size: 13px; color: #6B7280; margin: 0;">
          This access is permanent for this property. You can reference this information at any time.
        </p>
      </div>
    `;

    const body = successBanner + introduction + propertyDetails + features;

    return this.wrapInHTML(header, body);
  }
}
