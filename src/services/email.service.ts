import { EMAIL } from "@/constants/app.constants";
import { env } from "@/env";
import { logger } from "@/middlewares/pino-logger";
import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USERNAME,
        pass: env.SMTP_PASSWORD,
      },
    });
  }

  /**
   * Send email
   */
  async send(payload: EmailPayload): Promise<void> {
    try {
      const mailOptions = {
        from: `${EMAIL.FROM_NAME} <${EMAIL.FROM}>`,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info(
        { messageId: info.messageId, to: payload.to },
        "Email sent successfully"
      );
    } catch (error) {
      logger.error(
        { error, to: payload.to, subject: payload.subject },
        "Failed to send email"
      );
      throw error;
    }
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(
    email: string,
    fullName: string,
    verificationLink: string
  ): Promise<void> {
    const html = this.emailVerificationTemplate(fullName, verificationLink);
    await this.send({
      to: email,
      subject: "Verify Your Email Address",
      html,
    });
  }

  /**
   * Send password reset OTP
   */
  async sendPasswordResetOTP(
    email: string,
    fullName: string,
    otp: string
  ): Promise<void> {
    const html = this.passwordResetOTPTemplate(fullName, otp);
    await this.send({
      to: email,
      subject: "Password Reset - OTP Code",
      html,
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(
    email: string,
    fullName: string,
    role: string
  ): Promise<void> {
    const html = this.welcomeTemplate(fullName, role);
    await this.send({
      to: email,
      subject: `Welcome to ${EMAIL.FROM_NAME}, ${fullName}!`,
      html,
    });
  }

  /**
   * Send admin referral email (passwordless registration)
   */
  async sendAdminReferralEmail(
    email: string,
    fullName: string,
    registrationLink: string
  ): Promise<void> {
    const html = this.adminReferralTemplate(fullName, registrationLink);
    await this.send({
      to: email,
      subject: "You are invited to join the platform",
      html,
    });
  }

  /**
   * Send agent referral email
   */
  async sendAgentReferralEmail(
    email: string,
    fullName: string,
    referralLink: string,
    referrerName: string
  ): Promise<void> {
    const html = this.agentReferralTemplate(
      fullName,
      referralLink,
      referrerName
    );
    await this.send({
      to: email,
      subject: `${referrerName} invited you to join`,
      html,
    });
  }

  /**
   * Email verification template
   */
  private emailVerificationTemplate(
    fullName: string,
    verificationLink: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .button { background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${EMAIL.FROM_NAME}</h1>
    </div>
    <div class="content">
      <p>Hi ${fullName},</p>
      <p>Thank you for registering! Please verify your email address by clicking the button below.</p>
      <a href="${verificationLink}" class="button">Verify Email</a>
      <p style="color: #999; font-size: 12px;">
        This link will expire in 24 hours. If you didn't create this account, please ignore this email.
      </p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${EMAIL.FROM_NAME}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Password reset OTP template
   */
  private passwordResetOTPTemplate(fullName: string, otp: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #ff6b6b; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .otp-box { background-color: #fff; border: 2px solid #ff6b6b; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; }
    .otp-code { font-size: 32px; font-weight: bold; color: #ff6b6b; letter-spacing: 5px; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hi ${fullName},</p>
      <p>We received a request to reset your password. Use the OTP code below:</p>
      <div class="otp-box">
        <p>Your OTP Code:</p>
        <p class="otp-code">${otp}</p>
      </div>
      <p style="color: #999; font-size: 12px;">
        This code will expire in 10 minutes. If you didn't request this, please ignore this email.
      </p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${EMAIL.FROM_NAME}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Welcome template
   */
  private welcomeTemplate(fullName: string, role: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to ${EMAIL.FROM_NAME}!</h1>
    </div>
    <div class="content">
      <p>Hi ${fullName},</p>
      <p>Welcome aboard! Your account has been created successfully as a ${role}.</p>
      <p>You can now log in to your account and start using all our features.</p>
      <p>If you have any questions, feel free to contact our support team.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${EMAIL.FROM_NAME}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Admin referral template
   */
  private adminReferralTemplate(
    fullName: string,
    registrationLink: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .button { background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to ${EMAIL.FROM_NAME}</h1>
    </div>
    <div class="content">
      <p>Hi ${fullName},</p>
      <p>You have been invited to join ${EMAIL.FROM_NAME}. Click the button below to complete your registration.</p>
      <a href="${registrationLink}" class="button">Complete Registration</a>
      <p style="color: #999; font-size: 12px;">
        This link will expire in 30 days. If you didn't expect this invitation, please ignore this email.
      </p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${EMAIL.FROM_NAME}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Agent referral template
   */
  private agentReferralTemplate(
    fullName: string,
    referralLink: string,
    referrerName: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .button { background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Join ${EMAIL.FROM_NAME}</h1>
    </div>
    <div class="content">
      <p>Hi ${fullName},</p>
      <p><strong>${referrerName}</strong> has invited you to join ${EMAIL.FROM_NAME}.</p>
      <p>Join now using the link below:</p>
      <a href="${referralLink}" class="button">Accept Invitation</a>
      <p style="color: #999; font-size: 12px;">
        This link will expire in 30 days.
      </p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${EMAIL.FROM_NAME}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }
}

export const emailService = new EmailService();
