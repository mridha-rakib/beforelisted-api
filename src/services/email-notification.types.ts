// file: src/services/email-notification.types.ts

/**
 * Pre-Market Notification Email Types
 * Separate from main email types for clarity
 */


/**
 * Email sent to agents (both Grant Access + Normal)
 * WITHOUT renter information
 */
export interface IPreMarketAgentNotificationPayload {
  to: string; // Agent email
  agentName: string;
  agentType: "Grant Access" | "Normal";
  listingTitle: string;
  listingDescription: string;
  location: string;
  serviceType: string;
  listingUrl: string; // Link to view listing
}

// ============================================
// ADMIN NOTIFICATION PAYLOAD
// ============================================

/**
 * Email sent to admin (single admin)
 * WITH full renter information
 */
export interface IPreMarketAdminNotificationPayload {
  to: string; // Admin email
  listingTitle: string;
  listingDescription: string;
  location: string;
  serviceType: string;
  renterName: string;
  renterEmail: string;
  renterPhone: string;
  listingUrl: string;
  preMarketRequestId: string;
}

// ============================================
// IN-APP NOTIFICATION TYPES (Database)
// ============================================

/**
 * In-app notification for agents
 * Stored in database for UI display
 */
export interface IPreMarketAgentNotification {
  notificationId: string;
  agentId: string;
  preMarketRequestId: string;
  type: "NEW_LISTING" | "ACCESS_GRANTED" | "ACCESS_DENIED" | "PAYMENT_REQUIRED";
  title: string;
  message: string; // "New pre-market request available"
  listingTitle?: string;
  location?: string;
  serviceType?: string;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
  actionUrl?: string; // Link to view listing
}

/**
 * In-app notification for admin
 * Stored in database for UI display
 */
export interface IPreMarketAdminNotification {
  notificationId: string;
  preMarketRequestId: string;
  type: "NEW_LISTING" | "NEW_ACCESS_REQUEST" | "PAYMENT_RECEIVED";
  title: string;
  message: string;
  renterName?: string;
  renterEmail?: string;
  renterPhone?: string;
  listingTitle?: string;
  location?: string;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
  actionUrl?: string; // Link to view details
}

// ============================================
// NOTIFICATION RESULT TYPES
// ============================================

/**
 * Result of sending a notification email
 */
export interface INotificationEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
  attempt: number;
  maxAttempts: number;
}
