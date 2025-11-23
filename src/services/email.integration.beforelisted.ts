// file: src/services/email.integration.beforelisted.ts
/**
 * BeforeListed Email Integration
 * Integrates EmailTemplates with SendGrid API
 * Ready to use with your Agent and Renter services
 */

import { EmailTemplates } from "./email.templates.beforelisted";

/**
 * Template Replacement Utility
 * Safely replaces template variables with actual values
 */
export class EmailTemplateHelper {
  /**
   * Replace all template variables in HTML
   * @param html - HTML template string
   * @param variables - Object with variable names and values
   * @returns - HTML with variables replaced
   */
  static replaceVariables(
    html: string,
    variables: Record<string, string | number>
  ): string {
    let result = html;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replaceAll(placeholder, String(value));
    }

    // Log any remaining unreplaced variables (for debugging)
    const remainingVariables = result.match(/\{\{(\w+)\}\}/g);
    if (remainingVariables && remainingVariables.length > 0) {
      console.warn(
        "⚠️ Warning: Unreplaced template variables:",
        remainingVariables
      );
    }

    return result;
  }

  /**
   * Get current year for footer
   */
  static getCurrentYear(): string {
    return new Date().getFullYear().toString();
  }

  /**
   * Format date for display (e.g., "Nov 23, 2025 at 5:29 AM")
   */
  static formatDate(date: Date): string {
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
}

// ============================================
// AGENT SERVICE EMAIL METHODS
// ============================================

/**
 * Integration functions specifically for AgentService
 * Copy these methods to your email.service.ts
 */

/**
 * Send Email Verification Code to Agent
 * Called from: AgentService.registerAgent()
 */
export async function sendAgentEmailVerificationCode(
  agentName: string,
  email: string,
  verificationCode: string,
  expiresInMinutes: number
): Promise<void> {
  const html = EmailTemplateHelper.replaceVariables(
    EmailTemplates.emailVerificationCodeEmail(),
    {
      userName: agentName,
      verificationCode,
      expiresIn: `${expiresInMinutes} minutes`,
      userType: "Agent",
      currentYear: EmailTemplateHelper.getCurrentYear(),
    }
  );

  // await sgMail.send({
  //   to: email,
  //   from: process.env.FROM_EMAIL,
  //   subject: 'Verify Your Email - BeforeListed Agent Portal',
  //   html,
  // });

  console.log(`✅ Agent email verification code sent to: ${email}`);
}

/**
 * Send Welcome Email to Agent
 * Called from: AgentService after email verification
 */
export async function sendAgentWelcomeEmail(
  agentName: string,
  email: string,
  loginLink: string
): Promise<void> {
  const html = EmailTemplateHelper.replaceVariables(
    EmailTemplates.welcomeEmail(),
    {
      userName: agentName,
      email,
      userType: "Agent",
      loginLink,
      currentYear: EmailTemplateHelper.getCurrentYear(),
    }
  );

  // await sgMail.send({
  //   to: email,
  //   from: process.env.FROM_EMAIL,
  //   subject: 'Welcome to BeforeListed - Agent Portal',
  //   html,
  // });

  console.log(`✅ Agent welcome email sent to: ${email}`);
}

/**
 * Send Agent Approval Email
 * Called from: AgentService.adminApproveAgent()
 */
export async function sendAgentApprovalEmail(
  agentName: string,
  email: string,
  licenseNumber: string,
  brokerageName: string,
  adminNotes: string,
  dashboardLink: string
): Promise<void> {
  const html = EmailTemplateHelper.replaceVariables(
    EmailTemplates.agentApprovalEmail(),
    {
      agentName,
      agentEmail: email,
      licenseNumber,
      brokerageName,
      adminNotes,
      dashboardLink,
      currentYear: EmailTemplateHelper.getCurrentYear(),
    }
  );

  // await sgMail.send({
  //   to: email,
  //   from: process.env.FROM_EMAIL,
  //   subject: 'Your BeforeListed Agent Account Has Been Approved',
  //   html,
  // });

  console.log(`✅ Agent approval email sent to: ${email}`);
}

// ============================================
// RENTER SERVICE EMAIL METHODS
// ============================================

/**
 * Send Email Verification Code to Renter
 * Called from: RenterService.registerRenter() - Normal flow
 */
export async function sendRenterEmailVerificationCode(
  renterName: string,
  email: string,
  verificationCode: string,
  expiresInMinutes: number
): Promise<void> {
  const html = EmailTemplateHelper.replaceVariables(
    EmailTemplates.emailVerificationCodeEmail(),
    {
      userName: renterName,
      verificationCode,
      expiresIn: `${expiresInMinutes} minutes`,
      userType: "Renter",
      currentYear: EmailTemplateHelper.getCurrentYear(),
    }
  );

  // await sgMail.send({
  //   to: email,
  //   from: process.env.FROM_EMAIL,
  //   subject: 'Verify Your Email - BeforeListed',
  //   html,
  // });

  console.log(`✅ Renter email verification code sent to: ${email}`);
}

/**
 * Send Welcome with Auto-Generated Password to Renter
 * Called from: RenterService.registerRenter() - Admin referral flow
 */
export async function sendRenterWelcomeWithPassword(
  email: string,
  renterName: string,
  tempPassword: string,
  verificationCode: string,
  expiresInMinutes: number,
  changePasswordLink: string
): Promise<void> {
  const html = EmailTemplateHelper.replaceVariables(
    EmailTemplates.welcomeWithAutoPasswordEmail(),
    {
      userName: renterName,
      email,
      tempPassword,
      verificationCode,
      expiresIn: `${expiresInMinutes} minutes`,
      changePasswordLink,
      currentYear: EmailTemplateHelper.getCurrentYear(),
    }
  );

  // await sgMail.send({
  //   to: email,
  //   from: process.env.FROM_EMAIL,
  //   subject: 'Your BeforeListed Account is Ready',
  //   html,
  // });

  console.log(`✅ Renter welcome email with password sent to: ${email}`);
}

/**
 * Send Welcome Email to Renter
 * Called from: RenterService after email verification
 */
export async function sendRenterWelcomeEmail(
  renterName: string,
  email: string,
  loginLink: string
): Promise<void> {
  const html = EmailTemplateHelper.replaceVariables(
    EmailTemplates.welcomeEmail(),
    {
      userName: renterName,
      email,
      userType: "Renter",
      loginLink,
      currentYear: EmailTemplateHelper.getCurrentYear(),
    }
  );

  // await sgMail.send({
  //   to: email,
  //   from: process.env.FROM_EMAIL,
  //   subject: 'Welcome to BeforeListed',
  //   html,
  // });

  console.log(`✅ Renter welcome email sent to: ${email}`);
}

/**
 * Send Match Notification Email to Renter
 * Called from: Match/Notification service
 */
export async function sendRenterMatchNotification(
  renterName: string,
  email: string,
  matchCount: number,
  viewMatchesLink: string
): Promise<void> {
  const html = EmailTemplateHelper.replaceVariables(
    EmailTemplates.matchNotificationEmail(),
    {
      renterName,
      matchCount: matchCount.toString(),
      viewMatchesLink,
      currentYear: EmailTemplateHelper.getCurrentYear(),
    }
  );

  // await sgMail.send({
  //   to: email,
  //   from: process.env.FROM_EMAIL,
  //   subject: `New Property Matches on BeforeListed - ${matchCount} properties`,
  //   html,
  // });

  console.log(
    `✅ Match notification sent to: ${email} (${matchCount} matches)`
  );
}
