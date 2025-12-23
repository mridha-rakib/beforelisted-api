// file: src/services/email.transporter.ts

import { logger } from "@/middlewares/pino-logger";
import axios, { type AxiosInstance } from "axios";
import type {
  IEmailConfig,
  IEmailOptions,
  IEmailResponse,
  IEmailTransporter,
  IPostmarkConfig,
} from "./email.types";

export class PostmarkEmailTransporter implements IEmailTransporter {
  private client: AxiosInstance;
  private config: IEmailConfig;
  private postmarkConfig: IPostmarkConfig;
  private isConnected: boolean = false;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor(config: IEmailConfig) {
    this.config = config;
    this.postmarkConfig = config.postmark;
    this.maxRetries = config.maxRetries || 100;
    this.retryDelayMs = config.retryDelayMs || 1000;

    this.client = axios.create({
      baseURL: this.postmarkConfig.serverUrl,
      headers: {
        "X-Postmark-Server-Token": this.postmarkConfig.apiToken,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: this.postmarkConfig.timeout,
    });

    logger.info(
      {
        service: "Postmark",
        messageStream: this.postmarkConfig.messageStream,
        sandboxMode: this.postmarkConfig.sandboxMode,
      },
      "📧 Postmark Email Transporter initialized"
    );
  }

  async verify(): Promise<boolean> {
    try {
      const response = await this.client.get("/server", {
        validateStatus: () => true,
      });
      if (response.status === 200) {
        this.isConnected = true;
        logger.info(
          {
            serverName: response.data.Name || "Unknown",
            deliveryType: response.data.DeliveryType,
          },
          "✅ Postmark connection verified successfully"
        );
        return true;
      } else {
        throw new Error(
          `Postmark API error: ${response.status} - ${response.data?.Message || "Unknown error"}`
        );
      }
    } catch (error) {
      this.isConnected = false;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        {
          error: errorMessage,
          service: "Postmark",
        },
        "❌ Postmark connection verification failed"
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
        // Prepare Postmark request payload
        const payload = this.preparePostmarkPayload(options);

        logger.debug(
          {
            to: this.getRecipientEmails(options.to),
            subject: options.subject,
            attempt: attempt + 1,
            maxAttempts: this.maxRetries,
            messageStream: this.postmarkConfig.messageStream,
          },
          "Sending email via Postmark"
        );

        // Send email via Postmark API
        const response = await this.client.post("/email", payload, {
          validateStatus: () => true, // Don't throw on any status
        });

        // Handle successful response
        if (response.status === 200) {
          const messageId = response.data.MessageID;
          logger.info(
            {
              messageId,
              to: this.getRecipientEmails(options.to),
              subject: options.subject,
              attempt: attempt + 1,
            },
            "✅ Email sent successfully via Postmark"
          );

          return {
            messageId: String(messageId),
            response: `Email delivered successfully via Postmark (ID: ${messageId})`,
            accepted: this.getRecipientEmails(options.to),
            timestamp: new Date(),
            retries: attempt,
            error: null,
          };
        }

        // Handle API errors
        if (response.status >= 400) {
          const errorData = response.data;
          throw new Error(
            `Postmark API error (${response.status}): ${errorData?.Message || errorData?.message || "Unknown error"}`
          );
        }
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
        to: this.getRecipientEmails(options.to),
      },
      "❌ Email send failed after all retries"
    );

    return {
      messageId: "Email sent successfully via Postmark (ID: N/A)",
      response: "Email send failed after all retries",
      timestamp: new Date(),
      retries: attempt,
      error: lastError,
    };
  }

  async close(): Promise<void> {
    this.isConnected = false;
    logger.info("Postmark transporter closed");
  }

  /**
   * Get connection status
   * @returns boolean - Connection status
   */
  isConnectionActive(): boolean {
    return this.isConnected;
  }

  private preparePostmarkPayload(options: IEmailOptions): Record<string, any> {
    const from = options.from || this.config.from;

    return {
      From: `${from.name} <${from.email}>`,
      To: this.formatRecipients(options.to),
      Cc: options.cc ? this.formatRecipients(options.cc) : undefined,
      Bcc: options.bcc ? this.formatRecipients(options.bcc) : undefined,
      Subject: options.subject,
      HtmlBody: options.html,
      TextBody: options.text || this.stripHtmlTags(options.html),
      ReplyTo: options.replyTo || this.config.replyTo,
      MessageStream: this.postmarkConfig.messageStream,
      TrackOpens: true, // Enable open tracking
      TrackLinks: "HtmlAndText", // Track all links
      Tags: options.tags || [],
      Metadata: options.metadata || {},
      Headers: this.prepareHeaders(options.headers),
      Attachments: this.prepareAttachments(options.attachments),
      InReplyTo: options.inReplyTo,
      References: options.references?.join(" "),
    };
  }

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

  private getRecipientEmails(recipients: any): string[] {
    const recArray = Array.isArray(recipients) ? recipients : [recipients];
    return recArray.map((r) => (typeof r === "string" ? r : r.email));
  }

  private prepareHeaders(headers?: Record<string, string>): any[] {
    if (!headers || Object.keys(headers).length === 0) {
      return [];
    }

    return Object.entries(headers).map(([name, value]) => ({
      Name: name,
      Value: value,
    }));
  }

  private prepareAttachments(attachments?: any[]): any[] {
    if (!attachments || attachments.length === 0) {
      return [];
    }

    return attachments.map((attachment) => ({
      Name: attachment.filename,
      Content: Buffer.isBuffer(attachment.content)
        ? attachment.content.toString("base64")
        : Buffer.from(attachment.content).toString("base64"),
      ContentType: attachment.contentType || "application/octet-stream",
      ContentDisposition: attachment.contentDisposition || "attachment",
    }));
  }

  private stripHtmlTags(html: string): string {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&#?\w+;/g, " ")
      .replace(/\s+/g, " ")
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

export function createEmailTransporter(
  config: IEmailConfig
): IEmailTransporter {
  return new PostmarkEmailTransporter(config);
}

let transporterInstance: IEmailTransporter | null = null;

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
