// file: src/services/email.service.ts (ADD NEW METHODS)

class EmailService {
  // ... existing methods ...

  /**
   * Send email verification code (4-digit OTP)
   * ✅ NEW METHOD
   */
  async sendEmailVerificationCode(
    name: string,
    email: string,
    code: string,
    expiresInMinutes: number = 10
  ): Promise<void> {
    const subject = "Verify Your Email - RentConnect";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #21808D; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .code-box { 
            background: white; 
            border: 2px solid #21808D; 
            padding: 20px; 
            text-align: center; 
            margin: 20px 0;
            border-radius: 8px;
          }
          .code { 
            font-size: 32px; 
            font-weight: bold; 
            color: #21808D; 
            letter-spacing: 8px;
          }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .warning { color: #d32f2f; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Email Verification</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${name}</strong>,</p>
            
            <p>Thank you for registering with RentConnect! To complete your registration, please verify your email address.</p>
            
            <p>Your verification code is:</p>
            
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            
            <p><strong>This code will expire in ${expiresInMinutes} minutes.</strong></p>
            
            <p>You have 3 attempts to enter the correct code. If you didn't create an account, please ignore this email.</p>
            
            <p class="warning">⚠️ Do not share this code with anyone.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} RentConnect. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, subject, html);
    logger.info({ email }, "Email verification code sent");
  }

  /**
   * Send email verification confirmation
   * ✅ NEW METHOD
   */
  async sendEmailVerificationConfirmation(
    name: string,
    email: string
  ): Promise<void> {
    const subject = "Email Verified - Welcome to RentConnect!";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #21808D; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .success-icon { font-size: 64px; text-align: center; margin: 20px 0; }
          .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background: #21808D; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Email Verified!</h1>
          </div>
          <div class="content">
            <div class="success-icon">✅</div>
            
            <p>Hi <strong>${name}</strong>,</p>
            
            <p>Great news! Your email address has been successfully verified.</p>
            
            <p>You can now enjoy full access to RentConnect:</p>
            
            <ul>
              <li>Create and manage pre-market requests</li>
              <li>Connect with verified agents</li>
              <li>Receive match notifications</li>
              <li>Access your personalized dashboard</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/login" class="button">Go to Dashboard</a>
            </div>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            
            <p>Welcome aboard! 🎉</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} RentConnect. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, subject, html);
    logger.info({ email }, "Email verification confirmation sent");
  }

  // ... rest of existing methods
}

export const emailService = new EmailService();
