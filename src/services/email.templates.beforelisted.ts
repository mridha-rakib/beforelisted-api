// file: src/services/email.templates.beforelisted.ts (UPDATED WITH LOGO)

/**
 * BeforeListed Branded Email Templates
 * ✅ Fully responsive HTML + inline CSS
 * ✅ Compatible with all major email clients
 * ✅ BeforeListed logo integration
 * ✅ Dynamic brand colors
 * ✅ Professional & modern design
 */

export class EmailTemplates {
  private logoUrl: string =
    "https://agi-prod-file-upload-public-main-use1.s3.amazonaws.com/d6a6bcf9-cea1-471c-a177-563559b38b29";
  private brandColor: string = "#2180E1";
  private supportEmail: string = "support@beforelisted.com";

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
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
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
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
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
    userType: "Agent" | "Renter",
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
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
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
            letter-spacing: 8px;
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
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
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
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
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
}
