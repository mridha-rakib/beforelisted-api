// file: src/services/email.service.ts

import { emailConfig } from "@/config/email.config";
import { logger } from "@/middlewares/pino-logger";
import { createEmailTransporter } from "@/services/email.transporter";
import {
  IAdminReferralEmailPayload,
  type IEmailOptions,
  type IEmailResult,
  type IEmailVerificationPayload,
  type IPasswordChangedPayload,
  type IPasswordResetPayload,
  type IWelcomeEmailPayload,
} from "@/services/email.types";
import { preMarketAdminNotificationTemplate, preMarketAgentNotificationTemplate } from "./email-notification.templates";
import { IPreMarketAdminNotificationPayload, IPreMarketAgentNotificationPayload } from "./email-notification.types";
import { EmailTemplateHelper } from "./email.integration.beforelisted";
import { EmailTemplates } from "./email.templates.beforelisted";

export class EmailService {
  private transporter = createEmailTransporter(emailConfig);
  private templates = new EmailTemplates();
  private templateHelper = EmailTemplateHelper;
  private config = emailConfig;

  constructor() {
    this.initializeTransporter();
  }

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

  /**
   * Validate and normalize userType to correct format
   * @param userType - Input user type (can be string)
   * @returns Normalized user type or undefined
   */
  private normalizeUserType(
    userType: string | undefined
  ): "Agent" | "Renter" | "Admin" | undefined {
    if (!userType) return undefined;

    const normalized = userType.trim();
    if (
      normalized === "Agent" ||
      normalized === "Renter" ||
      normalized === "Admin"
    ) {
      return normalized as "Agent" | "Renter" | "Admin";
    }

    logger.warn(
      { userType, normalized },
      "Unknown userType - defaulting to undefined"
    );
    return undefined;
  }

  /**
   * Validate and normalize welcome email userType
   * @param userType - Input user type
   * @returns Normalized user type (Agent or Renter)
   */
  private normalizeWelcomeUserType(
    userType: string | undefined
  ): "Agent" | "Renter" {
    if (!userType) return "Renter";

    const normalized = userType.toUpperCase().trim();
    if (normalized === "AGENT") return "Agent";
    if (normalized === "RENTER") return "Renter";

    logger.warn(
      { userType, normalized },
      "Unknown welcome userType - defaulting to Renter"
    );
    return "Renter";
  }

  /**
   * Send password reset OTP email
   * Called during: Password reset request
   *
   * @param userName - User's full name
   * @param email - User's email address
   * @param otpCode - 4-digit OTP code
   * @param expiresInMinutes - Minutes until OTP expires
   */
  async sendPasswordResetOTP(
    userName: string | undefined,
    email: string,
    otpCode: string,
    expiresInMinutes: number
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email, expiresInMinutes },
        "Sending password reset OTP email"
      );

      // Render template
      const html = this.templates.passwordResetOTP(
        userName,
        otpCode,
        expiresInMinutes,
        undefined,
        this.config.logoUrl,
        this.config.brandColor
      );

      // Prepare email options
      const emailOptions: IEmailOptions = {
        to: { email, name: userName },
        subject: `Password Reset Code - BeforeListed`,
        html,
        priority: "high",
      };

      // Send email
      return await this.sendEmail(emailOptions, "PASSWORD_RESET_OTP", email);
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email,
        },
        "Failed to send password reset OTP email"
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
   * Send password reset confirmation email
   * Called during: Successful password reset
   *
   * @param userName - User's full name
   * @param email - User's email address
   */
  async sendPasswordResetConfirmation(
    userName: string | undefined,
    email: string
  ): Promise<IEmailResult> {
    try {
      logger.debug({ email }, "Sending password reset confirmation email");

      // Render template
      const html = this.templates.passwordResetConfirmation(
        userName,
        this.config.logoUrl,
        this.config.brandColor
      );

      // Prepare email options
      const emailOptions: IEmailOptions = {
        to: { email, name: userName },
        subject: `Password Reset Successful - BeforeListed`,
        html,
      };

      // Send email
      return await this.sendEmail(
        emailOptions,
        "PASSWORD_RESET_CONFIRMATION",
        email
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email,
        },
        "Failed to send password reset confirmation email"
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
        payload.userName!,
        payload.verificationCode,
        payload.expiresIn,
        // payload.userType,
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
  // ✅ ADD THESE TWO NEW METHODS:
  // ============================================

  /**
   * Send pre-market notification email to agents
   * Called when renter creates new pre-market request
   * WITHOUT renter information
   *
   * @param payload - Agent notification details
   * @returns Promise with send result
   */
  async sendPreMarketNotificationToAgent(
    payload: IPreMarketAgentNotificationPayload
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to, agentType: payload.agentType },
        "Sending pre-market notification to agent"
      );

      // Render template (WITHOUT renter info)
      const html = preMarketAgentNotificationTemplate(
        payload.agentName,
        payload.listingTitle,
        payload.listingDescription,
        payload.location,
        payload.serviceType,
        payload.listingUrl,
        this.config.logoUrl,
        this.config.brandColor
      );

      // Prepare email options
      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.agentName },
        subject: `New Pre-Market Listing Opportunity - ${payload.listingTitle}`,
        html,
        priority: "high",
      };

      // Send email
      return await this.sendEmail(
        emailOptions,
        "PRE_MARKET_AGENT_NOTIFICATION",
        payload.to
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send pre-market agent notification"
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
   * Send pre-market notification email to admin
   * Called when renter creates new pre-market request
   * WITH full renter information
   *
   * @param payload - Admin notification details
   * @returns Promise with send result
   */
  async sendPreMarketNotificationToAdmin(
    payload: IPreMarketAdminNotificationPayload
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to, preMarketRequestId: payload.preMarketRequestId },
        "Sending pre-market notification to admin with renter info"
      );

      // Render template (WITH renter info)
      const html = preMarketAdminNotificationTemplate(
        payload.listingTitle,
        payload.listingDescription,
        payload.location,
        payload.serviceType,
        payload.renterName,
        payload.renterEmail,
        payload.renterPhone,
        payload.listingUrl,
        payload.preMarketRequestId,
        this.config.logoUrl,
        this.config.brandColor
      );

      // Prepare email options
      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: "Administrator" },
        subject: `[ADMIN] New Pre-Market Request - ${payload.listingTitle}`,
        html,
        priority: "high",
      };

      // Send email
      return await this.sendEmail(
        emailOptions,
        "PRE_MARKET_ADMIN_NOTIFICATION",
        payload.to
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send pre-market admin notification"
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
   * Send admin referral email with temporary password
   * Called during: Admin referral renter registration (passwordless flow)
   *
   * @param payload - Admin referral email details
   * @returns Promise<IEmailResult>
   */
  async sendAdminReferralEmail(
    payload: IAdminReferralEmailPayload
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to, userName: payload.userName },
        "Sending admin referral email with temporary password"
      );

      // Handle both string and object password formats
      const passwordStr =
        typeof payload.temporaryPassword === "string"
          ? payload.temporaryPassword
          : payload.temporaryPassword.password;

      // Render template
      const html = this.templates.welcomeAutoGeneratedPassword(
        payload.userName,
        passwordStr,
        payload.loginLink,
        "Renter",
        this.config.logoUrl,
        this.config.brandColor
      );

      // Prepare email options
      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.userName },
        subject: `Welcome to BeforeListed - Your Temporary Password`,
        html,
        priority: "high", // High priority for admin referral
      };

      // Send email
      return await this.sendEmail(emailOptions, "ADMIN_REFERRAL", payload.to);
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send admin referral email"
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
   * Send admin referral email with temporary password
   * Called during: Admin referral renter registration (passwordless flow)
   *
   * @param payload - Admin referral email details
   * @returns Promise<IEmailResult>
   */

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
