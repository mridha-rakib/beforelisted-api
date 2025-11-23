// file: src/services/email.service.ts
/**
 * BeforeListed Email Service
 * ✅ Unified email service for Agents & Renters
 * ✅ No duplicate methods
 * ✅ Handles both user types automatically
 * ✅ SendGrid integration ready
 */

import { logger } from "@/middlewares/pino-logger";
import sgMail from "@sendgrid/mail";
import { EmailTemplateHelper } from "./email.integration.beforelisted";
import { EmailTemplates } from "./email.templates.beforelisted";

type UserType = "Agent" | "Renter";

export class EmailService {
  private sgMail: any;

  constructor() {
    this.sgMail = sgMail;
    this.sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  // ============================================
  // UNIFIED EMAIL VERIFICATION METHOD
  // ============================================
  /**
   * Send email verification code to Agent or Renter
   * Single method handles both user types
   *
   * Called from:
   * - agent.service.ts::registerAgent()
   * - renter.service.ts::registerRenter()
   */
  async sendEmailVerificationCode(
    fullName: string,
    email: string,
    verificationCode: string,
    expiresInMinutes: number,
    userType: UserType = "Renter" // Default to Renter if not specified
  ): Promise<void> {
    try {
      const html = EmailTemplateHelper.replaceVariables(
        EmailTemplates.emailVerificationCodeEmail(),
        {
          userName: fullName,
          verificationCode,
          expiresIn: `${expiresInMinutes} minutes`,
          userType,
          currentYear: EmailTemplateHelper.getCurrentYear(),
        }
      );

      const subject =
        userType === "Agent"
          ? "Verify Your Email - BeforeListed Agent Portal"
          : "Verify Your Email - BeforeListed";

      await this.sgMail.send({
        to: email,
        from: process.env.FROM_EMAIL || "noreply@beforelisted.com",
        subject,
        html,
      });

      logger.info({ email, userType }, `${userType} verification email sent`);
    } catch (error) {
      logger.error(error, `Failed to send ${userType} verification email`);
      throw error;
    }
  }

  // ============================================
  // WELCOME EMAIL (After Verification)
  // ============================================
  /**
   * Send welcome email to Agent or Renter
   * Called after email verification is complete
   *
   * Called from:
   * - agent.service.ts::verifyEmail() [assumed]
   * - renter.service.ts::verifyEmail() [assumed]
   */
  async sendWelcomeEmail(
    fullName: string,
    email: string,
    userType: UserType = "Renter"
  ): Promise<void> {
    try {
      const loginLink =
        userType === "Agent"
          ? `${process.env.APP_URL}/agent/login`
          : `${process.env.APP_URL}/renter/login`;

      const html = EmailTemplateHelper.replaceVariables(
        EmailTemplates.welcomeEmail(),
        {
          userName: fullName,
          email,
          userType,
          loginLink,
          currentYear: EmailTemplateHelper.getCurrentYear(),
        }
      );

      const subject =
        userType === "Agent"
          ? "Welcome to BeforeListed - Agent Portal"
          : "Welcome to BeforeListed";

      await this.sgMail.send({
        to: email,
        from: process.env.FROM_EMAIL || "noreply@beforelisted.com",
        subject,
        html,
      });

      logger.info({ email, userType }, `${userType} welcome email sent`);
    } catch (error) {
      logger.error(error, `Failed to send ${userType} welcome email`);
      throw error;
    }
  }

  // ============================================
  // RENTER-SPECIFIC EMAILS
  // ============================================

  /**
   * Send welcome email with auto-generated password
   * Called from: renter.service.ts::registerRenter() - Admin referral flow
   *
   * Used when admin creates a renter account with auto-generated password
   */
  async sendWelcomeWithPassword(
    email: string,
    fullName: string,
    tempPassword: string,
    verificationCode: string,
    expiresInMinutes: number
  ): Promise<void> {
    try {
      const changePasswordLink = `${process.env.APP_URL}/settings/change-password`;

      const html = EmailTemplateHelper.replaceVariables(
        EmailTemplates.welcomeWithAutoPasswordEmail(),
        {
          userName: fullName,
          email,
          tempPassword,
          verificationCode,
          expiresIn: `${expiresInMinutes} minutes`,
          changePasswordLink,
          currentYear: EmailTemplateHelper.getCurrentYear(),
        }
      );

      await this.sgMail.send({
        to: email,
        from: process.env.FROM_EMAIL || "noreply@beforelisted.com",
        subject: "Your BeforeListed Renter Account is Ready",
        html,
      });

      logger.info({ email }, "Welcome email with password sent");
    } catch (error) {
      logger.error(error, "Failed to send welcome email with password");
      throw error;
    }
  }

  /**
   * Send renter match notification
   * Called from: Match/Notification service when new matches available
   */
  async sendRenterMatchNotification(
    renterName: string,
    email: string,
    matchCount: number
  ): Promise<void> {
    try {
      const viewMatchesLink = `${process.env.APP_URL}/renter/matches`;

      const html = EmailTemplateHelper.replaceVariables(
        EmailTemplates.matchNotificationEmail(),
        {
          renterName,
          matchCount: matchCount.toString(),
          viewMatchesLink,
          currentYear: EmailTemplateHelper.getCurrentYear(),
        }
      );

      await this.sgMail.send({
        to: email,
        from: process.env.FROM_EMAIL || "noreply@beforelisted.com",
        subject: `New Property Matches on BeforeListed - ${matchCount} properties found`,
        html,
      });

      logger.info({ email, matchCount }, "Match notification email sent");
    } catch (error) {
      logger.error(error, "Failed to send match notification");
      throw error;
    }
  }

  // ============================================
  // AGENT-SPECIFIC EMAILS
  // ============================================

  /**
   * Send agent approval email
   * Called from: agent.service.ts::adminApproveAgent()
   */
  async sendAgentApprovalEmail(
    agentName: string,
    email: string,
    licenseNumber: string,
    brokerageName: string,
    adminNotes: string
  ): Promise<void> {
    try {
      const dashboardLink = `${process.env.APP_URL}/agent/dashboard`;

      const html = EmailTemplateHelper.replaceVariables(
        EmailTemplates.agentApprovalEmail(),
        {
          agentName,
          agentEmail: email,
          licenseNumber,
          brokerageName,
          adminNotes: adminNotes || "Welcome to BeforeListed!",
          dashboardLink,
          currentYear: EmailTemplateHelper.getCurrentYear(),
        }
      );

      await this.sgMail.send({
        to: email,
        from: process.env.FROM_EMAIL || "noreply@beforelisted.com",
        subject: "Your BeforeListed Agent Account Has Been Approved ✓",
        html,
      });

      logger.info({ email }, "Agent approval email sent");
    } catch (error) {
      logger.error(error, "Failed to send agent approval email");
      throw error;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
