// file: src/services/email.templates.beforelisted.ts
/**
 * BeforeListed Branded Email Templates
 * ✅ Fully responsive HTML + inline CSS
 * ✅ Compatible with all major email clients
 * ✅ Variable placeholders in double braces: {{variableName}}
 * ✅ Ready to integrate with SendGrid API
 * ✅ Includes company logo and branding
 */

// ============================================
// TEMPLATE VARIABLES REFERENCE
// ============================================
/**
 * Available variables for each template:
 *
 * Welcome Email:
 * - {{userName}} - User's full name
 * - {{email}} - User's email address
 * - {{userType}} - "Agent" or "Renter"
 * - {{loginLink}} - Link to login/dashboard
 * - {{currentYear}} - Current year for footer
 *
 * Email Verification Code:
 * - {{userName}} - User's full name
 * - {{verificationCode}} - 6-digit OTP code
 * - {{expiresIn}} - Expiration time (e.g., "10 minutes")
 * - {{userType}} - "Agent" or "Renter"
 * - {{currentYear}} - Current year for footer
 *
 * Welcome with Auto-Generated Password (Renter):
 * - {{userName}} - User's full name
 * - {{email}} - User's email
 * - {{tempPassword}} - Auto-generated temporary password
 * - {{verificationCode}} - OTP for email verification
 * - {{expiresIn}} - Expiration time
 * - {{changePasswordLink}} - Link to change password
 * - {{currentYear}} - Current year for footer
 *
 * Agent Approval (Admin):
 * - {{agentName}} - Agent's full name
 * - {{agentEmail}} - Agent's email
 * - {{licenseNumber}} - License number
 * - {{brokerageName}} - Brokerage name
 * - {{adminNotes}} - Notes from admin
 * - {{dashboardLink}} - Link to agent dashboard
 * - {{currentYear}} - Current year for footer
 *
 * Match Notification (Renter):
 * - {{renterName}} - Renter's full name
 * - {{matchCount}} - Number of matches
 * - {{viewMatchesLink}} - Link to view matches
 * - {{currentYear}} - Current year for footer
 */

export class EmailTemplates {
  /**
   * Welcome Email - For Agents and Renters
   * Sent when a new user registers and email is verified
   */
  static welcomeEmail(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to BeforeListed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6; color: #333;">

    <!-- Wrapper -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
            <td align="center">
                <!-- Container -->
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; margin: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

                    <!-- Header with Logo -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0066cc 0%, #004fa0 100%); padding: 30px; text-align: center;">
                            <img src="https://agi-prod-file-upload-public-main-use1.s3.amazonaws.com/3df01972-0738-4025-8177-c3f105605a46" alt="BeforeListed Logo" width="120" height="40" style="margin-bottom: 15px;" />
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Welcome to BeforeListed!</h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Your {{userType}} account is ready</p>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">

                            <!-- Greeting -->
                            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">Hi {{userName}},</p>

                            <!-- Message -->
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #666;">
                                Welcome to BeforeListed! We're excited to have you join our community of real estate professionals and renters.
                            </p>

                            <!-- Features for {{userType}} -->
                            <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #0066cc; margin: 30px 0;">
                                <p style="margin: 0 0 15px 0; font-weight: 600; color: #333; font-size: 14px;">As a {{userType}}, you can:</p>
                                <ul style="margin: 0; padding-left: 20px; color: #666; font-size: 14px;">
                                    <li style="margin-bottom: 8px;">Access your personalized dashboard</li>
                                    <li style="margin-bottom: 8px;">Manage your profile and preferences</li>
                                    <li style="margin-bottom: 8px;">Connect with verified professionals</li>
                                    <li style="margin-bottom: 8px;">Explore exclusive opportunities</li>
                                </ul>
                            </div>

                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 40px 0;">
                                <a href="{{loginLink}}" style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #004fa0 100%); color: #ffffff; padding: 12px 40px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 16px; transition: background-color 0.3s;">
                                    Go to Dashboard
                                </a>
                            </div>

                            <!-- Additional Info -->
                            <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: #999;">
                                If you have any questions or need assistance, our support team is here to help.
                            </p>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f5f5f5; padding: 30px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
                            <p style="margin: 0 0 10px 0;">© {{currentYear}} BeforeListed. All rights reserved.</p>
                            <p style="margin: 0;">
                                <a href="#" style="color: #0066cc; text-decoration: none; margin: 0 10px;">Privacy</a> •
                                <a href="#" style="color: #0066cc; text-decoration: none; margin: 0 10px;">Terms</a> •
                                <a href="#" style="color: #0066cc; text-decoration: none; margin: 0 10px;">Contact</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>
</html>`;
  }

  /**
   * Email Verification Code Template
   * Sent when user needs to verify their email with an OTP
   */
  static emailVerificationCodeEmail(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - BeforeListed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6; color: #333;">

    <!-- Wrapper -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
            <td align="center">
                <!-- Container -->
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; margin: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

                    <!-- Header with Logo -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0066cc 0%, #004fa0 100%); padding: 30px; text-align: center;">
                            <img src="https://agi-prod-file-upload-public-main-use1.s3.amazonaws.com/3df01972-0738-4025-8177-c3f105605a46" alt="BeforeListed Logo" width="120" height="40" style="margin-bottom: 15px;" />
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Verify Your Email</h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">One-time code inside</p>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">

                            <!-- Greeting -->
                            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">Hi {{userName}},</p>

                            <!-- Message -->
                            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #666;">
                                Thank you for signing up as a {{userType}} on BeforeListed! To complete your email verification, please use the verification code below.
                            </p>

                            <!-- OTP Code Box -->
                            <div style="background: linear-gradient(135deg, #0066cc 0%, #004fa0 100%); padding: 30px; text-align: center; border-radius: 8px; margin: 40px 0;">
                                <p style="margin: 0 0 15px 0; font-size: 14px; color: rgba(255, 255, 255, 0.9); font-weight: 500;">Verification Code</p>
                                <p style="margin: 0; font-size: 36px; font-weight: 700; color: #ffffff; letter-spacing: 2px; font-family: 'Courier New', Courier, monospace;">
                                    {{verificationCode}}
                                </p>
                            </div>

                            <!-- Expiration Info -->
                            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 30px 0; border-radius: 4px;">
                                <p style="margin: 0; font-size: 14px; color: #856404;">
                                    ⏱️ This code expires in <strong>{{expiresIn}}</strong>
                                </p>
                            </div>

                            <!-- Instructions -->
                            <p style="margin: 30px 0; font-size: 14px; line-height: 1.6; color: #666;">
                                Please don't share this code with anyone. If you didn't create this account, you can ignore this email.
                            </p>

                            <!-- Security Note -->
                            <div style="background-color: #e8f4f8; border-left: 4px solid #0066cc; padding: 15px; border-radius: 4px; margin: 20px 0;">
                                <p style="margin: 0; font-size: 13px; color: #004fa0;">
                                    <strong>Security tip:</strong> We will never ask for this code via phone, email, or any other channel.
                                </p>
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f5f5f5; padding: 30px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
                            <p style="margin: 0 0 10px 0;">© {{currentYear}} BeforeListed. All rights reserved.</p>
                            <p style="margin: 0;">
                                <a href="#" style="color: #0066cc; text-decoration: none; margin: 0 10px;">Privacy</a> •
                                <a href="#" style="color: #0066cc; text-decoration: none; margin: 0 10px;">Terms</a> •
                                <a href="#" style="color: #0066cc; text-decoration: none; margin: 0 10px;">Contact</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>
</html>`;
  }

  /**
   * Welcome with Auto-Generated Password Email
   * Sent to renters when admin creates an account with auto-generated password
   */
  static welcomeWithAutoPasswordEmail(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your BeforeListed Account</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6; color: #333;">

    <!-- Wrapper -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
            <td align="center">
                <!-- Container -->
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; margin: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

                    <!-- Header with Logo -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0066cc 0%, #004fa0 100%); padding: 30px; text-align: center;">
                            <img src="https://agi-prod-file-upload-public-main-use1.s3.amazonaws.com/3df01972-0738-4025-8177-c3f105605a46" alt="BeforeListed Logo" width="120" height="40" style="margin-bottom: 15px;" />
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Your Account is Ready!</h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Temporary credentials inside</p>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">

                            <!-- Greeting -->
                            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">Hi {{userName}},</p>

                            <!-- Info Message -->
                            <div style="background-color: #e8f4f8; border-left: 4px solid #0066cc; padding: 15px; margin: 0 0 20px 0; border-radius: 4px;">
                                <p style="margin: 0; font-size: 14px; color: #004fa0;">
                                    Your BeforeListed renter account has been created! Below are your temporary login credentials.
                                </p>
                            </div>

                            <!-- Credentials Box -->
                            <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin: 30px 0;">
                                <p style="margin: 0 0 15px 0; font-weight: 600; color: #333; font-size: 14px;">Your Login Credentials:</p>
                                
                                <div style="margin-bottom: 15px;">
                                    <p style="margin: 0 0 5px 0; font-size: 12px; color: #999; font-weight: 500;">Email:</p>
                                    <p style="margin: 0; font-size: 14px; color: #333; font-family: 'Courier New', Courier, monospace; background: white; padding: 10px; border-radius: 4px;">
                                        {{email}}
                                    </p>
                                </div>

                                <div>
                                    <p style="margin: 0 0 5px 0; font-size: 12px; color: #999; font-weight: 500;">Temporary Password:</p>
                                    <p style="margin: 0; font-size: 14px; color: #333; font-family: 'Courier New', Courier, monospace; background: white; padding: 10px; border-radius: 4px;">
                                        {{tempPassword}}
                                    </p>
                                </div>
                            </div>

                            <!-- Email Verification Code -->
                            <div style="background: linear-gradient(135deg, #0066cc 0%, #004fa0 100%); padding: 30px; text-align: center; border-radius: 8px; margin: 30px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: rgba(255, 255, 255, 0.9); font-weight: 500;">Email Verification Code</p>
                                <p style="margin: 0; font-size: 36px; font-weight: 700; color: #ffffff; letter-spacing: 2px; font-family: 'Courier New', Courier, monospace;">
                                    {{verificationCode}}
                                </p>
                            </div>

                            <!-- Next Steps -->
                            <div style="background-color: #e8f5f0; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0; border-radius: 4px;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #1b5e20;">Next Steps:</p>
                                <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #333;">
                                    <li style="margin-bottom: 5px;">Verify your email with the code above</li>
                                    <li style="margin-bottom: 5px;">Log in with your temporary password</li>
                                    <li style="margin-bottom: 5px;">Change your password immediately for security</li>
                                    <li>Complete your profile to get started</li>
                                </ol>
                            </div>

                            <!-- Expiration Warning -->
                            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                                <p style="margin: 0; font-size: 13px; color: #856404;">
                                    ⏱️ The email verification code expires in <strong>{{expiresIn}}</strong>
                                </p>
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f5f5f5; padding: 30px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
                            <p style="margin: 0 0 10px 0;">© {{currentYear}} BeforeListed. All rights reserved.</p>
                            <p style="margin: 0;">
                                <a href="#" style="color: #0066cc; text-decoration: none; margin: 0 10px;">Privacy</a> •
                                <a href="#" style="color: #0066cc; text-decoration: none; margin: 0 10px;">Terms</a> •
                                <a href="#" style="color: #0066cc; text-decoration: none; margin: 0 10px;">Contact</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>
</html>`;
  }

  /**
   * Agent Approval Email
   * Sent to agent when admin approves their profile
   */
  static agentApprovalEmail(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Account Has Been Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6; color: #333;">

    <!-- Wrapper -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
            <td align="center">
                <!-- Container -->
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; margin: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

                    <!-- Header with Logo -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 30px; text-align: center;">
                            <img src="https://agi-prod-file-upload-public-main-use1.s3.amazonaws.com/3df01972-0738-4025-8177-c3f105605a46" alt="BeforeListed Logo" width="120" height="40" style="margin-bottom: 15px;" />
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">✓ Account Approved!</h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">You're ready to get started</p>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">

                            <!-- Greeting -->
                            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">Hi {{agentName}},</p>

                            <!-- Success Message -->
                            <div style="background-color: #e8f5e9; border-left: 4px solid #4CAF50; padding: 15px; margin: 0 0 20px 0; border-radius: 4px;">
                                <p style="margin: 0; font-size: 14px; color: #1b5e20;">
                                    ✓ Congratulations! Your agent profile has been approved by our team.
                                </p>
                            </div>

                            <!-- Approval Details -->
                            <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin: 30px 0;">
                                <p style="margin: 0 0 15px 0; font-weight: 600; color: #333; font-size: 14px;">Profile Details:</p>
                                
                                <table style="width: 100%;">
                                    <tr>
                                        <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #999; font-size: 12px; width: 35%;">License Number:</td>
                                        <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333; font-size: 13px;">{{licenseNumber}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #999; font-size: 12px;">Brokerage:</td>
                                        <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #333; font-size: 13px;">{{brokerageName}}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Admin Notes -->
                            <div style="background-color: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #01579b;">Admin Notes:</p>
                                <p style="margin: 0; font-size: 13px; color: #0277bd; line-height: 1.5;">
                                    {{adminNotes}}
                                </p>
                            </div>

                            <!-- Next Steps -->
                            <div style="background-color: #f0f7ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0; border-radius: 4px;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #004fa0;">You're all set! Here's what's next:</p>
                                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #0066cc;">
                                    <li style="margin-bottom: 5px;">Start matching with renters immediately</li>
                                    <li style="margin-bottom: 5px;">View your agency dashboard and statistics</li>
                                    <li>Access premium matching features</li>
                                </ul>
                            </div>

                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 40px 0;">
                                <a href="{{dashboardLink}}" style="display: inline-block; background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: #ffffff; padding: 12px 40px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 16px;">
                                    Go to Dashboard
                                </a>
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f5f5f5; padding: 30px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
                            <p style="margin: 0 0 10px 0;">© {{currentYear}} BeforeListed. All rights reserved.</p>
                            <p style="margin: 0;">
                                <a href="#" style="color: #0066cc; text-decoration: none; margin: 0 10px;">Privacy</a> •
                                <a href="#" style="color: #0066cc; text-decoration: none; margin: 0 10px;">Terms</a> •
                                <a href="#" style="color: #0066cc; text-decoration: none; margin: 0 10px;">Contact</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>
</html>`;
  }

  /**
   * Match Notification Email (Renter)
   * Sent when new property matches are available
   */
  static matchNotificationEmail(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Matches Found - BeforeListed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6; color: #333;">

    <!-- Wrapper -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
            <td align="center">
                <!-- Container -->
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; margin: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

                    <!-- Header with Logo -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0066cc 0%, #004fa0 100%); padding: 30px; text-align: center;">
                            <img src="https://agi-prod-file-upload-public-main-use1.s3.amazonaws.com/3df01972-0738-4025-8177-c3f105605a46" alt="BeforeListed Logo" width="120" height="40" style="margin-bottom: 15px;" />
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">New Matches Found!</h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Check out {{matchCount}} property matches</p>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">

                            <!-- Greeting -->
                            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">Hi {{renterName}},</p>

                            <!-- Message -->
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #666;">
                                Great news! We found {{matchCount}} new property matches that fit your criteria on BeforeListed.
                            </p>

                            <!-- Highlight Box -->
                            <div style="background: linear-gradient(135deg, #0066cc 0%, #004fa0 100%); padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 12px; color: rgba(255, 255, 255, 0.9);">New Matches Available</p>
                                <p style="margin: 0; font-size: 36px; font-weight: 700; color: #ffffff;">
                                    {{matchCount}}
                                </p>
                            </div>

                            <!-- Message -->
                            <p style="margin: 20px 0; font-size: 14px; line-height: 1.6; color: #666;">
                                These properties match your saved request filters and are now available on BeforeListed. Don't miss out—view them now to stay ahead of the competition!
                            </p>

                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 40px 0;">
                                <a href="{{viewMatchesLink}}" style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #004fa0 100%); color: #ffffff; padding: 12px 40px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 16px;">
                                    View Matches
                                </a>
                            </div>

                            <!-- Info -->
                            <p style="margin: 30px 0 0 0; font-size: 13px; line-height: 1.6; color: #999;">
                                You received this email because you subscribed to match notifications. You can manage your notification preferences in your account settings.
                            </p>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f5f5f5; padding: 30px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
                            <p style="margin: 0 0 10px 0;">© {{currentYear}} BeforeListed. All rights reserved.</p>
                            <p style="margin: 0;">
                                <a href="#" style="color: #0066cc; text-decoration: none; margin: 0 10px;">Privacy</a> •
                                <a href="#" style="color: #0066cc; text-decoration: none; margin: 0 10px;">Terms</a> •
                                <a href="#" style="color: #0066cc; text-decoration: none; margin: 0 10px;">Contact</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>
</html>`;
  }

  /**
   * Generic Helper Method
   * Returns all templates as an object for easy access
   */
  static getAllTemplates(): Record<string, () => string> {
    return {
      welcome: this.welcomeEmail,
      emailVerification: this.emailVerificationCodeEmail,
      welcomeWithPassword: this.welcomeWithAutoPasswordEmail,
      agentApproval: this.agentApprovalEmail,
      matchNotification: this.matchNotificationEmail,
    };
  }
}
