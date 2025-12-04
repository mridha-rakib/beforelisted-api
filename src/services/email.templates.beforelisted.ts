// file: src/services/email.templates.beforelisted.ts

export class EmailTemplates {
  private logoUrl: string =
    "https://agi-prod-file-upload-public-main-use1.s3.amazonaws.com/d6a6bcf9-cea1-471c-a177-563559b38b29";
  private brandColor: string = "#2180E1";
  private supportEmail: string = "support@beforelisted.com";

  private getLogoStyles(): string {
    return `
      .logo {
        display: block;
        max-width: 150px;
        width: 100%;
        height: auto;
        margin: 0 auto 20px auto;
      }
      
      @media (max-width: 480px) {
        .logo {
          max-width: 120px;
        }
      }
    `;
  }

  // ============================================
  // WELCOME EMAIL
  // ============================================

  /**
   * Welcome email for new users (standard)
   */
  welcome(
    userName: string,
    userType: "Agent" | "Renter",
    loginLink: string,
    logoUrl?: string,
    brandColor?: string
  ): string {
    const logo = logoUrl || this.logoUrl;
    const color = brandColor || this.brandColor;
    const role = userType === "Agent" ? "Agent" : "Renter";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to BeforeListed</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, ${color} 0%, #1a5fa0 100%);
            padding: 40px 20px;
            text-align: center;
        }
        ${this.getLogoStyles()}
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
        }
        .content h2 {
            color: #333333;
            font-size: 22px;
            margin: 0 0 20px 0;
            font-weight: 600;
        }
        .content p {
            color: #666666;
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 15px 0;
        }
        .highlight {
            background-color: #f0f7ff;
            border-left: 4px solid ${color};
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .highlight p {
            margin: 0;
            color: #333333;
        }
        .cta-button {
            display: inline-block;
            background-color: ${color};
            color: #ffffff;
            padding: 14px 40px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            transition: background-color 0.3s;
        }
        .cta-button:hover {
            background-color: #1a5fa0;
        }
        .features {
            margin: 30px 0;
        }
        .feature-item {
            display: flex;
            margin: 15px 0;
            align-items: flex-start;
        }
        .feature-icon {
            width: 24px;
            height: 24px;
            background-color: ${color};
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            flex-shrink: 0;
            font-size: 14px;
            font-weight: bold;
        }
        .feature-text {
            flex: 1;
            color: #666666;
            font-size: 15px;
        }
        .footer {
            background-color: #f9f9f9;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
        }
        .footer p {
            color: #999999;
            font-size: 13px;
            margin: 5px 0;
        }
        .footer a {
            color: ${color};
            text-decoration: none;
        }
        .divider {
            height: 1px;
            background-color: #e0e0e0;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <img src="${logo}" alt="BeforeListed Logo" class="logo">
            <h1>Welcome to BeforeListed!</h1>
        </div>

        <!-- Content -->
        <div class="content">
            <h2>Hi ${userName},</h2>
            <p>Welcome aboard! We're excited to have you join our community of ${role}s who are transforming the real estate experience.</p>

            <div class="highlight">
                <p><strong>Your account is ready to use!</strong> Start exploring and managing your real estate activities with ease.</p>
            </div>

            <div style="text-align: center;">
                <a href="${loginLink}" class="cta-button">Go to Dashboard</a>
            </div>

            <h2 style="margin-top: 30px;">What You Can Do Now:</h2>
            <div class="features">
                <div class="feature-item">
                    <div class="feature-icon">✓</div>
                    <div class="feature-text"><strong>Complete Your Profile</strong> - Add your professional details and preferences</div>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">✓</div>
                    <div class="feature-text"><strong>Explore Listings</strong> - Browse and manage properties with advanced filters</div>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">✓</div>
                    <div class="feature-text"><strong>Connect & Collaborate</strong> - Build your network and grow your business</div>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">✓</div>
                    <div class="feature-text"><strong>Access Resources</strong> - Get guides, tips, and support materials</div>
                </div>
            </div>

            <div class="divider"></div>

            <p>If you have any questions or need assistance, our support team is here to help. Just reply to this email or visit our help center.</p>

            <p>Happy to have you with us!</p>
            <p><strong>The BeforeListed Team</strong></p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>© ${new Date().getFullYear()} BeforeListed. All rights reserved.</p>
            <p><a href="mailto:${this.supportEmail}">Contact Support</a> | <a href="#">Help Center</a> | <a href="#">Privacy Policy</a></p>
        </div>
    </div>
</body>
</html>
    `;
  }

  // ============================================
  // WELCOME WITH AUTO-GENERATED PASSWORD
  // ============================================

  /**
   * Welcome email with auto-generated password
   */
  welcomeAutoGeneratedPassword(
    userName: string,
    temporaryPassword: string,
    loginLink: string,
    userType: "Agent" | "Renter",
    logoUrl?: string,
    brandColor?: string
  ): string {
    const logo = logoUrl || this.logoUrl;
    const color = brandColor || this.brandColor;
    const role = userType === "Agent" ? "Agent" : "Renter";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your BeforeListed Account is Ready</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, ${color} 0%, #1a5fa0 100%);
            padding: 40px 20px;
            text-align: center;
        }
         ${this.getLogoStyles()}
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
        }
        .content h2 {
            color: #333333;
            font-size: 22px;
            margin: 0 0 20px 0;
            font-weight: 600;
        }
        .content p {
            color: #666666;
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 15px 0;
        }
        .alert-warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .alert-warning p {
            margin: 0;
            color: #856404;
        }
        .credentials-box {
            background-color: #f9f9f9;
            border: 2px solid ${color};
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
        }
        .credential-item {
            margin: 10px 0;
        }
        .credential-label {
            font-size: 12px;
            color: #999999;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .credential-value {
            font-size: 16px;
            color: #333333;
            font-weight: bold;
            word-break: break-all;
        }
        .cta-button {
            display: inline-block;
            background-color: ${color};
            color: #ffffff;
            padding: 14px 40px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            transition: background-color 0.3s;
        }
        .cta-button:hover {
            background-color: #1a5fa0;
        }
        .steps {
            margin: 30px 0;
        }
        .step {
            display: flex;
            margin: 15px 0;
            align-items: flex-start;
        }
        .step-number {
            width: 32px;
            height: 32px;
            background-color: ${color};
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            flex-shrink: 0;
            font-weight: bold;
        }
        .step-text {
            color: #333333;
            font-size: 15px;
            line-height: 1.5;
        }
        .step-text p {
            margin: 0;
        }
        .footer {
            background-color: #f9f9f9;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
        }
        .footer p {
            color: #999999;
            font-size: 13px;
            margin: 5px 0;
        }
        .footer a {
            color: ${color};
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <img src="${logo}" alt="BeforeListed Logo" class="logo">
            <h1>Your Account is Ready!</h1>
        </div>

        <!-- Content -->
        <div class="content">
            <h2>Welcome ${userName}!</h2>
            <p>Your ${role} account has been created and is ready to use. Below are your login credentials:</p>

            <div class="alert-warning">
                <p><strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.</p>
            </div>

            <div class="credentials-box">
                <div class="credential-item">
                    <div class="credential-label">Login Email</div>
                    <div class="credential-value">${userName}</div>
                </div>
                <div class="credential-item">
                    <div class="credential-label">Temporary Password</div>
                    <div class="credential-value">${temporaryPassword}</div>
                </div>
            </div>

            <h2>Getting Started:</h2>
            <div class="steps">
                <div class="step">
                    <div class="step-number">1</div>
                    <div class="step-text">
                        <p><strong>Click the button below</strong> to access your dashboard</p>
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">2</div>
                    <div class="step-text">
                        <p><strong>Use the credentials above</strong> to log in</p>
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <div class="step-text">
                        <p><strong>Change your password immediately</strong> for security</p>
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">4</div>
                    <div class="step-text">
                        <p><strong>Complete your profile</strong> to get started</p>
                    </div>
                </div>
            </div>

            <div style="text-align: center;">
                <a href="${loginLink}" class="cta-button">Access Dashboard</a>
            </div>

            <p>If you did not create this account or have any questions, please contact our support team immediately.</p>

            <p><strong>The BeforeListed Team</strong></p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>© ${new Date().getFullYear()} BeforeListed. All rights reserved.</p>
            <p><a href="mailto:${this.supportEmail}">Contact Support</a> | <a href="#">Help Center</a> | <a href="#">Privacy Policy</a></p>
        </div>
    </div>
</body>
</html>
    `;
  }

  // ============================================
  // EMAIL VERIFICATION
  // ============================================

  /**
   * Email verification code template
   */
  emailVerification(
    userName: string,
    verificationCode: string,
    expiresIn: string,
    // userType: "Agent" | "Renter" | "Admin" | undefined,
    logoUrl?: string,
    brandColor?: string
  ): string {
    const logo = logoUrl || this.logoUrl;
    const color = brandColor || this.brandColor;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - BeforeListed</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, ${color} 0%, #1a5fa0 100%);
            padding: 40px 20px;
            text-align: center;
        }
        ${this.getLogoStyles()}
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
        }
        .content h2 {
            color: #333333;
            font-size: 22px;
            margin: 0 0 20px 0;
            font-weight: 600;
        }
        .content p {
            color: #666666;
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 15px 0;
        }
        .code-box {
            background-color: #f0f7ff;
            border: 2px dashed ${color};
            border-radius: 6px;
            padding: 30px;
            margin: 30px 0;
            text-align: center;
        }
        .code-label {
            font-size: 12px;
            color: #666666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        .code-value {
            font-size: 48px;
            color: ${color};
            font-weight: bold;
            letter-spacing: 6px;
            font-family: 'Courier New', monospace;
        }
        .code-expiry {
            font-size: 13px;
            color: #999999;
            margin-top: 10px;
        }
        .alert-info {
            background-color: #e7f3ff;
            border-left: 4px solid ${color};
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .alert-info p {
            margin: 0;
            color: #004085;
        }
        .footer {
            background-color: #f9f9f9;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
        }
        .footer p {
            color: #999999;
            font-size: 13px;
            margin: 5px 0;
        }
        .footer a {
            color: ${color};
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <img src="${logo}" alt="BeforeListed Logo" class="logo">
            <h1>Verify Your Email</h1>
        </div>

        <!-- Content -->
        <div class="content">
            <h2>Hi ${userName},</h2>
            <p>Thank you for registering with BeforeListed! To complete your registration, please verify your email address using the code below:</p>

            <div class="code-box">
                <div class="code-label">Your Verification Code</div>
                <div class="code-value">${verificationCode}</div>
                <div class="code-expiry">Expires in ${expiresIn}</div>
            </div>

            <div class="alert-info">
                <p><strong>Tip:</strong> If you didn't request this code, you can safely ignore this email. Your account won't be created without verification.</p>
            </div>

            <p>Copy and paste the verification code above on our platform, or click the button if your email client supports it.</p>

            <p style="color: #999999; font-size: 14px;">This code will expire in ${expiresIn}. If it expires, you can request a new verification code.</p>

            <p><strong>The BeforeListed Team</strong></p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>© ${new Date().getFullYear()} BeforeListed. All rights reserved.</p>
            <p><a href="mailto:${this.supportEmail}">Contact Support</a> | <a href="#">Help Center</a> | <a href="#">Privacy Policy</a></p>
        </div>
    </div>
</body>
</html>
    `;
  }

  // ============================================
  // PASSWORD RESET
  // ============================================

  /**
   * Password reset email
   */
  passwordReset(
    userName: string,
    resetLink: string,
    expiresIn: string,
    logoUrl?: string,
    brandColor?: string
  ): string {
    const logo = logoUrl || this.logoUrl;
    const color = brandColor || this.brandColor;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - BeforeListed</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, ${color} 0%, #1a5fa0 100%);
            padding: 40px 20px;
            text-align: center;
        }
        ${this.getLogoStyles()}
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
        }
        .content h2 {
            color: #333333;
            font-size: 22px;
            margin: 0 0 20px 0;
            font-weight: 600;
        }
        .content p {
            color: #666666;
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 15px 0;
        }
        .alert-warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .alert-warning p {
            margin: 0;
            color: #856404;
        }
        .cta-button {
            display: inline-block;
            background-color: ${color};
            color: #ffffff;
            padding: 14px 40px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            transition: background-color 0.3s;
        }
        .cta-button:hover {
            background-color: #1a5fa0;
        }
        .link-box {
            background-color: #f9f9f9;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            word-break: break-all;
        }
        .link-box a {
            color: ${color};
            text-decoration: none;
        }
        .footer {
            background-color: #f9f9f9;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
        }
        .footer p {
            color: #999999;
            font-size: 13px;
            margin: 5px 0;
        }
        .footer a {
            color: ${color};
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <img src="${logo}" alt="BeforeListed Logo" class="logo">
            <h1>Password Reset Request</h1>
        </div>

        <!-- Content -->
        <div class="content">
            <h2>Hi ${userName},</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>

            <div style="text-align: center;">
                <a href="${resetLink}" class="cta-button">Reset Password</a>
            </div>

            <p>Or copy and paste this link in your browser:</p>
            <div class="link-box">
                <a href="${resetLink}">${resetLink}</a>
            </div>

            <div class="alert-warning">
                <p><strong>⚠️ Security Note:</strong> This link will expire in ${expiresIn}. If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
            </div>

            <p>For security reasons, we'll never ask for your password via email. If you need further assistance, contact our support team.</p>

            <p><strong>The BeforeListed Team</strong></p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>© ${new Date().getFullYear()} BeforeListed. All rights reserved.</p>
            <p><a href="mailto:${this.supportEmail}">Contact Support</a> | <a href="#">Help Center</a> | <a href="#">Privacy Policy</a></p>
        </div>
    </div>
</body>
</html>
    `;
  }

  // ============================================
  // PASSWORD CHANGED CONFIRMATION
  // ============================================

  /**
   * Password changed confirmation email
   */
  passwordChanged(
    userName: string,
    changeDate: Date,
    logoUrl?: string,
    brandColor?: string
  ): string {
    const logo = logoUrl || this.logoUrl;
    const color = brandColor || this.brandColor;
    const formattedDate = changeDate.toLocaleString();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed - BeforeListed</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, ${color} 0%, #1a5fa0 100%);
            padding: 40px 20px;
            text-align: center;
        }
        ${this.getLogoStyles()}
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
        }
        .content h2 {
            color: #333333;
            font-size: 22px;
            margin: 0 0 20px 0;
            font-weight: 600;
        }
        .content p {
            color: #666666;
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 15px 0;
        }
        .success-box {
            background-color: #d4edda;
            border-left: 4px solid #28a745;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .success-box p {
            margin: 0;
            color: #155724;
        }
        .info-box {
            background-color: #f9f9f9;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
        }
        .info-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .info-item:last-child {
            border-bottom: none;
        }
        .info-label {
            color: #999999;
            font-size: 14px;
        }
        .info-value {
            color: #333333;
            font-size: 14px;
            font-weight: 500;
        }
        .alert-info {
            background-color: #e7f3ff;
            border-left: 4px solid ${color};
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .alert-info p {
            margin: 0;
            color: #004085;
        }
        .footer {
            background-color: #f9f9f9;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
        }
        .footer p {
            color: #999999;
            font-size: 13px;
            margin: 5px 0;
        }
        .footer a {
            color: ${color};
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <img src="${logo}" alt="BeforeListed Logo" class="logo">
            <h1>Password Updated</h1>
        </div>

        <!-- Content -->
        <div class="content">
            <h2>Hi ${userName},</h2>

            <div class="success-box">
                <p><strong>✅ Your password has been successfully changed.</strong></p>
            </div>

            <p>Here are the details of this change:</p>

            <div class="info-box">
                <div class="info-item">
                    <div class="info-label">Change Date & Time</div>
                    <div class="info-value">${formattedDate}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Account</div>
                    <div class="info-value">${userName}</div>
                </div>
            </div>

            <div class="alert-info">
                <p><strong>💡 Security Tip:</strong> We recommend that you do not share your password with anyone. We'll never ask for your password via email.</p>
            </div>

            <h2 style="margin-top: 30px; font-size: 18px;">If this wasn't you:</h2>
            <p>If you did not make this change or suspect unauthorized access to your account, please reset your password immediately and contact our support team.</p>

            <p><strong>The BeforeListed Team</strong></p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>© ${new Date().getFullYear()} BeforeListed. All rights reserved.</p>
            <p><a href="mailto:${this.supportEmail}">Contact Support</a> | <a href="#">Help Center</a> | <a href="#">Privacy Policy</a></p>
        </div>
    </div>
</body>
</html>
    `;
  }

  // ============================================
  // PASSWORD RESET OTP EMAIL (FIXED)
  // ============================================

  /**
   * Password Reset OTP Template
   * Sent when user requests password reset
   *
   * @param userName - User's full name
   * @param otpCode - 4-digit OTP code
   * @param expiresIn - Minutes until expiration
   * @param userType - User type (Agent or Renter) ✅ NEW
   * @param logoUrl - Brand logo URL
   * @param brandColor - Brand color (hex)
   * @returns HTML string
   */
  passwordResetOTP = (
    userName: string | undefined,
    otpCode: string,
    expiresIn: number,
    userType?: string,
    logoUrl?: string,
    brandColor: string = "#208080"
  ): string => {
    const displayName =
      userName && userName.trim() ? userName.split(" ")[0] : "there";
    const userTypeLabel = userType
      ? userType.charAt(0).toUpperCase() + userType.slice(1)
      : "User"; //

    const logo = logoUrl || this.logoUrl;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Code - BeforeListed</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f5f5f5; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, ${brandColor} 0%, ${brandColor}dd 100%); padding: 40px 20px; text-align: center; color: white; }
    .user-type-badge { display: inline-block; background-color: rgba(255, 255, 255, 0.3); color: white; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; } /* ✅ NEW */
    .logo { max-width: 150px;
            width: 100%;
            height: auto;
            margin: 0 auto 20px auto;
            display: block; }
    .header-title { font-size: 28px; margin: 10px 0; font-weight: 600; }
    .content { padding: 40px 30px; }
    .greeting { font-size: 16px; color: #333333; margin-bottom: 20px; line-height: 1.6; }
    .description { font-size: 14px; color: #666666; margin-bottom: 30px; line-height: 1.6; }
    .otp-section { background-color: #f8f9fa; border-left: 4px solid ${brandColor}; padding: 20px; margin: 30px 0; border-radius: 4px; text-align: center; }
    .otp-label { font-size: 12px; color: #999999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
    .otp-code { font-size: 40px; font-weight: bold; color: ${brandColor}; letter-spacing: 6px; font-family: 'Courier New', monospace; margin: 15px 0; text-align: center; }
    .otp-expires { font-size: 13px; color: #666666; margin-top: 10px; }
    .important-note { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px; }
    .important-note-title { font-weight: 600; color: #856404; margin-bottom: 5px; font-size: 14px; }
    .important-note-text { font-size: 13px; color: #856404; line-height: 1.5; }
    .security-note { background-color: #e8f4f8; border-left: 4px solid ${brandColor}; padding: 15px; margin: 25px 0; border-radius: 4px; }
    .security-note-title { font-weight: 600; color: ${brandColor}; margin-bottom: 5px; font-size: 14px; }
    .security-note-text { font-size: 13px; color: #555555; line-height: 1.5; }
    .footer { background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999999; text-align: center; line-height: 1.6; }
    .footer-link { color: ${brandColor}; text-decoration: none; }
    .divider { border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0; }
    ol { color: #666666; line-height: 1.8; }
    ol li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <div class="user-type-badge">${userTypeLabel}</div> <!-- ✅ NEW: User type badge -->
      <div class="logo"> <img src="${logo}" alt="BeforeListed Logo" class="logo"> BeforeListed</div>
      <div class="header-title">Password Reset Code</div>
    </div>

    <!-- Content -->
    <div class="content">
      <div class="greeting">
        Hi ${displayName},
      </div>

      <div class="description">
        We received a request to reset your password. Use the code below to proceed with resetting your password.
      </div>

      <!-- OTP Code Section -->
      <div class="otp-section">
        <div class="otp-label">Your Reset Code</div>
        <div class="otp-code">${otpCode}</div>
        <div class="otp-expires">
          ⏱️ This code expires in <strong>${expiresIn} minutes</strong>
        </div>
      </div>

      <!-- Important Note -->
      <div class="important-note">
        <div class="important-note-title">⚠️ Important:</div>
        <div class="important-note-text">
          Never share this code with anyone. We will never ask for this code via email or support.
        </div>
      </div>

      <!-- Security Note -->
      <div class="security-note">
        <div class="security-note-title">🔒 Didn't Request This?</div>
        <div class="security-note-text">
          If you didn't request a password reset, please ignore this email. Your account remains secure.
        </div>
      </div>

      <!-- Steps -->
      <div style="margin: 30px 0; font-size: 14px; color: #333333;">
        <strong>Next Steps:</strong>
        <ol>
          <li>Enter the code above in the password reset window</li>
          <li>Create a strong, unique password</li>
          <li>Log in with your new password</li>
        </ol>
      </div>

      <hr class="divider">

      <div style="font-size: 13px; color: #666666; line-height: 1.6;">
        <strong>Password Reset Code:</strong> <code style="background-color: #f5f5f5; padding: 2px 6px; border-radius: 3px;">${otpCode}</code>
        <br><br>
        This code is valid for <strong>${expiresIn} minutes</strong> only.
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div style="margin-bottom: 10px;">
        Have questions? Visit our <a href="https://beforelisted.com/help" class="footer-link">Help Center</a> or reply to this email
      </div>
      <div>
        © ${new Date().getFullYear()} BeforeListed. All rights reserved.
      </div>
      <div style="margin-top: 10px; font-size: 11px;">
        <a href="https://beforelisted.com/privacy" class="footer-link">Privacy Policy</a> | 
        <a href="https://beforelisted.com/terms" class="footer-link">Terms of Service</a>
      </div>
    </div>
  </div>
</body>
</html>
  `;
  };

  // ============================================
  // PASSWORD RESET CONFIRMATION (FIXED)
  // ============================================

  /**
   * Password Reset Confirmation Template
   * Sent after successful password reset
   *
   * @param userName - User's full name
   * @param userType - User type (Agent or Renter) ✅ NEW
   * @param logoUrl - Brand logo URL
   * @param brandColor - Brand color (hex)
   * @returns HTML string
   */
  passwordResetConfirmation = (
    userName: string | undefined,
    userType?: string,
    logoUrl?: string,
    brandColor: string = "#208080"
  ): string => {
    const displayName =
      userName && userName.trim() ? userName.split(" ")[0] : "there";
    const userTypeLabel = userType
      ? userType.charAt(0).toUpperCase() + userType.slice(1)
      : "User"; //

    const logo = logoUrl || this.logoUrl;
    const color = brandColor || this.brandColor;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Successful - BeforeListed</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f5f5f5; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 40px 20px; text-align: center; color: white; }
    .user-type-badge { display: inline-block; background-color: rgba(255, 255, 255, 0.3); color: white; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; } /* ✅ NEW */
    .logo { max-width: 150px;
            width: 100%;
            height: auto;
            margin: 0 auto 20px auto;
            display: block; }
    .header-title { font-size: 28px; margin: 10px 0; font-weight: 600; }
    .success-icon { font-size: 48px; margin: 10px 0; }
    .content { padding: 40px 30px; }
    .greeting { font-size: 16px; color: #333333; margin-bottom: 20px; line-height: 1.6; }
    .confirmation-message { background-color: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 30px 0; border-radius: 4px; }
    .confirmation-text { font-size: 15px; color: #155724; font-weight: 500; }
    .description { font-size: 14px; color: #666666; margin: 25px 0; line-height: 1.6; }
    .next-steps { background-color: #e7f3ff; border-left: 4px solid #2196F3; padding: 20px; margin: 25px 0; border-radius: 4px; }
    .next-steps-title { font-weight: 600; color: #1565c0; margin-bottom: 10px; font-size: 14px; }
    .next-steps-list { font-size: 14px; color: #333333; line-height: 1.8; margin: 0; }
    .next-steps-list li { margin-bottom: 8px; }
    .security-actions { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 4px; }
    .security-actions-title { font-weight: 600; color: #856404; margin-bottom: 10px; font-size: 14px; }
    .security-actions-list { font-size: 13px; color: #666666; line-height: 1.7; margin: 0; }
    .security-actions-list li { margin-bottom: 8px; }
    .footer { background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999999; text-align: center; line-height: 1.6; }
    .footer-link { color: ${brandColor}; text-decoration: none; }
    .divider { border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <div class="user-type-badge">${userTypeLabel}</div> <!-- ✅ NEW: User type badge -->
      <div class="success-icon">✅</div>
      <div class="logo"><img src="${logo}" alt="BeforeListed Logo" class="logo"> BeforeListed</div>
      <div class="header-title">Password Reset Successful</div>
    </div>

    <!-- Content -->
    <div class="content">
      <div class="greeting">
        Hi ${displayName},
      </div>

      <!-- Confirmation Message -->
      <div class="confirmation-message">
        <div class="confirmation-text">
          Your password has been reset successfully! You can now log in with your new password.
        </div>
      </div>

      <div class="description">
        This is a security confirmation email. Your password was changed on <strong>${new Date().toLocaleString()}</strong>.
      </div>

      <hr class="divider">

      <!-- Next Steps -->
      <div class="next-steps">
        <div class="next-steps-title">📋 What's Next?</div>
        <ul class="next-steps-list">
          <li>✓ Log in with your new password</li>
          <li>✓ Verify your account is working correctly</li>
          <li>✓ Update your profile if needed</li>
        </ul>
      </div>

      <!-- Security Actions -->
      <div class="security-actions">
        <div class="security-actions-title">🔒 For Your Security:</div>
        <ul class="security-actions-list">
          <li>✓ Use a strong, unique password</li>
          <li>✓ Don't share your password with anyone</li>
          <li>✓ Log out from other devices if you enabled that option</li>
          <li>✓ Enable two-factor authentication for added security</li>
        </ul>
      </div>

      <hr class="divider">

      <div style="font-size: 13px; color: #666666; line-height: 1.6;">
        <strong>⚠️ Didn't Make This Change?</strong>
        <br>
        If you didn't reset your password, please <a href="https://beforelisted.com/help/security" style="color: #208080; text-decoration: none;">contact our support team immediately</a>. Your account security is our priority.
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div style="margin-bottom: 10px;">
        Have questions? Visit our <a href="https://beforelisted.com/help" class="footer-link">Help Center</a> or reply to this email
      </div>
      <div>
        © ${new Date().getFullYear()} BeforeListed. All rights reserved.
      </div>
      <div style="margin-top: 10px; font-size: 11px;">
        <a href="https://beforelisted.com/privacy" class="footer-link">Privacy Policy</a> | 
        <a href="https://beforelisted.com/terms" class="footer-link">Terms of Service</a>
      </div>
    </div>
  </div>
</body>
</html>
  `;
  };
}
