// file: src/services/email.service.ts

/**
 * BeforeListed Email Service - REFACTORED FOR NODEMAILER
 * ✅ Unified email service for Agents & Renters
 * ✅ Full type-safety with TypeScript
 * ✅ Dependency injection support
 * ✅ Clean architecture (Service → Transporter → SMTP)
 * ✅ SOLID principles applied
 * ✅ Error handling & retry logic
 * ✅ Structured logging with Pino
 */

import { emailConfig } from "@/config/email.config";
import { logger } from "@/middlewares/pino-logger";
import { createEmailTransporter } from "@/services/email.transporter";
import {
  type IEmailOptions,
  type IEmailResult,
  type IEmailVerificationPayload,
  type IPasswordChangedPayload,
  type IPasswordResetPayload,
  type IWelcomeEmailPayload,
} from "@/services/email.types";
import { EmailTemplateHelper } from "./email.integration.beforelisted";
import { EmailTemplates } from "./email.templates.beforelisted";

/**
 * Email Service - Core business logic for sending emails
 * - Handles template rendering
 * - Manages transporter lifecycle
 * - Provides unified API for controllers/services
 */
export class EmailService {
  private transporter = createEmailTransporter(emailConfig);
  private templates = new EmailTemplates();
  private templateHelper = EmailTemplateHelper;
  private config = emailConfig;

  /**
   * Constructor with dependency injection support
   */
  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize and verify transporter connection
   */
  private async initializeTransporter(): Promise<void> {
    try {
      const isConnected = await this.transporter.verify();
      if (isConnected) {
        logger.info("📧 Email service initialized successfully");
      }
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          note: "Service will attempt to send emails anyway",
        },
        "⚠️  Email service initialization warning"
      );
    }
  }

  // ============================================
  // EMAIL VERIFICATION
  // ============================================

  /**
   * Send email verification code
   * Called during: User registration (Agent/Renter)
   *
   * @param payload - Email verification details
   * @returns Promise<IEmailResult>
   */
  async sendEmailVerification(
    payload: IEmailVerificationPayload
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        {
          email: payload.to,
          userType: payload.userType,
        },
        "Sending email verification"
      );

      // Render template
      const html = this.templates.emailVerification(
        payload.userName,
        payload.verificationCode,
        payload.expiresIn,
        payload.userType,
        this.config.logoUrl,
        this.config.brandColor
      );

      // Prepare email options
      const emailOptions: IEmailOptions = {
        to: { email: payload.to },
        subject: `Verify Your Email - BeforeListed`,
        html,
      };

      // Send email
      return await this.sendEmail(
        emailOptions,
        "EMAIL_VERIFICATION",
        payload.to
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send email verification"
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        attempt: 1,
        maxAttempts: this.config.maxRetries,
      };
    }
  }

  /**
   * Resend verification code
   * Called during: Resend verification request
   *
   * @param payload - Email verification details
   * @returns Promise<IEmailResult>
   */
  async resendEmailVerification(
    payload: IEmailVerificationPayload
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        {
          email: payload.to,
          userType: payload.userType,
        },
        "Resending email verification"
      );

      const result = await this.sendEmailVerification(payload);

      logger.info(
        {
          email: payload.to,
          messageId: result.messageId,
        },
        "✅ Verification email resent"
      );

      return result;
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to resend email verification"
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        attempt: 1,
        maxAttempts: this.config.maxRetries,
      };
    }
  }

  // ============================================
  // WELCOME EMAIL
  // ============================================

  /**
   * Send welcome email to new user
   * Called during: Successful registration (Agent/Renter)
   *
   * @param payload - Welcome email details
   * @returns Promise<IEmailResult>
   */
  async sendWelcomeEmail(payload: IWelcomeEmailPayload): Promise<IEmailResult> {
    try {
      logger.debug(
        {
          email: payload.to,
          userType: payload.userType,
        },
        "Sending welcome email"
      );

      // Determine which welcome template to use
      let html: string;
      let subject: string;

      if (payload.isPasswordAutoGenerated) {
        html = this.templates.welcomeAutoGeneratedPassword(
          payload.userName,
          payload.temporaryPassword || "",
          payload.loginLink,
          payload.userType,
          this.config.logoUrl,
          this.config.brandColor
        );
        subject = `Welcome to BeforeListed - Your Temporary Password`;
      } else {
        html = this.templates.welcome(
          payload.userName,
          payload.userType,
          payload.loginLink,
          this.config.logoUrl,
          this.config.brandColor
        );
        subject = `Welcome to BeforeListed!`;
      }

      // Prepare email options
      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.userName },
        subject,
        html,
      };

      // Send email
      return await this.sendEmail(emailOptions, "WELCOME", payload.to);
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send welcome email"
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        attempt: 1,
        maxAttempts: this.config.maxRetries,
      };
    }
  }

  // ============================================
  // PASSWORD RESET
  // ============================================

  /**
   * Send password reset email with verification link
   * Called during: Password reset request
   *
   * @param payload - Password reset details
   * @returns Promise<IEmailResult>
   */
  async sendPasswordResetEmail(
    payload: IPasswordResetPayload
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        {
          email: payload.to,
        },
        "Sending password reset email"
      );

      // Render template
      const html = this.templates.passwordReset(
        payload.userName,
        payload.resetLink,
        payload.expiresIn,
        this.config.logoUrl,
        this.config.brandColor
      );

      // Prepare email options
      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.userName },
        subject: `Reset Your Password - BeforeListed`,
        html,
        priority: "high",
      };

      // Send email
      return await this.sendEmail(emailOptions, "PASSWORD_RESET", payload.to);
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send password reset email"
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        attempt: 1,
        maxAttempts: this.config.maxRetries,
      };
    }
  }

  /**
   * Send password changed confirmation email
   * Called during: Successful password change
   *
   * @param payload - Password changed details
   * @returns Promise<IEmailResult>
   */
  async sendPasswordChangedEmail(
    payload: IPasswordChangedPayload
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        {
          email: payload.to,
        },
        "Sending password changed email"
      );

      // Render template
      const html = this.templates.passwordChanged(
        payload.userName,
        payload.timestamp,
        this.config.logoUrl,
        this.config.brandColor
      );

      // Prepare email options
      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.userName },
        subject: `Password Changed - BeforeListed`,
        html,
      };

      // Send email
      return await this.sendEmail(emailOptions, "PASSWORD_CHANGED", payload.to);
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send password changed email"
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        attempt: 1,
        maxAttempts: this.config.maxRetries,
      };
    }
  }

  // ============================================
  // CORE EMAIL SENDING
  // ============================================

  /**
   * Core method to send email via transporter
   * @param options - Email options
   * @param templateType - Type of template being sent
   * @param recipientEmail - Recipient email for logging
   * @returns Promise<IEmailResult>
   */
  private async sendEmail(
    options: IEmailOptions,
    templateType: string,
    recipientEmail: string
  ): Promise<IEmailResult> {
    const startTime = Date.now();

    try {
      // Send via transporter
      const response = await this.transporter.send(options);

      const duration = Date.now() - startTime;

      if (response.error) {
        logger.error(
          {
            email: recipientEmail,
            error: response.error.message,
            duration: `${duration}ms`,
            attempts: response.retries + 1,
          },
          `❌ Email send failed: ${templateType}`
        );

        return {
          success: false,
          error: response.error.message,
          timestamp: response.timestamp,
          attempt: response.retries + 1,
          maxAttempts: this.config.maxRetries,
        };
      }

      logger.info(
        {
          messageId: response.messageId,
          email: recipientEmail,
          duration: `${duration}ms`,
        },
        `✅ Email sent successfully: ${templateType}`
      );

      return {
        success: true,
        messageId: response.messageId,
        timestamp: response.timestamp,
        attempt: response.retries + 1,
        maxAttempts: this.config.maxRetries,
      };
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: recipientEmail,
        },
        `❌ Unexpected error sending email: ${templateType}`
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        attempt: 1,
        maxAttempts: this.config.maxRetries,
      };
    }
  }

  // ============================================
  // LIFECYCLE MANAGEMENT
  // ============================================

  /**
   * Close SMTP connection (call on app shutdown)
   */
  async closeConnection(): Promise<void> {
    try {
      await this.transporter.close();
      logger.info("✅ Email service connection closed");
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        "Error closing email service connection"
      );
    }
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

/**
 * Export singleton instance for use throughout app
 * Usage: import { emailService } from "@/services/email.service"
 */
export const emailService = new EmailService();

/**
 * Initialize email service on app start
 * Call this in your main application file
 */
export async function initializeEmailService(): Promise<void> {
  try {
    await emailService.closeConnection();
    logger.info("✅ Email service initialized");
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to initialize email service"
    );
    // Don't throw - app can still run without email
  }
}

/**
 * Cleanup email service on app shutdown
 * Call this in your app shutdown handler
 */
export async function cleanupEmailService(): Promise<void> {
  try {
    await emailService.closeConnection();
    logger.info("✅ Email service cleanup completed");
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      "Error during email service cleanup"
    );
  }
}
