// file: src/services/email-notification.templates.ts

// ============================================
// AGENT NOTIFICATION EMAIL TEMPLATE
// ============================================

/**
 * Email template for agents about new pre-market request
 * WITHOUT renter information
 * Both Grant Access and Normal agents receive same template
 */
export function preMarketAgentNotificationTemplate(
  agentName: string,
  listingTitle: string,
  listingDescription: string,
  location: string,
  serviceType: string,
  listingUrl: string,
  logoUrl?: string,
  brandColor: string = "#1890FF"
): string {
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Pre-Market Listing Available</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: ${brandColor};
            color: #ffffff;
            padding: 30px 20px;
            text-align: center;
        }
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 15px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px 20px;
        }
        .greeting {
            margin-bottom: 20px;
            font-size: 16px;
        }
        .greeting strong {
            color: ${brandColor};
        }
        .notification-box {
            background-color: #f0f8fa;
            border-left: 4px solid ${brandColor};
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .notification-box h2 {
            margin: 0 0 10px 0;
            color: ${brandColor};
            font-size: 18px;
        }
        .listing-details {
            background-color: #fafafa;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .listing-details p {
            margin: 8px 0;
            font-size: 14px;
        }
        .listing-details strong {
            color: ${brandColor};
            display: inline-block;
            min-width: 100px;
        }
        .cta-button {
            display: inline-block;
            background-color: ${brandColor};
            color: #ffffff;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
            font-weight: 600;
            transition: background-color 0.3s;
        }
        .cta-button:hover {
            opacity: 0.9;
        }
        .info-text {
            font-size: 13px;
            color: #666;
            margin: 15px 0;
        }
        .divider {
            border: none;
            border-top: 1px solid #eee;
            margin: 20px 0;
        }
        .footer {
            background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #999;
        }
        .footer a {
            color: ${brandColor};
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="BeforeListed" class="logo">` : ""}
            <h1>🔔 New Opportunity</h1>
        </div>

        <!-- Content -->
        <div class="content">
            <div class="greeting">
                Hi <strong>${agentName}</strong>,
            </div>

            <div class="notification-box">
                <h2>New Pre-Market Request Available</h2>
                <p>A new pre-market listing request has been posted that matches your service area. Review the details below and reach out if you're interested!</p>
            </div>

            <!-- Listing Details (WITHOUT Renter Info) -->
            <div class="listing-details">
                <p>
                    <strong>Title:</strong><br>
                    ${listingTitle}
                </p>
                <p>
                    <strong>Description:</strong><br>
                    ${listingDescription}
                </p>
                <p>
                    <strong>Location:</strong><br>
                    ${location}
                </p>
                <p>
                    <strong>Service Type:</strong><br>
                    ${serviceType}
                </p>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center;">
                <a href="${listingUrl}" class="cta-button">View Full Listing</a>
            </div>

            <div class="info-text">
                <strong>Note:</strong> Renter details will be available after you request access and complete the verification process.
            </div>

            <p>If you're interested in this opportunity and would like to provide your services, click the button above to view more details and submit your interest.</p>

            <p>Questions? Reply to this email or contact our support team.</p>

            <div class="divider"></div>

            <p style="margin: 0; color: #666; font-size: 14px;">
                Best regards,<br>
                <strong style="color: ${brandColor};">The BeforeListed Team</strong>
            </p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p style="margin: 0;">© ${currentYear} BeforeListed. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">
                <a href="#">Unsubscribe</a> | 
                <a href="#">Privacy Policy</a> | 
                <a href="#">Contact Us</a>
            </p>
        </div>
    </div>
</body>
</html>
  `;
}

// ============================================
// ADMIN NOTIFICATION EMAIL TEMPLATE
// ============================================

/**
 * Email template for admin about new pre-market request
 * WITH full renter information
 */
export function preMarketAdminNotificationTemplate(
  listingTitle: string,
  listingDescription: string,
  location: string,
  serviceType: string,
  renterName: string,
  renterEmail: string,
  renterPhone: string,
  listingUrl: string,
  preMarketRequestId: string,
  logoUrl?: string,
  brandColor: string = "#1890FF"
): string {
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Pre-Market Request - Admin Notification</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 700px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: ${brandColor};
            color: #ffffff;
            padding: 30px 20px;
            text-align: center;
        }
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 15px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px 20px;
        }
        .admin-badge {
            display: inline-block;
            background-color: #ffd700;
            color: #333;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 15px;
        }
        .notification-box {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .notification-box h2 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 18px;
        }
        .section {
            margin: 25px 0;
        }
        .section h3 {
            color: ${brandColor};
            border-bottom: 2px solid ${brandColor};
            padding-bottom: 10px;
            margin: 0 0 15px 0;
            font-size: 16px;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
        }
        .details-table tr {
            border-bottom: 1px solid #eee;
        }
        .details-table td {
            padding: 12px 0;
        }
        .details-table td:first-child {
            font-weight: 600;
            color: ${brandColor};
            width: 150px;
        }
        .renter-info-box {
            background-color: #f0f8fa;
            border: 2px solid ${brandColor};
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
        }
        .renter-info-box p {
            margin: 8px 0;
        }
        .cta-button {
            display: inline-block;
            background-color: ${brandColor};
            color: #ffffff;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
            font-weight: 600;
            transition: background-color 0.3s;
        }
        .cta-button:hover {
            opacity: 0.9;
        }
        .request-id {
            background-color: #f9f9f9;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            color: #666;
            margin: 10px 0;
        }
        .divider {
            border: none;
            border-top: 1px solid #eee;
            margin: 20px 0;
        }
        .footer {
            background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #999;
        }
        .footer a {
            color: ${brandColor};
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="BeforeListed" class="logo">` : ""}
            <h1>⚙️ Admin Notification</h1>
        </div>

        <!-- Content -->
        <div class="content">
            <div class="admin-badge">ADMIN ONLY</div>

            <div class="notification-box">
                <h2>New Pre-Market Request Submitted</h2>
                <p>A new pre-market listing request has been created. Full details including renter information are provided below for your review.</p>
            </div>

            <!-- Request ID -->
            <div>
                <strong>Request ID:</strong>
                <div class="request-id">${preMarketRequestId}</div>
            </div>

            <!-- Listing Details Section -->
            <div class="section">
                <h3>📋 Listing Details</h3>
                <table class="details-table">
                    <tr>
                        <td>Title</td>
                        <td>${listingTitle}</td>
                    </tr>
                    <tr>
                        <td>Description</td>
                        <td>${listingDescription}</td>
                    </tr>
                    <tr>
                        <td>Location</td>
                        <td>${location}</td>
                    </tr>
                    <tr>
                        <td>Service Type</td>
                        <td>${serviceType}</td>
                    </tr>
                </table>
            </div>

            <!-- Renter Information Section (ADMIN ONLY) -->
            <div class="section">
                <h3>👤 Renter Information</h3>
                <div class="renter-info-box">
                    <p>
                        <strong>Name:</strong> ${renterName}
                    </p>
                    <p>
                        <strong>Email:</strong> <a href="mailto:${renterEmail}">${renterEmail}</a>
                    </p>
                    <p>
                        <strong>Phone:</strong> ${renterPhone}
                    </p>
                </div>
            </div>

            <!-- Action Required -->
            <div class="section">
                <h3>📌 Action Required</h3>
                <p>Review this request and take appropriate action:</p>
                <ul style="padding-left: 20px;">
                    <li>Monitor agent interest and match requests</li>
                    <li>Approve or deny agent access requests</li>
                    <li>Manage payment for access (free or paid)</li>
                    <li>Support renter and agent throughout the process</li>
                </ul>
                <div style="text-align: center;">
                    <a href="${listingUrl}" class="cta-button">View Request Details</a>
                </div>
            </div>

            <div class="divider"></div>

            <p style="margin: 0; color: #666; font-size: 14px;">
                System automated notification,<br>
                <strong style="color: ${brandColor};">BeforeListed Admin</strong>
            </p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p style="margin: 0;">© ${currentYear} BeforeListed. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">Admin Control Panel | Support | Settings</p>
        </div>
    </div>
</body>
</html>
  `;
}

// ============================================
// RENTER ACCESS GRANTED EMAIL TEMPLATE
// ============================================

/**
 * Email template for renter when an agent gains access
 */
export function renterAccessGrantedNotificationTemplate(
  renterName: string,
  agentName: string,
  agentEmail: string,
  listingTitle: string,
  location: string,
  accessType: "free" | "paid",
  listingUrl: string,
  logoUrl?: string,
  brandColor: string = "#1890FF"
): string {
  const currentYear = new Date().getFullYear();
  const accessLabel =
    accessType === "free" ? "Free access granted" : "Paid access granted";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agent Access Granted</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: ${brandColor};
            color: #ffffff;
            padding: 30px 20px;
            text-align: center;
        }
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 15px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px 20px;
        }
        .greeting {
            margin-bottom: 20px;
            font-size: 16px;
        }
        .notification-box {
            background-color: #f0f8fa;
            border-left: 4px solid ${brandColor};
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .notification-box h2 {
            margin: 0 0 10px 0;
            color: ${brandColor};
            font-size: 18px;
        }
        .details {
            background-color: #fafafa;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .details p {
            margin: 8px 0;
            font-size: 14px;
        }
        .details strong {
            color: ${brandColor};
            display: inline-block;
            min-width: 120px;
        }
        .cta-button {
            display: inline-block;
            background-color: ${brandColor};
            color: #ffffff;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
            font-weight: 600;
            transition: background-color 0.3s;
        }
        .cta-button:hover {
            opacity: 0.9;
        }
        .footer {
            background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #999;
        }
        .footer a {
            color: ${brandColor};
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="BeforeListed" class="logo">` : ""}
            <h1>Agent Access Granted</h1>
        </div>

        <div class="content">
            <div class="greeting">
                Hi ${renterName},
            </div>

            <div class="notification-box">
                <h2>${accessLabel}</h2>
                <p>An agent has been granted access to your pre-market listing.</p>
            </div>

            <div class="details">
                <p>
                    <strong>Listing:</strong><br>
                    ${listingTitle}
                </p>
                <p>
                    <strong>Location:</strong><br>
                    ${location}
                </p>
                <p>
                    <strong>Agent Name:</strong><br>
                    ${agentName}
                </p>
                <p>
                    <strong>Agent Email:</strong><br>
                    <a href="mailto:${agentEmail}">${agentEmail}</a>
                </p>
            </div>

            <div style="text-align: center;">
                <a href="${listingUrl}" class="cta-button">View Listing Details</a>
            </div>

            <p>If you have any questions, feel free to reply to this email.</p>
        </div>

        <div class="footer">
            <p style="margin: 0;">c ${currentYear} BeforeListed. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">
                <a href="#">Privacy Policy</a> | 
                <a href="#">Contact Us</a>
            </p>
        </div>
    </div>
</body>
</html>
  `;
}
