import { env } from "@/env";
import { logger } from "@/middlewares/pino-logger";
import nodemailer from "nodemailer";

export class EmailService {
  private transporter: nodemailer.Transporter;
  private brandColor: string = "#FF69B4";

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: env.SMTP_USERNAME,
        pass: env.SMTP_PASSWORD,
      },
    });
  }

  async sendPasswordResetEmail(
    email: string,
    resetCode: string,
    fullName: string
  ): Promise<void> {
    const mailOptions = {
      from: `"No Reply - ${env.APP_NAME}" <${env.SMTP_FROM_EMAIL}>`,
      to: email,
      subject: "Password Reset Verification Code - Southern Change",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header with Brand -->
            <div style="background: linear-gradient(135deg, ${this.brandColor} 0%, #ff8ec7 100%); padding: 40px 20px; text-align: center; border-radius: 0;">
              <div style="background: white; display: inline-block; padding: 15px; border-radius: 50%; margin-bottom: 20px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center;">
                 <img src="cid:sc_logo" style="width:100px; height:auto; margin:0 auto 20px; display:block;" />
                </div>
              </div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                Password Reset Request
              </h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 16px;">
                Southern Change Behavioral Health Services
              </p>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #2c3e50; margin: 0 0 10px; font-size: 24px; font-weight: 400;">
                  Hello, ${fullName}
                </h2>
                <div style="width: 60px; height: 3px; background: ${this.brandColor}; margin: 0 auto; border-radius: 2px;"></div>
              </div>
              
              <p style="color: #5a6c7d; line-height: 1.8; font-size: 16px; text-align: center; margin: 0 0 30px;">
                We received a request to reset your password for your Southern Change account. 
                Use the verification code below to proceed with resetting your password.
              </p>
              
              <!-- Verification Code Box -->
              <div style="background: linear-gradient(135deg, #f8f9ff 0%, #fff 100%); border: 2px solid ${this.brandColor}; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; position: relative; overflow: hidden;">
                <div style="position: absolute; top: -10px; right: -10px; width: 40px; height: 40px; background: ${this.brandColor}; border-radius: 50%; opacity: 0.1;"></div>
                <div style="position: absolute; bottom: -20px; left: -20px; width: 60px; height: 60px; background: ${this.brandColor}; border-radius: 50%; opacity: 0.05;"></div>
                
                <p style="color: #7c8ba1; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 15px; font-weight: 600;">
                  Your Verification Code
                </p>
                
                <div style="font-size: 36px; font-weight: bold; color: ${this.brandColor}; letter-spacing: 8px; font-family: 'Courier New', monospace; margin: 10px 0; text-shadow: 0 2px 4px rgba(255, 105, 180, 0.2);">
                  ${resetCode}
                </div>
                
                <p style="color: #a0aec0; font-size: 12px; margin: 15px 0 0; font-style: italic;">
                  Enter this code exactly as shown
                </p>
              </div>
              
              <!-- Important Notice -->
              <div style="background: #fff8f0; border-left: 4px solid #ff9500; padding: 20px; border-radius: 0 8px 8px 0; margin: 30px 0;">
                <div style="display: flex; align-items: center;">
                  <div style="width: 20px; height: 20px; background: #ff9500; border-radius: 50%; color: white; text-align: center; line-height: 20px; font-size: 12px; font-weight: bold; margin-right: 15px; flex-shrink: 0;">!</div>
                  <div>
                    <p style="color: #8b5a2b; margin: 0; font-size: 14px; font-weight: 600;">
                      Important Security Information
                    </p>
                    <p style="color: #8b5a2b; margin: 5px 0 0; font-size: 13px; line-height: 1.5;">
                      This verification code will expire in <strong>15 minutes</strong> for your security. 
                      If you didn't request this password reset, please contact our support team immediately.
                    </p>
                  </div>
                </div>
              </div>
              
              <!-- Support Section -->
              <div style="text-align: center; margin: 40px 0 20px;">
                <p style="color: #7c8ba1; font-size: 14px; margin: 0 0 10px;">
                  Need help? Our support team is here for you.
                </p>
                <a href="mailto:support@southernchange.com" style="color: ${this.brandColor}; text-decoration: none; font-weight: 600; font-size: 14px; border-bottom: 1px solid ${this.brandColor};">
                  support@southernchange.com
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f7f8fc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <div style="margin-bottom: 15px;">
<div style="width: 40px; height: 40px; background: url('cid:sc_logo') no-repeat center; background-size: contain; margin: 0 auto 10px; opacity: 0.7;"></div>
                <p style="color: ${this.brandColor}; font-size: 16px; font-weight: 600; margin: 0;">
                  Southern Change
                </p>
                <p style="color: #a0aec0; font-size: 12px; margin: 5px 0 0;">
                  Behavioral Health Services
                </p>
              </div>
              
              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
                <p style="color: #a0aec0; font-size: 11px; line-height: 1.5; margin: 0;">
                  This is an automated security message from Southern Change Behavioral Health Services.<br>
                  Please do not reply to this email. If you have questions, contact our support team.<br><br>
                  
                  <span style="color: #cbd5e0;">
                    © ${new Date().getFullYear()} Southern Change Behavioral Health Services. All rights reserved.
                  </span>
                </p>
              </div>
            </div>
            
          </div>
          
          <!-- Mobile Responsive Styles -->
          <style>
            @media only screen and (max-width: 600px) {
              .container { width: 100% !important; }
              .content { padding: 20px !important; }
              .code { font-size: 28px !important; letter-spacing: 4px !important; }
            }
          </style>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: "logo.png",
          cid: "sc_logo",
          content: SOUTHERN_CHANGE_LOGO_PNG_BASE64.split(",")[1],
          encoding: "base64",
          contentType: "image/png",
        },
      ],
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to: ${email}`);
    } catch (error) {
      logger.error(error, `Failed to send password reset email to ${email}:`);
      throw new Error("Failed to send email");
    }
  }

  // Welcome email for new users
  async sendWelcomeWithPassword(
    email: string,
    fullName: string,
    password: string,
    verificationLink: string
  ): Promise<void> {
    const subject = "Welcome to Rental Penny More - Your Account Details";

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .password-box { background: #fff; border: 2px solid #4CAF50; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .password { font-size: 18px; font-weight: bold; color: #4CAF50; font-family: monospace; }
        .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Rental Penny More!</h1>
        </div>
        
        <div class="content">
          <p>Hello ${fullName},</p>
          
          <p>You've been invited to join Rental Penny More. Your account has been created with the following credentials:</p>
          
          <div class="password-box">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong></p>
            <p class="password">${password}</p>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important Security Notice:</strong>
            <ul>
              <li>This password was automatically generated for your security</li>
              <li>Please change it immediately after your first login</li>
              <li>Do not share this password with anyone</li>
              <li>Keep this email secure or delete it after changing your password</li>
            </ul>
          </div>
          
          <p>To activate your account, please verify your email address:</p>
          
          <a href="${verificationLink}" class="button">Verify Email Address</a>
          
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationLink}</p>
          
          <p>After verifying your email, you can log in and change your password in your account settings.</p>
          
          <p>If you didn't request this account, please ignore this email or contact our support team.</p>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} Rental Penny More. All rights reserved.</p>
          <p>This email was sent to ${email}</p>
        </div>
      </div>
    </body>
    </html>
  `;

    await this.sendEmail(email, subject, htmlContent);
  }
}
