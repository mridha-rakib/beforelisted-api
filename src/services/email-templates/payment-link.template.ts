// file: src/services/email-templates/payment-link.template.ts

import { BaseEmailTemplate } from "./base-email-template";

/**
 * Email template for payment link (Agent notification)
 */
export class PaymentLinkTemplate extends BaseEmailTemplate {
  private agentName: string;
  private propertyTitle: string;
  private chargeAmount: number;
  private paymentLink: string;
  private paymentDeadline: string;

  constructor(
    agentName: string,
    propertyTitle: string,
    chargeAmount: number,
    paymentLink: string,
    paymentDeadline: string,
    logoUrl: string | undefined,
    brandColor: string = "#1890FF"
  ) {
    super(logoUrl, brandColor);
    this.agentName = agentName;
    this.propertyTitle = propertyTitle;
    this.chargeAmount = chargeAmount;
    this.paymentLink = paymentLink;
    this.paymentDeadline = paymentDeadline;
  }

  getSubject(): string {
    return `💳 Complete Payment for Property Access - ${this.propertyTitle}`;
  }

  getEmailPriority(): "high" | "normal" | "low" {
    return "high";
  }

  render(): string {
    this.logRender("PaymentLink");

    const header = this.generateHeader(
      "💳 Complete Payment to Access Property"
    );

    const priceBox = `
      <div style="background: ${this.brandColor}; padding: 25px; border-radius: 8px; text-align: center; margin: 20px 0; color: white;">
        <p style="margin: 0; font-size: 14px; opacity: 0.9;">Amount Due</p>
        <div style="font-size: 48px; font-weight: bold; margin: 10px 0;">
          <span style="font-size: 24px; opacity: 0.9;">$</span>${this.chargeAmount.toFixed(2)}
        </div>
        <p style="margin: 15px 0 0 0; font-size: 14px; opacity: 0.95;">One-time payment for this property</p>
      </div>
    `;

    const introduction = `
      <div class="section">
        <p>Hi ${this.agentName},</p>
        <p>Your access request for the property below has been approved, pending payment. Complete the payment below to instantly access renter contact information.</p>
      </div>
    `;

    const propertySection = `
      <div class="section">
        <div class="section-title">📍 Property</div>
        ${this.generateInfoBox([
          { label: "Property:", value: this.propertyTitle },
          { label: "Payment Due:", value: this.paymentDeadline },
        ])}
      </div>
    `;

    // const cta = `
    //   <div class="button-container">
    //     <a href="${this.paymentLink}" class="button" style="background: ${this.brandColor};">Pay Now & Access Property →</a>
    //     <div style="background: #ECFDF5; padding: 10px 15px; border-radius: 4px; color: #047857; font-size: 12px; display: inline-block; margin: 10px 0;">🔒 Secure payment powered by Stripe</div>
    //   </div>
    // `;

    const warning = this.generateAlert(
      `<strong>⏰ Important:</strong> Please complete payment by ${this.paymentDeadline} to secure your access. After this date, you may need to submit a new request.`,
      "warning"
    );

    const benefits = `
      <div class="section">
        <div class="section-title">✅ After Payment You'll Get:</div>
        <ul style="margin: 15px 0; padding-left: 20px;">
          <li>Renter name, email, and phone number</li>
          <li>Full property details and specifications</li>
          <li>Referrer information and contact details</li>
          <li>Immediate access to view all details</li>
        </ul>
      </div>
    `;

    const tip = `
      <div style="background: #F0F9FF; padding: 15px; border-radius: 6px; border-left: 4px solid ${this.brandColor};">
        <p style="margin: 0; font-size: 13px; color: #0C4A6E;">
          <strong>💡 Tip:</strong> This is a secure Stripe payment. Your payment information is encrypted and protected.
        </p>
      </div>
    `;

    const body =
      priceBox +
      introduction +
      propertySection +
      // cta +
      warning +
      benefits +
      tip;

    return this.wrapInHTML(header, body);
  }
}
