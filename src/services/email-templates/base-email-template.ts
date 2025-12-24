// file: src/services/email-templates/base-email-template.ts

import { logger } from "@/middlewares/pino-logger";

/**
 * Abstract base class for all email templates
 * Provides common functionality, logging, and utilities
 * Follows same pattern as AgentService, UserService, etc.
 */
export abstract class BaseEmailTemplate {
  protected logoUrl: string | undefined;
  protected brandColor: string;
  protected brandName: string = "BeforeListed";

  constructor(logoUrl: string | undefined, brandColor: string = "#1890FF") {
    this.logoUrl = logoUrl;
    this.brandColor = brandColor;
  }

  /**
   * Abstract method - must be implemented by subclasses
   */
  abstract render(): string;

  /**
   * Get email subject
   */
  abstract getSubject(): string;

  /**
   * Get email priority
   */
  getEmailPriority(): "high" | "normal" | "low" {
    return "normal";
  }

  /**
   * Generate header HTML with logo
   */
  protected generateHeader(title: string, subtitle?: string): string {
    return `
      <div class="header">
        ${this.logoUrl ? `<img src="${this.logoUrl}" alt="${this.brandName}" class="logo">` : ""}
        <h1>${title}</h1>
        ${subtitle ? `<p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">${subtitle}</p>` : ""}
      </div>
    `;
  }

  /**
   * Generate footer HTML
   */
  protected generateFooter(): string {
    return `
      <div class="footer">
        <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} ${this.brandName}. All rights reserved.</p>
        <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
      </div>
    `;
  }

  /**
   * Generate button HTML
   */
  protected generateButton(
    text: string,
    url: string,
    color: string = this.brandColor
  ): string {
    return `
      <div class="button-container">
        <a href="${url}" class="button" style="background: ${color};">${text}</a>
      </div>
    `;
  }

  /**
   * Generate info box HTML
   */
  protected generateInfoBox(
    items: Array<{ label: string; value: string }>
  ): string {
    const rows = items
      .map(
        (item) => `
      <div class="info-row">
        <span class="label">${item.label}</span>
        <span class="value">${item.value}</span>
      </div>
    `
      )
      .join("");

    return `
      <div class="info-box">
        ${rows}
      </div>
    `;
  }

  /**
   * Generate alert/banner HTML
   */
  protected generateAlert(
    message: string,
    type: "success" | "warning" | "error" | "info" = "info"
  ): string {
    const colors = {
      success: { bg: "#ECFDF5", border: "#10B981", text: "#047857" },
      warning: { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E" },
      error: { bg: "#FEE2E2", border: "#EF4444", text: "#991B1B" },
      info: { bg: "#DBEAFE", border: "#3B82F6", text: "#1E40AF" },
    };

    const color = colors[type];

    return `
      <div class="alert" style="background: ${color.bg}; border-left: 4px solid ${color.border}; padding: 15px; margin: 20px 0; border-radius: 4px; color: ${color.text};">
        ${message}
      </div>
    `;
  }

  /**
   * Base CSS styling
   */
  protected getBaseStyles(): string {
    return `
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1F2937;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: ${this.brandColor};
          color: white;
          padding: 30px 20px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          background: white;
          padding: 30px;
          border: 1px solid #E5E7EB;
          border-top: none;
        }
        .section {
          margin: 25px 0;
        }
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: ${this.brandColor};
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .info-box {
          background: #F8F9FA;
          padding: 15px;
          border-left: 4px solid ${this.brandColor};
          margin: 15px 0;
          border-radius: 4px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #E5E7EB;
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .label {
          font-weight: 600;
          color: #6B7280;
        }
        .value {
          color: #1F2937;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .button {
          display: inline-block;
          color: white;
          padding: 12px 32px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
        }
        .button:hover {
          opacity: 0.9;
        }
        .footer {
          background: #F8F9FA;
          padding: 20px;
          text-align: center;
          color: #6B7280;
          font-size: 12px;
          border: 1px solid #E5E7EB;
          border-top: none;
          border-radius: 0 0 8px 8px;
        }
        .logo {
          height: 40px;
          margin-bottom: 10px;
        }
      </style>
    `;
  }

  /**
   * Log template rendering
   */
  protected logRender(templateName: string): void {
    logger.debug(
      { template: templateName, brandColor: this.brandColor },
      `Rendering ${templateName} email template`
    );
  }

  /**
   * Wrap content in HTML structure
   */
  protected wrapInHTML(headerContent: string, bodyContent: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.getSubject()}</title>
  ${this.getBaseStyles()}
</head>
<body>
  <div class="container">
    ${headerContent}
    <div class="content">
      ${bodyContent}
    </div>
    ${this.generateFooter()}
  </div>
</body>
</html>`;
  }
}
