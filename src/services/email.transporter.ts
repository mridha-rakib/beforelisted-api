// file: src/services/email.transporter.ts

import { logger } from "@/middlewares/pino-logger";
import nodemailer, { type Transporter } from "nodemailer";
import type {
  IEmailConfig,
  IEmailOptions,
  IEmailResponse,
  IEmailTransporter,
} from "./email.types";

// ============================================
// NODEMAILER SMTP TRANSPORTER
// ============================================

/**
 * NodeMailer SMTP Transporter Implementation
 * Implements IEmailTransporter interface for abstraction
 */
export class NodeMailerSmtpTransporter implements IEmailTransporter {
  private transporter: Transporter;
  private config: IEmailConfig;
  private isConnected: boolean = false;
  private maxRetries: number;
  private retryDelayMs: number;

  /**
   * Constructor - Dependency injection
   * @param config - Email configuration with SMTP details
   */
  constructor(config: IEmailConfig) {
    this.config = config;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelayMs = config.retryDelayMs || 1000;

    // Create transporter with connection pooling
    this.transporter = nodemailer.createTransport(this.config.smtp);

    logger.info(
      {
        host: this.config.smtp.host,
        port: this.config.smtp.port,
        secure: this.config.smtp.secure,
        from: this.config.from.email,
      },
      "NodeMailer SMTP Transporter initialized"
    );
  }

  /**
   * Verify SMTP connection
   * @returns Promise<boolean> - Connection status
   */
  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.isConnected = true;
      logger.info("✅ SMTP connection verified successfully");
      return true;
    } catch (error) {
      this.isConnected = false;
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        "❌ SMTP connection verification failed"
      );
      throw error;
    }
  }

  /**
   * Send email with retry logic
   * @param options - Email options
   * @returns Promise<IEmailResponse> - Send result
   */
  async send(options: IEmailOptions): Promise<IEmailResponse> {
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < this.maxRetries) {
      try {
        // Prepare email options with defaults
        const emailOptions = this.prepareEmailOptions(options);

        logger.debug(
          {
            to: Array.isArray(emailOptions.to)
              ? emailOptions.to.map((r) => r.email)
              : emailOptions.to.email,
            subject: emailOptions.subject,
            attempt: attempt + 1,
            maxAttempts: this.maxRetries,
          },
          "Sending email"
        );

        // Send email
        const info = await this.transporter.sendMail(emailOptions);

        logger.info(
          {
            messageId: info.messageId,
            to: Array.isArray(emailOptions.to)
              ? emailOptions.to.map((r) => r.email)
              : emailOptions.to.email,
            subject: emailOptions.subject,
            attempt: attempt + 1,
          },
          "✅ Email sent successfully"
        );

        // Return successful response
        return {
          messageId: info.messageId || "",
          response: info.response || "Email sent successfully",
          accepted: info.accepted,
          rejected: info.rejected,
          timestamp: new Date(),
          retries: attempt,
          error: null,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        logger.warn(
          {
            error: lastError.message,
            attempt,
            maxAttempts: this.maxRetries,
            willRetry: attempt < this.maxRetries,
          },
          "Email send attempt failed"
        );

        // If retries remaining, wait before next attempt
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelayMs);
        }
      }
    }

    // All retries exhausted
    logger.error(
      {
        error: lastError?.message,
        attempts: attempt,
        to: Array.isArray(options.to)
          ? options.to.map((r) => r.email)
          : options.to.email,
      },
      "❌ Email send failed after all retries"
    );

    return {
      messageId: "",
      response: "Email send failed after all retries",
      timestamp: new Date(),
      retries: attempt,
      error: lastError,
    };
  }

  /**
   * Close SMTP connection
   * @returns Promise<void>
   */
  async close(): Promise<void> {
    try {
      await this.transporter.close();
      this.isConnected = false;
      logger.info("SMTP connection closed");
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        "Error closing SMTP connection"
      );
    }
  }

  /**
   * Get connection status
   * @returns boolean - Connection status
   */
  isConnectionActive(): boolean {
    return this.isConnected;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Prepare and normalize email options
   * Converts recipients to NodeMailer format
   * @param options - Raw email options
   * @returns Normalized options for NodeMailer
   */
  private prepareEmailOptions(options: IEmailOptions): Record<string, any> {
    const defaultFrom = this.config.from;
    const from = options.from || defaultFrom;

    return {
      from: `${from.name} <${from.email}>`,
      to: this.formatRecipients(options.to),
      cc: options.cc ? this.formatRecipients(options.cc) : undefined,
      bcc: options.bcc ? this.formatRecipients(options.bcc) : undefined,
      subject: options.subject,
      html: options.html,
      text: options.text || this.stripHtmlTags(options.html),
      replyTo: options.replyTo || this.config.replyTo,
      attachments: options.attachments,
      headers: options.headers,
      inReplyTo: options.inReplyTo,
      references: options.references,
      priority: options.priority || "normal",
    };
  }

  /**
   * Format recipients to NodeMailer string format
   * @param recipients - Single recipient or array
   * @returns Formatted string for NodeMailer
   */
  private formatRecipients(recipients: any): string {
    if (!recipients) return "";

    const recArray = Array.isArray(recipients) ? recipients : [recipients];
    return recArray
      .map((r) => {
        if (typeof r === "string") return r;
        return r.name ? `${r.name} <${r.email}>` : r.email;
      })
      .join(", ");
  }

  /**
   * Strip HTML tags from content (for plain text version)
   * @param html - HTML content
   * @returns Plain text
   */
  private stripHtmlTags(html: string): string {
    return html
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/&nbsp;/g, " ") // Replace &nbsp; with space
      .replace(/&#?\w+;/g, " ") // Replace HTML entities
      .replace(/\s+/g, " ") // Collapse multiple spaces
      .trim();
  }

  /**
   * Sleep utility for retry delays
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================
// TRANSPORTER FACTORY
// ============================================

/**
 * Factory function to create email transporter
 * Supports dependency injection patterns
 * @param config - Email configuration
 * @returns IEmailTransporter instance
 */
export function createEmailTransporter(
  config: IEmailConfig
): IEmailTransporter {
  return new NodeMailerSmtpTransporter(config);
}

/**
 * Singleton instance holder
 */
let transporterInstance: IEmailTransporter | null = null;

/**
 * Get or create singleton transporter
 * @param config - Email configuration
 * @returns IEmailTransporter - Shared instance
 */
export function getEmailTransporter(config: IEmailConfig): IEmailTransporter {
  if (!transporterInstance) {
    transporterInstance = createEmailTransporter(config);
  }
  return transporterInstance;
}

/**
 * Reset singleton (useful for testing)
 */
export function resetEmailTransporter(): void {
  if (transporterInstance) {
    // Don't await close here - it's synchronous in this context
    transporterInstance.close().catch((err) => {
      logger.error(
        {
          error: err instanceof Error ? err.message : String(err),
        },
        "Error closing transporter on reset"
      );
    });
  }
  transporterInstance = null;
}
