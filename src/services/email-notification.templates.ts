// file: src/services/email-notification.templates.ts

// ============================================
// AGENT NOTIFICATION EMAIL TEMPLATE
// ============================================

/**
 * Email template for agents about new pre-market request
 * WITHOUT renter information
 * Both Grant Access and Normal agents receive same template
 */
const footerLinks = (brandColor: string): string => `
            <p style="margin: 6px 0 0 0;">
                <a href="mailto:support@beforelisted.com" style="color: ${brandColor}; text-decoration: none;">Contact Us</a> |
                <a href="https://rental-pennymore-frontend.vercel.app/privacy-policy" style="color: ${brandColor}; text-decoration: none;">Privacy Policy</a> |
                <a href="https://rental-pennymore-frontend.vercel.app/terms-conditions" style="color: ${brandColor}; text-decoration: none;">Terms and Conditions</a>
            </p>
`;

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
            </div>

            <!-- Call to Action -->
           
            <div class="info-text">
                <strong>Note:</strong> Renter details will be available after you request access and complete the verification process.
            </div>

            <div class="divider"></div>

            <p style="margin: 0; color: #666; font-size: 14px;">
                Best regards,<br>
                <strong style="color: ${brandColor};">The BeforeListed Team</strong>
            </p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p style="margin: 0;">© ${currentYear} BeforeListed. All rights reserved.</p>
            ${footerLinks(brandColor)}
        </div>
    </div>
</body>
</html>
  `;
}

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
  requestId: string,
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
                <div class="request-id">${requestId}</div>
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
            ${footerLinks(brandColor)}
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Email template for renter after submitting a pre-market request
 */
export function renterRequestConfirmationTemplate(
  renterName: string,
  logoUrl?: string,
  brandColor: string = "#1890FF"
): string {
  const currentYear = new Date().getFullYear();
  const firstName = renterName?.trim().split(" ")[0] || renterName;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>We received your BeforeListed™ request</title>
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
        .note-title {
            font-weight: 600;
            margin: 20px 0 10px 0;
            color: ${brandColor};
        }
        .notes-list {
            margin: 0 0 20px 18px;
            padding: 0;
            color: #555;
        }
        .notes-list li {
            margin: 8px 0;
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
            <h1>We received your BeforeListed™ request</h1>
        </div>

        <div class="content">
            <div class="greeting">
                Hi ${firstName},
            </div>

            <p>Thanks for submitting your request on BeforeListed™.</p>

            <div class="notification-box">
                <h2>Request received</h2>
                <p>Your request has been received and is under review. Based on the information provided, and assuming the required agent registration and disclosures have been signed, your registered, licensed New York real estate agent may begin proactive outreach regarding upcoming rental opportunities that match your criteria.</p>
            </div>

            <div class="note-title">Please note:</div>
            <ul class="notes-list">
                <li>BeforeListed™ is a renter-initiated platform</li>
                <li>Your registered agent will focus on identifying apartments that are not publicly advertised</li>
                <li>Because your agent focuses on opportunities that are not actively marketed, this process may take longer than a traditional on-market rental search.</li>
                <li>You will be notified if and when a relevant opportunity is identified</li>
                <li>You only pay a broker fee if you successfully rent an apartment presented by your agent, pursuant to the applicable agency and fee agreements</li>
                <li>If additional expertise would benefit your search, your agent may collaborate with another experienced agent. If so, any required disclosures will be provided to you for review and signature before proceeding.</li>
            </ul>

            <p>If you have any questions, simply reply to this email.</p>

            <p>Thank you,<br><strong>BeforeListed™ Support</strong></p>
        </div>

        <div class="footer">
            <p style="margin: 0;">c ${currentYear} BeforeListed. All rights reserved.</p>
            ${footerLinks(brandColor)}
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Email template for renter when a request expires
 */
export function renterRequestExpiredTemplate(
  renterName: string,
  logoUrl?: string,
  brandColor: string = "#1890FF"
): string {
  const currentYear = new Date().getFullYear();
  const firstName = renterName?.trim().split(" ")[0] || renterName;
  const safeFirstName = escapeHtml(firstName);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your BeforeListed Request Has Expired</title>
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
            <h1>Your BeforeListed Request Has Expired</h1>
        </div>

        <div class="content">
            <div class="greeting">
                Hi ${safeFirstName},
            </div>

            <div class="notification-box">
                <h2>Request expired</h2>
                <p>This email is to let you know that your BeforeListed renter request has expired and has been automatically removed from the platform.</p>
            </div>

            <p>Requests are time-limited to ensure agents are working with up-to-date information and active housing needs. No further action will be taken on this request.</p>

            <p>If you're still searching for an apartment, you're welcome to submit a new request at any time.</p>

            <p>Thank you for using BeforeListed, and we wish you the best of luck with your search.</p>

            <p>Best regards,<br>Tuval<br><strong>BeforeListed</strong></p>
        </div>

        <div class="footer">
            <p style="margin: 0;">c ${currentYear} BeforeListed. All rights reserved.</p>
            ${footerLinks(brandColor)}
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Email template for associated agent when renter submits a request
 */
export function agentRenterRequestConfirmationTemplate(
  agentName: string,
  requestId: string,
  borough: string,
  bedrooms: string,
  maxRent: string,
  submittedAt: string,
  logoUrl?: string,
  brandColor: string = "#1890FF"
): string {
  const currentYear = new Date().getFullYear();
  const firstName = agentName?.trim().split(" ")[0] || agentName;
  const safeRequestId = escapeHtml(requestId);
  const safeBorough = escapeHtml(borough);
  const safeBedrooms = escapeHtml(bedrooms);
  const safeMaxRent = escapeHtml(maxRent);
  const safeSubmittedAt = escapeHtml(submittedAt);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Renter Request Confirmation</title>
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
            min-width: 140px;
        }
        .note-title {
            font-weight: 600;
            margin: 20px 0 10px 0;
            color: ${brandColor};
        }
        .notes-list {
            margin: 0 0 20px 18px;
            padding: 0;
            color: #555;
        }
        .notes-list li {
            margin: 8px 0;
        }
        .footer-note {
            font-size: 12px;
            color: #777;
            margin-top: 20px;
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
            <h1>New Renter Request</h1>
        </div>

        <div class="content">
            <div class="greeting">
                Hi ${firstName},
            </div>

            <div class="notification-box">
                <h2>New request submitted</h2>
                <p>A renter who registered with you on BeforeListed™ has submitted a new request.</p>
            </div>

            <div class="details">
                <p>
                    <strong>Request ID:</strong><br>
                    ${safeRequestId}
                </p>
                <p>
                    <strong>Borough:</strong><br>
                    ${safeBorough}
                </p>
                <p>
                    <strong>Bedrooms Requested:</strong><br>
                    ${safeBedrooms}
                </p>
                <p>
                    <strong>Max Rent:</strong><br>
                    ${safeMaxRent}
                </p>
                <p>
                    <strong>Submitted:</strong><br>
                    ${safeSubmittedAt}
                </p>
            </div>

            <p>You can review the renter's full request details by logging into the BeforeListed™ admin panel.</p>

            <div class="note-title">Please note:</div>
            <ul class="notes-list">
                <li>The request was renter-initiated through the platform</li>
                <li>Outreach may begin only after required agent registration and disclosures have been completed</li>
                <li>Any collaboration with another agent requires providing the appropriate disclosures to the renter before proceeding</li>
            </ul>

            <p>If you have any questions or encounter an issue with the request, please contact support.</p>

            <p>Thank you,<br><strong>BeforeListed™ Admin</strong></p>

            <p class="footer-note">
                You can manage or disable email notifications at any time in your BeforeListed™ dashboard settings.
            </p>
        </div>

        <div class="footer">
            <p style="margin: 0;">c ${currentYear} BeforeListed. All rights reserved.</p>
            ${footerLinks(brandColor)}
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Email template for renter when registered agent finds an opportunity
 */
export function renterOpportunityFoundRegisteredAgentTemplate(
  renterName: string,
  logoUrl?: string,
  brandColor: string = "#1890FF"
): string {
  const currentYear = new Date().getFullYear();
  const firstName = renterName?.trim().split(" ")[0] || renterName;
  const safeFirstName = escapeHtml(firstName);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Opportunity Found</title>
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
            <h1>Opportunity Found</h1>
        </div>

        <div class="content">
            <div class="greeting">
                Hi ${safeFirstName},
            </div>

            <div class="notification-box">
                <h2>Great news</h2>
                <p>An opportunity matching your request on BeforeListed™ has been identified by your registered, licensed New York real estate agent.</p>
            </div>

            <p>This opportunity is based on the criteria you submitted and may not be publicly advertised.</p>

            <p>Your agent will follow up with additional details and next steps. No action is required from you at this time unless requested by your agent.</p>

            <p>As a reminder, you only pay a broker fee if you successfully rent an apartment presented to you by your agent, pursuant to the applicable agency and fee agreements.</p>

            <p>If you have any questions, you may reply to this email.</p>

            <p>Thank you,<br><strong>BeforeListed™ Support</strong></p>
        </div>

        <div class="footer">
            <p style="margin: 0;">c ${currentYear} BeforeListed. All rights reserved.</p>
            ${footerLinks(brandColor)}
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Email template for renter when a non-registered agent finds an opportunity
 */
export function renterOpportunityFoundOtherAgentTemplate(
  renterName: string,
  logoUrl?: string,
  brandColor: string = "#1890FF"
): string {
  const currentYear = new Date().getFullYear();
  const firstName = renterName?.trim().split(" ")[0] || renterName;
  const safeFirstName = escapeHtml(firstName);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Opportunity Found</title>
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
            <h1>Opportunity Found</h1>
        </div>

        <div class="content">
            <div class="greeting">
                Hi ${safeFirstName},
            </div>

            <div class="notification-box">
                <h2>Great news</h2>
                <p>An opportunity matching your request on BeforeListed™ has been identified based on the criteria you submitted.</p>
            </div>

            <p>In this case, another licensed New York real estate agent has become aware of a possible upcoming rental opportunity through independent brokerage outreach or while working on behalf of a different renter. That agent is not representing the owner and is not acting on your behalf unless and until the appropriate agent disclosure is completed.</p>

            <p>If participation by this additional agent is required to proceed, the agent copied on this email will provide the required disclosure for your review and signature. Once any required disclosures are completed, your registered agent will follow up with additional details and next steps.</p>

            <p>As a reminder, you only pay a broker fee if you successfully rent an apartment presented to you by your agent, pursuant to the applicable agency and fee agreements.</p>

            <p>If you have any questions, you may reply to this email.</p>

            <p>Thank you,<br><strong>BeforeListed™ Support</strong></p>
        </div>

        <div class="footer">
            <p style="margin: 0;">c ${currentYear} BeforeListed. All rights reserved.</p>
            ${footerLinks(brandColor)}
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Email template for agent when a renter request is closed
 */
export function renterRequestClosedAgentAlertTemplate(
  agentName: string,
  requestId: string,
  reason: string,
  closedAt: string,
  logoUrl?: string,
  brandColor: string = "#1890FF"
): string {
  const currentYear = new Date().getFullYear();
  const firstName = agentName?.trim().split(" ")[0] || agentName;
  const safeFirstName = escapeHtml(firstName);
  const safeRequestId = escapeHtml(requestId);
  const safeReason = escapeHtml(reason);
  const safeClosedAt = escapeHtml(closedAt);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Renter Request Closed</title>
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
        .footer-note {
            font-size: 12px;
            color: #777;
            margin-top: 20px;
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
            <h1>Renter Request Closed</h1>
        </div>

        <div class="content">
            <div class="greeting">
                Hi ${safeFirstName},
            </div>

            <div class="notification-box">
                <h2>Request closed</h2>
                <p>This is a notification that a renter request registered under you on BeforeListed™ has been closed.</p>
            </div>

            <div class="details">
                <p>
                    <strong>Request ID:</strong><br>
                    ${safeRequestId}
                </p>
                <p>
                    <strong>Reason:</strong><br>
                    ${safeReason}
                </p>
                <p>
                    <strong>Date Closed:</strong><br>
                    ${safeClosedAt}
                </p>
            </div>

            <p>No further outreach is required for this request.</p>

            <p>If the renter submits a new request in the future, you will be notified automatically.</p>

            <p>If you believe this request was closed in error or have any questions, please contact support.</p>

            <p>Thank you,<br><strong>BeforeListed™ Admin</strong></p>

            <p class="footer-note">
                You can manage or disable email notifications at any time in your BeforeListed™ dashboard settings.
            </p>
        </div>

        <div class="footer">
            <p style="margin: 0;">c ${currentYear} BeforeListed. All rights reserved.</p>
            ${footerLinks(brandColor)}
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Email template for agents when a renter updates a request
 */
export function renterRequestUpdatedNotificationTemplate(
  agentName: string,
  requestId: string,
  updatedFields: string[],
  updatedAt: string,
  logoUrl?: string,
  brandColor: string = "#1890FF"
): string {
  const currentYear = new Date().getFullYear();
  const firstName = agentName?.trim().split(" ")[0] || agentName;
  const safeRequestId = escapeHtml(requestId);
  const safeUpdatedAt = escapeHtml(updatedAt);
  const safeFields = updatedFields.map((field) => escapeHtml(field));
  const fieldsHtml =
    safeFields.length > 0
      ? `<ul class="update-list">${safeFields
          .map((field) => `<li>${field}</li>`)
          .join("")}</ul>`
      : `<p class="empty-text">Not specified</p>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Request Updated</title>
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
        .update-list {
            margin: 8px 0 0 18px;
            padding: 0;
            color: #555;
        }
        .update-list li {
            margin: 6px 0;
        }
        .empty-text {
            margin: 8px 0 0 0;
            color: #777;
            font-size: 14px;
        }
        .footer-note {
            font-size: 12px;
            color: #777;
            margin-top: 20px;
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
            <h1>Request Updated</h1>
        </div>

        <div class="content">
            <div class="greeting">
                Hi ${firstName},
            </div>

            <div class="notification-box">
                <h2>Request updated</h2>
                <p>A renter has updated an existing request registered under you on BeforeListed™.</p>
            </div>

            <div class="details">
                <p>
                    <strong>Request ID:</strong><br>
                    ${safeRequestId}
                </p>
                <p>
                    <strong>Updated fields:</strong><br>
                    ${fieldsHtml}
                </p>
                <p>
                    <strong>Updated:</strong><br>
                    ${safeUpdatedAt}
                </p>
            </div>

            <p>Please review the updated request details in the BeforeListed™ admin panel before continuing outreach.</p>

            <p>Thank you,<br><strong>BeforeListed™ Admin</strong></p>

            <p class="footer-note">
                You can manage or disable email notifications at any time in your BeforeListed™ dashboard settings.
            </p>
        </div>

        <div class="footer">
            <p style="margin: 0;">c ${currentYear} BeforeListed. All rights reserved.</p>
            ${footerLinks(brandColor)}
        </div>
    </div>
</body>
</html>
  `;
}

export function agentRegistrationVerifiedAdminTemplate(
  agentFirstName: string,
  agentLastName: string,
  agentEmail: string,
  registrationDate: string,
  logoUrl?: string,
  brandColor: string = "#1890FF"
): string {
  const currentYear = new Date().getFullYear();
  const displayName = [agentFirstName, agentLastName].filter(Boolean).join(" ");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agent Registration Verified - Admin Notification</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
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
            padding: 24px 20px;
            text-align: center;
        }
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 12px;
        }
        .header h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 600;
        }
        .content {
            padding: 24px 20px;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 12px;
        }
        .section {
            margin-bottom: 20px;
        }
        .section h2 {
            font-size: 16px;
            color: ${brandColor};
            margin: 0 0 10px 0;
            border-bottom: 2px solid ${brandColor};
            padding-bottom: 8px;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
        }
        .details-table tr {
            border-bottom: 1px solid #eee;
        }
        .details-table td {
            padding: 10px 0;
            vertical-align: top;
        }
        .details-table td:first-child {
            width: 160px;
            font-weight: 600;
            color: ${brandColor};
        }
        .action-box {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .action-title {
            font-weight: 600;
            margin-bottom: 8px;
        }
        .info-list {
            margin: 10px 0 0 18px;
            padding: 0;
            color: #555;
        }
        .info-list li {
            margin: 8px 0;
        }
        .footer {
            background-color: #f9f9f9;
            padding: 16px;
            text-align: center;
            font-size: 12px;
            color: #999;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="BeforeListed" class="logo">` : ""}
            <h1>BeforeListed™ - Agent Verification</h1>
        </div>
        <div class="content">
            <div class="greeting">Hi,</div>
            <p>A new agent has successfully completed registration and email verification on BeforeListed™.</p>

            <div class="section">
                <h2>Agent Details</h2>
                <table class="details-table">
                    <tr>
                        <td>Name</td>
                        <td>${displayName || "N/A"}</td>
                    </tr>
                    <tr>
                        <td>Email</td>
                        <td><a href="mailto:${agentEmail}">${agentEmail}</a></td>
                    </tr>
                    <tr>
                        <td>Registration Date</td>
                        <td>${registrationDate}</td>
                    </tr>
                </table>
            </div>

            <div class="action-box">
                <div class="action-title">Action required:</div>
                <div>Please review and activate the agent profile in the admin dashboard.</div>
            </div>

            <ul class="info-list">
                <li>Once activated, the agent will be able to log in to the agent dashboard.</li>
                <li>Once Grant Access is enabled by the admin, the agent will be able to freely match with renter requests where they have identified an opportunity that aligns with the renter's criteria.</li>
                <li>Until activation and Grant Access are completed, the agent will not have access to renter requests or matching functionality.</li>
            </ul>

            <p>If you have any questions or need assistance, please review the admin dashboard or reply to this email.</p>

            <p>Thank you,<br><strong>The BeforeListed Team</strong></p>
        </div>
        <div class="footer">
            <p style="margin: 0;">c ${currentYear} BeforeListed. All rights reserved.</p>
            ${footerLinks(brandColor)}
        </div>
    </div>
</body>
</html>
  `;
}

export function renterRegistrationVerifiedAdminTemplate(
  renterFirstName: string,
  renterLastName: string,
  renterEmail: string,
  registrationDate: string,
  referralTag: string,
  logoUrl?: string,
  brandColor: string = "#1890FF"
): string {
  const currentYear = new Date().getFullYear();
  const displayName = [renterFirstName, renterLastName]
    .filter(Boolean)
    .join(" ");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Renter Registration Verified - Admin Notification</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
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
            padding: 24px 20px;
            text-align: center;
        }
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 12px;
        }
        .header h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 600;
        }
        .content {
            padding: 24px 20px;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 12px;
        }
        .section {
            margin-bottom: 20px;
        }
        .section h2 {
            font-size: 16px;
            color: ${brandColor};
            margin: 0 0 10px 0;
            border-bottom: 2px solid ${brandColor};
            padding-bottom: 8px;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
        }
        .details-table tr {
            border-bottom: 1px solid #eee;
        }
        .details-table td {
            padding: 10px 0;
            vertical-align: top;
        }
        .details-table td:first-child {
            width: 160px;
            font-weight: 600;
            color: ${brandColor};
        }
        .footer {
            background-color: #f9f9f9;
            padding: 16px;
            text-align: center;
            font-size: 12px;
            color: #999;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="BeforeListed" class="logo">` : ""}
            <h1>BeforeListed™ - Renter Verification</h1>
        </div>
        <div class="content">
            <div class="greeting">Hi,</div>
            <p>A new renter has successfully completed registration and email verification on BeforeListed™.</p>

            <div class="section">
                <h2>Renter Details</h2>
                <table class="details-table">
                    <tr>
                        <td>Name</td>
                        <td>${displayName || "N/A"}</td>
                    </tr>
                    <tr>
                        <td>Email</td>
                        <td><a href="mailto:${renterEmail}">${renterEmail}</a></td>
                    </tr>
                    <tr>
                        <td>Registration Date</td>
                        <td>${registrationDate}</td>
                    </tr>
                    <tr>
                        <td>Referral Tag</td>
                        <td>${referralTag}</td>
                    </tr>
                </table>
            </div>

            <p>The renter can now submit and manage rental requests through the platform.</p>
            <p>If you have any questions or would like to review this registration, please visit the admin dashboard.</p>

            <p>Thank you,<br><strong>The BeforeListed Team</strong></p>
        </div>
        <div class="footer">
            <p style="margin: 0;">c ${currentYear} BeforeListed. All rights reserved.</p>
            ${footerLinks(brandColor)}
        </div>
    </div>
</body>
</html>
  `;
}

export function adminContactRequestTemplate(
  senderEmail: string,
  subject: string,
  message: string,
  receivedAt: string,
  ipAddress?: string,
  userAgent?: string,
  logoUrl?: string,
  brandColor: string = "#1890FF"
): string {
  const currentYear = new Date().getFullYear();
  const safeEmail = escapeHtml(senderEmail);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br>");
  const safeIp = ipAddress ? escapeHtml(ipAddress) : "";
  const safeUserAgent = userAgent ? escapeHtml(userAgent) : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Contact Message</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
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
            padding: 24px 20px;
            text-align: center;
        }
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 12px;
        }
        .header h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 600;
        }
        .content {
            padding: 24px 20px;
        }
        .section {
            margin-bottom: 20px;
        }
        .section h2 {
            font-size: 16px;
            color: ${brandColor};
            margin: 0 0 10px 0;
            border-bottom: 2px solid ${brandColor};
            padding-bottom: 8px;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
        }
        .details-table tr {
            border-bottom: 1px solid #eee;
        }
        .details-table td {
            padding: 10px 0;
            vertical-align: top;
        }
        .details-table td:first-child {
            width: 140px;
            font-weight: 600;
            color: ${brandColor};
        }
        .message-box {
            background-color: #fafafa;
            padding: 16px;
            border-radius: 6px;
            border: 1px solid #eee;
        }
        .footer {
            background-color: #f9f9f9;
            padding: 16px;
            text-align: center;
            font-size: 12px;
            color: #999;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="BeforeListed" class="logo">` : ""}
            <h1>New Contact Message</h1>
        </div>
        <div class="content">
            <div class="section">
                <h2>Sender Details</h2>
                <table class="details-table">
                    <tr>
                        <td>Email</td>
                        <td><a href="mailto:${safeEmail}">${safeEmail}</a></td>
                    </tr>
                    <tr>
                        <td>Subject</td>
                        <td>${safeSubject}</td>
                    </tr>
                    <tr>
                        <td>Received</td>
                        <td>${escapeHtml(receivedAt)}</td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h2>Message</h2>
                <div class="message-box">${safeMessage}</div>
            </div>

            <div class="section">
                <h2>Request Metadata</h2>
                <table class="details-table">
                    <tr>
                        <td>IP Address</td>
                        <td>${safeIp || "N/A"}</td>
                    </tr>
                    <tr>
                        <td>User Agent</td>
                        <td>${safeUserAgent || "N/A"}</td>
                    </tr>
                </table>
            </div>
        </div>
        <div class="footer">
            <p style="margin: 0;">c ${currentYear} BeforeListed. All rights reserved.</p>
            ${footerLinks(brandColor)}
        </div>
    </div>
</body>
</html>
  `;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}
