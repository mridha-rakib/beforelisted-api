// file: src/services/email.service.ts

import { emailConfig } from "@/config/email.config";
import { logger } from "@/middlewares/pino-logger";
import { createEmailTransporter } from "@/services/email.transporter";
import {
  type IAccountDeletedPayload,
  type IAgentActivatedByAdminEmailPayload,
  IAdminReferralEmailPayload,
  type IEmailOptions,
  type IEmailResult,
  type IEmailVerificationPayload,
  type IPasswordChangedPayload,
  type IPasswordResetPayload,
  type IWelcomeEmailPayload,
} from "@/services/email.types";
import {
  adminContactRequestTemplate,
  agentRegistrationVerifiedAdminTemplate,
  agentRenterRequestConfirmationTemplate,
  matchReferralAcknowledgmentToMatchingAgentTemplate,
  preMarketAdminNotificationTemplate,
  preMarketAgentNotificationTemplate,
  renterOpportunityFoundOtherAgentTemplate,
  renterOpportunityFoundRegisteredAgentTemplate,
  renterRegistrationVerifiedAdminTemplate,
  renterRequestClosedAgentAlertTemplate,
  renterRequestConfirmationTemplate,
  renterRequestExpiredTemplate,
  renterRequestUpdatedNotificationTemplate,
} from "./email-notification.templates";
import {
  IAdminContactRequestPayload,
  IAgentRegistrationVerifiedAdminPayload,
  IAgentRequestConfirmationPayload,
  IMatchReferralAcknowledgmentToMatchingAgentPayload,
  IPreMarketAdminNotificationPayload,
  IPreMarketAgentNotificationPayload,
  IRenterOpportunityFoundOtherAgentPayload,
  IRenterOpportunityFoundRegisteredAgentPayload,
  IRenterRegisteredAgentInactivePayload,
  IRenterRegistrationVerifiedAdminPayload,
  IRenterRequestClosedAgentAlertPayload,
  IRenterRequestConfirmationPayload,
  IRenterRequestExpiredNotificationPayload,
  IRenterRequestUpdatedNotificationPayload,
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
      this.config.brandColor,
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
        "⚠️  Email service initialization warning",
      );
    }
  }

  async sendPasswordResetOTP(
    userName: string | undefined,
    email: string,
    otpCode: string,
    expiresInMinutes: number,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email, expiresInMinutes },
        "Sending password reset OTP email",
      );

      // Render template
      const html = this.templates.passwordResetOTP(
        userName,
        otpCode,
        expiresInMinutes,
        undefined,
        this.config.logoUrl,
        this.config.brandColor,
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
        "Failed to send password reset OTP email",
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
    email: string,
  ): Promise<IEmailResult> {
    try {
      logger.debug({ email }, "Sending password reset confirmation email");

      // Render template
      const html = this.templates.passwordResetConfirmation(
        userName,
        this.config.logoUrl,
        this.config.brandColor,
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
        email,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email,
        },
        "Failed to send password reset confirmation email",
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
    payload: IEmailVerificationPayload,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        {
          email: payload.to,
          userType: payload.userType,
        },
        "Sending email verification",
      );

      // Render template
      const html = this.templates.emailVerification(
        payload.userName!,
        payload.verificationCode,
        String(payload.expiresIn),
        // payload.userType,
        this.config.logoUrl,
        this.config.brandColor,
      );

      // Prepare email options
      const emailOptions: IEmailOptions = {
        to: { email: payload.to },
        replyTo: "support@beforelisted.com",
        subject: `Verification Code`,
        html,
      };

      // Send email
      return await this.sendEmail(
        emailOptions,
        "EMAIL_VERIFICATION",
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send email verification",
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
    payload: IEmailVerificationPayload,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        {
          email: payload.to,
          userType: payload.userType,
        },
        "Resending email verification",
      );

      const result = await this.sendEmailVerification(payload);

      logger.info(
        {
          email: payload.to,
          messageId: result.messageId,
        },
        "✅ Verification email resent",
      );

      return result;
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to resend email verification",
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
        "Sending welcome email",
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
          this.config.brandColor,
        );
        subject = `Welcome to BeforeListed - Your Temporary Password`;
      } else {
        html = this.templates.welcome(
          payload.userName,
          resolvedUserType,
          payload.loginLink,
          this.config.logoUrl,
          this.config.brandColor,
          payload.registeredAgent,
        );
        subject =
          resolvedUserType === "Agent"
            ? "Welcome to BeforeListed - Agent Access Confirmed"
            : "Welcome to BeforeListed";
      }

      // Prepare email options
      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.userName },
        replyTo: "support@beforelisted.com",
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
        "Failed to send welcome email",
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
   * Send agent activation email after admin activates account
   */
  async sendAgentActivatedByAdminEmail(
    payload: IAgentActivatedByAdminEmailPayload,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to, dashboardLink: payload.dashboardLink },
        "Sending agent activated by admin email",
      );

      const agentFirstName =
        payload.agentName?.trim().split(/\s+/)[0] || "Agent";

      const html = this.templates.agentActivatedByAdmin(
        agentFirstName,
        payload.dashboardLink,
        this.config.logoUrl,
        this.config.brandColor,
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.agentName },
        replyTo: "support@beforelisted.com",
        subject: "Your account is now active | BeforeListed\u2122",
        html,
      };

      return await this.sendEmail(
        emailOptions,
        "AGENT_ACTIVATED_BY_ADMIN",
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send agent activated by admin email",
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
    payload: IPasswordResetPayload,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        {
          email: payload.to,
        },
        "Sending password reset email",
      );

      // Render template
      const html = this.templates.passwordReset(
        payload.userName,
        payload.resetLink,
        String(payload.expiresIn),
        this.config.logoUrl,
        this.config.brandColor,
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
        "Failed to send password reset email",
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
    payload: IPasswordChangedPayload,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        {
          email: payload.to,
        },
        "Sending password changed email",
      );

      // Render template
      const html = this.templates.passwordChanged(
        payload.userName,
        payload.timestamp,
        this.config.logoUrl,
        this.config.brandColor,
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
        "Failed to send password changed email",
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

  async sendRenterAccountDeletedEmail(
    payload: IAccountDeletedPayload,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to },
        "Sending renter account deleted email",
      );

      const html = this.templates.accountDeletedRenter(
        payload.userName,
        this.config.logoUrl,
        this.config.brandColor,
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.userName },
        subject: "Your BeforeListed Account Has Been Deleted",
        html,
      };

      return await this.sendEmail(
        emailOptions,
        "RENTER_ACCOUNT_DELETED",
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send renter account deleted email",
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

  async sendAgentAccountDeletedEmail(
    payload: IAccountDeletedPayload,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to },
        "Sending agent account deleted email",
      );

      const html = this.templates.accountDeletedAgent(
        payload.userName,
        this.config.logoUrl,
        this.config.brandColor,
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.userName },
        cc: this.config.adminEmail
          ? { email: this.config.adminEmail, name: "Admin" }
          : undefined,
        subject: "Your BeforeListed Agent Account Has Been Deleted",
        html,
      };

      return await this.sendEmail(
        emailOptions,
        "AGENT_ACCOUNT_DELETED",
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send agent account deleted email",
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

  async sendRegisteredAgentNoLongerActiveToRenter(
    payload: IRenterRegisteredAgentInactivePayload,
  ): Promise<IEmailResult> {
    try {
      const notificationReason = payload.notificationReason || "inactive";

      logger.debug(
        { email: payload.to, notificationReason },
        "Sending registered agent inactive notification to renter",
      );

      const html = this.templates.registeredAgentNoLongerActiveRenter(
        payload.renterName,
        notificationReason,
        payload.defaultAgentReferralLoginLink,
        this.config.logoUrl,
        this.config.brandColor,
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.renterName },
        replyTo: "support@beforelisted.com",
        subject:
          notificationReason === "deleted"
            ? "Agent no longer participating"
            : "Your Registered Agent Is No Longer Active on BeforeListed",
        html,
      };

      return await this.sendEmail(
        emailOptions,
        "RENTER_REGISTERED_AGENT_INACTIVE",
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send registered agent inactive notification to renter",
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
    payload: IPreMarketAgentNotificationPayload,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to, agentType: payload.agentType },
        "Sending pre-market notification to agent",
      );

      const html = preMarketAgentNotificationTemplate(
        payload.agentName,
        payload.listingTitle,
        payload.listingDescription,
        payload.location,
        payload.serviceType,
        payload.listingUrl,
        this.config.logoUrl!,
        this.config.brandColor,
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
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send pre-market agent notification",
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
    payload: IPreMarketAdminNotificationPayload,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to, preMarketRequestId: payload.preMarketRequestId },
        "Sending pre-market notification to admin with renter info",
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
        payload.requestId,
        this.config.logoUrl!,
        this.config.brandColor,
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
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send pre-market admin notification",
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
   * Send renter confirmation after submitting pre-market request
   */
  async sendPreMarketRequestConfirmationToRenter(
    payload: IRenterRequestConfirmationPayload,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to },
        "Sending pre-market request confirmation to renter",
      );

      const html = renterRequestConfirmationTemplate(
        payload.renterName,
        payload.taggedAgentFullName,
        payload.taggedAgentTitle,
        payload.taggedAgentBrokerage,
        this.config.logoUrl,
        this.config.brandColor,
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.renterName },
        replyTo: payload.taggedAgentEmail || "support@beforelisted.com",
        subject: "Your request has been received - BeforeListed",
        html,
      };

      return await this.sendEmail(
        emailOptions,
        "PRE_MARKET_RENTER_CONFIRMATION",
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send pre-market request confirmation to renter",
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
   * Send renter notification when a request expires
   */
  async sendRenterRequestExpiredNotification(
    payload: IRenterRequestExpiredNotificationPayload,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to },
        "Sending renter request expired notification",
      );

      const html = renterRequestExpiredTemplate(
        payload.renterName,
        this.config.logoUrl,
        this.config.brandColor,
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.renterName },
        subject: "Your BeforeListed Request Has Expired",
        html,
      };

      return await this.sendEmail(
        emailOptions,
        "PRE_MARKET_RENTER_REQUEST_EXPIRED",
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send renter request expired notification",
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
   * Send agent notification when renter updates a pre-market request
   */
  async sendPreMarketRequestUpdatedNotificationToAgent(
    payload: IRenterRequestUpdatedNotificationPayload,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to, requestId: payload.requestId },
        "Sending pre-market request update notification to agent",
      );

      const html = renterRequestUpdatedNotificationTemplate(
        payload.agentName,
        payload.requestId,
        payload.renterName,
        payload.updatedFields,
        payload.updatedAt,
        this.config.logoUrl,
        this.config.brandColor,
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.agentName },
        cc: payload.cc && payload.cc.length > 0 ? payload.cc : undefined,
        replyTo: "support@beforelisted.com",
        subject: "Renter request updated | BeforeListed\u2122",
        html,
      };

      return await this.sendEmail(
        emailOptions,
        "PRE_MARKET_REQUEST_UPDATED",
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send pre-market request update notification to agent",
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
   * Send associated agent confirmation when renter submits a request
   */
  async sendRenterRequestConfirmationToAgent(
    payload: IAgentRequestConfirmationPayload,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to, requestId: payload.requestId },
        "Sending renter request confirmation to agent",
      );

      const html = agentRenterRequestConfirmationTemplate(
        payload.agentName,
        payload.renterName,
        payload.renterEmail,
        payload.renterPhoneNumber,
        payload.requestId,
        payload.requestDescription,
        payload.submittedAt,
        this.config.logoUrl,
        this.config.brandColor,
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.agentName },
        cc: payload.cc && payload.cc.length > 0 ? payload.cc : undefined,
        replyTo: "support@beforelisted.com",
        subject: "New renter request submitted | BeforeListed\u2122",
        html,
      };

      return await this.sendEmail(
        emailOptions,
        "PRE_MARKET_REQUEST_CONFIRMATION_AGENT",
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send renter request confirmation to agent",
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
   * Send renter notification when registered agent finds an opportunity
   */
  async sendRenterOpportunityFoundByRegisteredAgent(
    payload: IRenterOpportunityFoundRegisteredAgentPayload,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to },
        "Sending registered agent opportunity notification to renter",
      );

      const html = renterOpportunityFoundRegisteredAgentTemplate(
        payload.renterName,
        payload.registeredAgentFullName,
        payload.registeredAgentTitle,
        payload.registeredAgentBrokerage,
        payload.registeredAgentEmail,
        payload.registeredAgentPhone,
        this.config.logoUrl,
        this.config.brandColor,
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.renterName },
        replyTo: payload.registeredAgentEmail || "support@beforelisted.com",
        subject:
          "An opportunity matching your request has been identified \u2013 BeforeListed",
        html,
      };

      return await this.sendEmail(
        emailOptions,
        "RENTER_OPPORTUNITY_FOUND_REGISTERED_AGENT",
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send registered agent opportunity notification to renter",
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
   * Send renter notification when another agent finds an opportunity
   */
  async sendRenterOpportunityFoundByOtherAgent(
    payload: IRenterOpportunityFoundOtherAgentPayload,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to },
        "Sending other agent opportunity notification to renter",
      );

      const html = renterOpportunityFoundOtherAgentTemplate(
        payload.renterName,
        payload.requestScope,
        payload.matchedAgentFullName,
        payload.matchedAgentBrokerageName,
        payload.matchedAgentEmail,
        payload.matchedAgentPhone,
        this.config.logoUrl,
        this.config.brandColor,
      );
      const subject =
        payload.requestScope === "All Market"
          ? "A renter specialist may assist with your rental search \u2013 BeforeListed"
          : "An additional agent may help your request \u2013 BeforeListed";

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.renterName },
        cc: payload.cc && payload.cc.length > 0 ? payload.cc : undefined,
        replyTo: payload.replyTo || "support@beforelisted.com",
        subject,
        html,
      };

      return await this.sendEmail(
        emailOptions,
        "RENTER_OPPORTUNITY_FOUND_OTHER_AGENT",
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send other agent opportunity notification to renter",
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
   * Send match referral acknowledgment to matching agent for non-registered matches
   */
  async sendMatchReferralAcknowledgmentToMatchingAgent(
    payload: IMatchReferralAcknowledgmentToMatchingAgentPayload,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to },
        "Sending match referral acknowledgment to matching agent",
      );

      const html = matchReferralAcknowledgmentToMatchingAgentTemplate(
        payload.matchedAgentName,
        payload.renterFullName,
        payload.registeredAgentFullName,
        payload.registeredAgentTitle,
        payload.registeredAgentBrokerage,
        this.config.logoUrl,
        this.config.brandColor,
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.matchedAgentName },
        cc: payload.cc && payload.cc.length > 0 ? payload.cc : undefined,
        replyTo: "support@beforelisted.com",
        subject: "Beforelisted match \u2013 referral acknowledgment",
        html,
      };

      return await this.sendEmail(
        emailOptions,
        "MATCH_REFERRAL_ACKNOWLEDGMENT",
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send match referral acknowledgment to matching agent",
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
   * Send agent alert when renter request is closed
   */
  async sendRenterRequestClosedAgentAlert(
    payload: IRenterRequestClosedAgentAlertPayload,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to, requestId: payload.requestId },
        "Sending renter request closed alert to agent",
      );

      const html = renterRequestClosedAgentAlertTemplate(
        payload.agentName,
        payload.requestId,
        payload.reason,
        payload.closedAt,
        this.config.logoUrl,
        this.config.brandColor,
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.agentName },
        cc: payload.cc && payload.cc.length > 0 ? payload.cc : undefined,
        replyTo: "support@beforelisted.com",
        subject: "Renter Request Closed | BeforeListed\u2122",
        html,
      };

      return await this.sendEmail(
        emailOptions,
        "RENTER_REQUEST_CLOSED_AGENT_ALERT",
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send renter request closed alert to agent",
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
   * Send admin notification when agent completes registration and verification
   */
  async sendAgentRegistrationVerifiedAdminNotification(
    payload: IAgentRegistrationVerifiedAdminPayload,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to, agentEmail: payload.agentEmail },
        "Sending agent registration verified notification to admin",
      );

      const html = agentRegistrationVerifiedAdminTemplate(
        payload.agentFirstName,
        payload.agentLastName,
        payload.agentTitle,
        payload.agentBrokerage,
        payload.agentEmail,
        payload.agentPhoneNumber,
        payload.registrationDate,
        payload.agentRegistrationLink,
        this.config.logoUrl,
        this.config.brandColor,
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: "Admin" },
        cc: undefined,
        replyTo: "support@beforelisted.com",
        subject: "Action Required: New Agent Registration Pending Activation | BeforeListed\u2122",
        html,
      };

      return await this.sendEmail(
        emailOptions,
        "AGENT_REGISTRATION_VERIFIED_ADMIN",
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send agent registration verified admin email",
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
   * Send admin notification when renter completes registration and verification
   */
  async sendRenterRegistrationVerifiedAdminNotification(
    payload: IRenterRegistrationVerifiedAdminPayload,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to, renterEmail: payload.renterEmail },
        "Sending renter registration verified notification to admin",
      );

      const html = renterRegistrationVerifiedAdminTemplate(
        payload.renterName,
        payload.renterPhone,
        payload.renterEmail,
        payload.registrationDate,
        payload.registeredAgentName,
        payload.registeredAgentBrokerage,
        this.config.logoUrl,
        this.config.brandColor,
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: "Admin" },
        cc: undefined,
        replyTo: "support@beforelisted.com",
        subject: "New Renter Registration Completed | BeforeListed\u2122",
        html,
      };

      return await this.sendEmail(
        emailOptions,
        "RENTER_REGISTRATION_VERIFIED_ADMIN",
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send renter registration verified admin email",
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
   * Send public contact request to admin
   */
  async sendAdminContactRequest(
    payload: IAdminContactRequestPayload,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to, senderEmail: payload.senderEmail },
        "Sending public contact request to admin",
      );

      const subjectLine =
        payload.subject.replace(/[\r\n]+/g, " ").trim() ||
        "New contact message from public user";

      const html = adminContactRequestTemplate(
        payload.senderEmail,
        subjectLine,
        payload.message,
        payload.receivedAt,
        payload.ipAddress!,
        payload.userAgent,
        this.config.logoUrl,
        this.config.brandColor,
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: "Administrator" },
        subject: `[CONTACT] ${subjectLine}`,
        html,
        replyTo: payload.senderEmail,
        tags: ["contact", "public"],
        metadata: {
          senderEmail: payload.senderEmail,
        },
      };

      return await this.sendEmail(
        emailOptions,
        "ADMIN_CONTACT_REQUEST",
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
          senderEmail: payload.senderEmail,
        },
        "Failed to send admin contact request",
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
  /**
   * Send admin referral email with temporary password
   * Called during: Admin referral renter registration (passwordless flow)
   *
   * @param payload - Admin referral email details
   * @returns Promise<IEmailResult>
   */
  async sendAdminReferralEmail(
    payload: IAdminReferralEmailPayload,
  ): Promise<IEmailResult> {
    try {
      logger.debug(
        { email: payload.to, userName: payload.userName },
        "Sending admin referral email with temporary password",
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
        this.config.brandColor,
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
        "Failed to send admin referral email",
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
    recipientEmail: string,
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
          `❌ Email send failed: ${templateType}`,
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
        `✅ Email sent successfully: ${templateType}`,
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
        `❌ Unexpected error sending email: ${templateType}`,
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
    adminName: string;
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
        payload.adminName,
        payload.agentName,
        payload.agentEmail,
        payload.agentCompany,
        payload.preMarketRequestId,
        payload.propertyTitle,
        payload.location,
        payload.requestedAt,
        payload.adminDashboardLink,
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: "Administrator" },
        cc: undefined,
        replyTo: "support@beforelisted.com",
        subject: template.getSubject(),
        html: template.render(),
        priority: template.getEmailPriority(),
      };

      return await this.sendEmail(
        emailOptions,
        "GRANT_ACCESS_REQUEST_ADMIN",
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send grant access request email",
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
        payload.accessLink,
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
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send grant access approval email",
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
        payload.contactEmail,
      );

      const emailOptions: IEmailOptions = {
        to: { email: payload.to, name: payload.agentName },
        subject: template.getSubject(),
        html: template.render(),
      };

      return await this.sendEmail(
        emailOptions,
        "GRANT_ACCESS_REJECTION_AGENT",
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send grant access rejection email",
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
        payload.paymentDeadline,
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
        payload.to,
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: payload.to,
        },
        "Failed to send payment link email",
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
        "Error closing email service connection",
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
      "Failed to initialize email service",
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
      "Error during email service cleanup",
    );
  }
}
