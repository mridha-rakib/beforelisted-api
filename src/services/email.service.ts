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
import {
  preMarketAdminNotificationTemplate,
  preMarketAgentNotificationTemplate,
  renterAccessGrantedNotificationTemplate,
} from "./email-notification.templates";
import {
  IPreMarketAdminNotificationPayload,
  IPreMarketAgentNotificationPayload,
  IRenterAccessGrantedNotificationPayload,
} from "./email-notification.types";
import { EmailTemplateFactory } from "./email-templates/email-template.factory";
import { EmailTemplates } from "./email.templates.beforelisted";

export class EmailService {
  private transporter = createEmailTransporter(emailConfig);
  private templates = new EmailTemplates();
  private templateFactory: EmailTemplateFactory;
  private config = emailConfig;

  constructor() {
    this.initializeTransporter();
    this.templateFactory = new EmailTemplateFactory(
      this.config.logoUrl,
      this.config.brandColor
    );
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
        String(payload.expiresIn),
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
      const resolvedUserType: "Agent" | "Renter" =
        payload.userType === "Agent" ? "Agent" : "Renter";

      if (payload.isPasswordAutoGenerated) {
        html = this.templates.welcomeAutoGeneratedPassword(
          payload.userName,
          payload.temporaryPassword || "",
          payload.loginLink,
          resolvedUserType,
          this.config.logoUrl!,
          this.config.brandColor
        );
        subject = `Welcome to BeforeListed - Your Temporary Password`;
      } else {
        html = this.templates.welcome(
          payload.userName,
          resolvedUserType,
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
        String(payload.expiresIn),
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

  async sendPreMarketNotificationToAgent(
    payload: IPreMarketAgentNotificationPayload
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to, agentType: payload.agentType },
        "Sending pre-market notification to agent"
      );

      const html = preMarketAgentNotificationTemplate(
        payload.agentName,
        payload.listingTitle,
        payload.location,
        payload.serviceType,
        payload.listingUrl,
        this.config.logoUrl!,
        this.config.brandColor
      );

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
        payload.location,
        payload.serviceType,
        payload.renterName,
        payload.renterEmail,
        payload.renterPhone,
        payload.listingUrl,
        payload.preMarketRequestId,
        this.config.logoUrl!,
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
   * Send renter notification when an agent gains access
   */
  async sendRenterAccessGrantedNotification(
    payload: IRenterAccessGrantedNotificationPayload
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to, listingTitle: payload.listingTitle },
        "Sending renter access granted notification"
      );

      const html = renterAccessGrantedNotificationTemplate(
        payload.renterName,
        payload.agentName,
        payload.agentEmail,
        payload.listingTitle,
        payload.location,
        payload.accessType,
        payload.listingUrl,
        this.config.logoUrl!,
        this.config.brandColor
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.renterName },
        subject: `Agent Access Granted - ${payload.listingTitle}`,
        html,
        priority: "high",
      };

      return await this.sendEmail(
        emailOptions,
        "RENTER_ACCESS_GRANTED_NOTIFICATION",
        payload.to
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send renter access granted notification"
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

      const passwordStr =
        typeof payload.temporaryPassword === "string"
          ? payload.temporaryPassword
          : payload.temporaryPassword.password;

      let passwordExpiryTime: string | null = null;
      if (
        payload.passwordExpiresAt &&
        payload.passwordExpiresAt instanceof Date
      ) {
        passwordExpiryTime = payload.passwordExpiresAt.toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }

      const accountType = payload.accountType || "Renter";

      const html = this.templates.welcomeAdminReferral(
        payload.userName,
        payload.to,
        passwordStr,
        payload.loginLink,
        accountType,
        this.config.logoUrl,
        this.config.brandColor
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.userName },
        subject: `Welcome to BeforeListed - Your Account is Ready`,
        html,
        priority: "high",
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
   */

  /**
   * Core method to send email via transporter
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
  // GRANT ACCESS EMAIL METHODS
  // ============================================
  /**
   * Send grant access request email to admin
   */
  async sendGrantAccessRequestToAdmin(payload: {
    to: string;
    agentName: string;
    agentEmail: string;
    agentCompany: string | null;
    preMarketRequestId: string;
    propertyTitle: string;
    location: string;
    requestedAt: string;
    adminDashboardLink: string;
  }): Promise<IEmailResult> {
    try {
      const template = this.templateFactory.createGrantAccessRequest(
        payload.agentName,
        payload.agentEmail,
        payload.agentCompany,
        payload.preMarketRequestId,
        payload.propertyTitle,
        payload.location,
        payload.requestedAt,
        payload.adminDashboardLink
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: "Administrator" },
        subject: template.getSubject(),
        html: template.render(),
        priority: template.getEmailPriority(),
      };

      return await this.sendEmail(
        emailOptions,
        "GRANT_ACCESS_REQUEST_ADMIN",
        payload.to
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send grant access request email"
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
   * Send grant access approval email to agent
   */
  async sendGrantAccessApprovalToAgent(payload: {
    to: string;
    agentName: string;
    propertyTitle: string;
    location: string;
    isFree: boolean;
    chargeAmount?: number;
    accessLink: string;
  }): Promise<IEmailResult> {
    try {
      const template = this.templateFactory.createGrantAccessApproval(
        payload.agentName,
        payload.propertyTitle,
        payload.location,
        payload.isFree ? "free" : "paid",
        payload.chargeAmount || 0,
        payload.accessLink
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.agentName },
        subject: template.getSubject(),
        html: template.render(),
        priority: template.getEmailPriority(),
      };

      return await this.sendEmail(
        emailOptions,
        "GRANT_ACCESS_APPROVAL_AGENT",
        payload.to
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send grant access approval email"
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
   * Send grant access rejection email to agent
   */
  async sendGrantAccessRejectionToAgent(payload: {
    to: string;
    agentName: string;
    propertyTitle: string;
    rejectionReason: string | null;
    contactEmail: string;
  }): Promise<IEmailResult> {
    try {
      const template = this.templateFactory.createGrantAccessRejection(
        payload.agentName,
        payload.propertyTitle,
        payload.rejectionReason,
        payload.contactEmail
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.agentName },
        subject: template.getSubject(),
        html: template.render(),
      };

      return await this.sendEmail(
        emailOptions,
        "GRANT_ACCESS_REJECTION_AGENT",
        payload.to
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send grant access rejection email"
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
   * Send payment link email to agent
   */
  async sendPaymentLinkToAgent(payload: {
    to: string;
    agentName: string;
    propertyTitle: string;
    chargeAmount: number;
    paymentLink: string;
    paymentDeadline: string;
  }): Promise<IEmailResult> {
    try {
      const template = this.templateFactory.createPaymentLink(
        payload.agentName,
        payload.propertyTitle,
        payload.chargeAmount,
        payload.paymentLink,
        payload.paymentDeadline
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.agentName },
        subject: template.getSubject(),
        html: template.render(),
        priority: template.getEmailPriority(),
      };

      return await this.sendEmail(
        emailOptions,
        "PAYMENT_LINK_AGENT",
        payload.to
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send payment link email"
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

export const emailService = new EmailService();

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
  }
}

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
