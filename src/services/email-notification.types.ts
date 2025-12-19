// file: src/services/email-notification.types.ts

export interface IPreMarketAgentNotificationPayload {
  to: string;
  agentName: string;
  agentType: "Grant Access" | "Normal";
  listingTitle: string;
  location: string;
  serviceType: string;
  listingUrl: string;
}

// ============================================
// ADMIN NOTIFICATION PAYLOAD
// ============================================

export interface IPreMarketAdminNotificationPayload {
  to: string;
  listingTitle: string;
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
