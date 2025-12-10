// file: src/services/email.integration.beforelisted.ts

/**
 * BeforeListed Email Integration Helper

 */

import { logger } from "@/middlewares/pino-logger";
import { EmailTemplates } from "./email.templates.beforelisted";

/**
 * Email Template Helper
 * Provides utilities for working with email templates
 */
export class EmailTemplateHelper {
  private static templates = new EmailTemplates();

  /**
   * Replace all template variables in HTML
   * Safely replaces {{variableName}} with values
   *
   * @param html - HTML template string
   * @param variables - Object with variable names and values
   * @returns - HTML with variables replaced
   */
  static replaceVariables(
    html: string,
    variables: Record<string, any>
  ): string {
    let result = html;

    // Replace each variable
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const escapedValue = String(value).replace(/[&<>"']/g, (match) => {
        const escapeMap: Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#x27;",
        };
        return escapeMap[match];
      });
      result = result.replaceAll(placeholder, escapedValue);
    }

    // Log any remaining unreplaced variables (for debugging)
    const remainingVariables = result.match(/\{\{(\w+)\}\}/g);
    if (remainingVariables && remainingVariables.length > 0) {
      logger.warn(
        {
          variables: remainingVariables,
          note: "Check if all required variables are provided",
        },
        "Unreplaced template variables found"
      );
    }

    return result;
  }

  /**
   * Validate template variables
   * @param html - HTML template string
   * @param providedVariables - Variables provided
   * @returns boolean - True if all required variables are provided
   */
  static validateVariables(
    html: string,
    providedVariables: Record<string, any>
  ): {
    isValid: boolean;
    missingVariables: string[];
  } {
    const requiredVariables = html.match(/\{\{(\w+)\}\}/g) || [];
    const uniqueRequired = [
      ...new Set(requiredVariables.map((v) => v.slice(2, -2))),
    ];

    const missingVariables = uniqueRequired.filter(
      (variable) => !(variable in providedVariables)
    );

    return {
      isValid: missingVariables.length === 0,
      missingVariables,
    };
  }

  /**
   * Get all template variables from HTML
   * @param html - HTML template string
   * @returns string[] - Array of variable names
   */
  static getTemplateVariables(html: string): string[] {
    const variables = html.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(variables.map((v) => v.slice(2, -2)))];
  }

  /**
   * Create a template context with defaults
   * @param userType - "Agent" or "Renter"
   * @param email - User email
   * @returns Template context object
   */
  static createTemplateContext(
    userType: "Agent" | "Renter",
    email: string
  ): Record<string, any> {
    return {
      userType,
      email,
      currentYear: new Date().getFullYear(),
      supportEmail: "support@beforelisted.com",
      dashboardLink: `${process.env.APP_URL || "https://app.beforelisted.com"}/dashboard`,
      helpCenterLink: `${process.env.APP_URL || "https://app.beforelisted.com"}/help`,
    };
  }

  /**
   * Sanitize HTML for email clients
   * Removes potentially dangerous HTML/JS
   * @param html - HTML string
   * @returns Sanitized HTML
   */
  static sanitizeHtml(html: string): string {
    // Remove script tags
    let sanitized = html.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ""
    );

    // Remove event handlers
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
    sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, "");

    // Remove iframe tags
    sanitized = sanitized.replace(
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      ""
    );

    // Remove form tags (emails shouldn't have forms)
    sanitized = sanitized.replace(
      /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi,
      ""
    );

    return sanitized;
  }

  /**
   * Strip HTML tags to create plain text version
   * @param html - HTML string
   * @returns Plain text
   */
  static stripHtmlTags(html: string): string {
    return html
      .replace(/<[^>]*>/g, "") // Remove all HTML tags
      .replace(/&nbsp;/g, " ") // Replace &nbsp; with space
      .replace(/&#?\w+;/g, "") // Remove HTML entities
      .replace(/\s+/g, " ") // Collapse multiple spaces
      .trim();
  }

  /**
   * Convert HTML to accessible plain text version
   * Preserves structure (paragraphs, lists, etc.)
   * @param html - HTML string
   * @returns Plain text with preserved structure
   */
  static htmlToPlainText(html: string): string {
    let text = html;

    // Add line breaks for block elements
    text = text.replace(
      /<\/(p|div|blockquote|h[1-6]|ul|ol|li|section|article)>/g,
      "\n"
    );
    text = text.replace(/<li>/g, "• ");

    // Remove remaining HTML tags
    text = text.replace(/<[^>]*>/g, "");

    // Decode HTML entities
    const entities: Record<string, string> = {
      "&nbsp;": " ",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&apos;": "'",
      "&amp;": "&",
    };

    for (const [entity, char] of Object.entries(entities)) {
      text = text.replaceAll(entity, char);
    }

    // Clean up extra whitespace
    text = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");

    return text;
  }

  /**
   * Get email preview text (first 150 chars of HTML)
   * Useful for email client preview pane
   * @param html - HTML string
   * @returns Preview text
   */
  static getEmailPreview(html: string): string {
    const plainText = this.stripHtmlTags(html);
    return plainText.substring(0, 150) + (plainText.length > 150 ? "..." : "");
  }

  /**
   * Inline CSS in HTML for email compatibility
   * Many email clients don't support external CSS
   * @param html - HTML with CSS
   * @param css - CSS rules
   * @returns HTML with inlined styles
   */
  static inlineCss(html: string, css: string): string {
    // Note: For production, use a library like juice or premailer
    // This is a simplified version
    logger.warn(
      "CSS inlining not fully implemented. Consider using a library like juice."
    );
    return html;
  }

  /**
   * Add tracking pixels to HTML
   * @param html - HTML string
   * @param trackingUrl - URL to tracking pixel
   * @returns HTML with tracking pixel
   */
  static addTrackingPixel(html: string, trackingUrl: string): string {
    const pixel = `<img src="${trackingUrl}" alt="" width="1" height="1" style="display:none;" />`;
    return html.replace(/<\/body>/i, `${pixel}</body>`);
  }

  /**
   * Validate email address format
   * @param email - Email address
   * @returns boolean
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Extract all links from HTML
   * @param html - HTML string
   * @returns string[] - Array of URLs
   */
  static extractLinks(html: string): string[] {
    const linkRegex = /href=["']([^"']*)["']/g;
    const links: string[] = [];
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      if (match[1]) {
        links.push(match[1]);
      }
    }

    return links;
  }

  /**
   * Replace all links in HTML
   * Useful for adding UTM parameters or click tracking
   * @param html - HTML string
   * @param callback - Function to transform each URL
   * @returns HTML with transformed links
   */
  static replaceLinks(html: string, callback: (url: string) => string): string {
    return html.replace(/href=["']([^"']*)["']/g, (match, url) => {
      const newUrl = callback(url);
      return `href="${newUrl}"`;
    });
  }

  /**
   * Add UTM parameters to links
   * @param html - HTML string
   * @param utmParams - UTM parameters
   * @returns HTML with UTM parameters added
   */
  static addUtmParameters(
    html: string,
    utmParams: Record<string, string>
  ): string {
    return this.replaceLinks(html, (url) => {
      if (!url.startsWith("http")) return url;

      try {
        const urlObj = new URL(url);
        for (const [key, value] of Object.entries(utmParams)) {
          urlObj.searchParams.set(key, value);
        }
        return urlObj.toString();
      } catch {
        return url;
      }
    });
  }

  /**
   * Log email sending details for debugging
   * @param emailData - Email data
   */
  static logEmailDetails(emailData: {
    to: string;
    subject: string;
    template?: string;
    variables?: Record<string, any>;
  }): void {
    logger.debug(
      {
        to: emailData.to,
        subject: emailData.subject,
        template: emailData.template,
        variableKeys: emailData.variables
          ? Object.keys(emailData.variables)
          : [],
      },
      "Sending email"
    );
  }
}

/**
 * Email Rendering Service
 * Combines templates with variables
 */
export class EmailRendering {
  /**
   * Render email from template
   * @param template - Template method to call
   * @param variables - Variables to pass
   * @returns Rendered HTML and plain text
   */
  static render(
    template: () => string,
    variables?: Record<string, any>
  ): {
    html: string;
    text: string;
  } {
    const html = template();
    const text = EmailTemplateHelper.htmlToPlainText(html);

    return {
      html: EmailTemplateHelper.sanitizeHtml(html),
      text,
    };
  }
}
