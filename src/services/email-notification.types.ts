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
  listingDescription: string;
  location: string;
  serviceType: string;
  renterName: string;
  renterEmail: string;
  renterPhone: string;
  listingUrl: string;
  preMarketRequestId: string;
  requestId: string;
}

export interface IRenterRequestConfirmationPayload {
  to: string;
  renterName: string;
  cc?: string[];
}

export interface IRenterRequestUpdatedNotificationPayload {
  to: string;
  agentName: string;
  requestId: string;
  updatedFields: string[];
  updatedAt: string;
  cc?: string[];
}

export interface IAgentRequestConfirmationPayload {
  to: string;
  agentName: string;
  requestId: string;
  borough: string;
  bedrooms: string;
  maxRent: string;
  submittedAt: string;
  cc?: string[];
}

export interface IRenterOpportunityFoundRegisteredAgentPayload {
  to: string;
  renterName: string;
  cc?: string[];
}

export interface IRenterOpportunityFoundOtherAgentPayload {
  to: string;
  renterName: string;
  cc?: string[];
}

export interface IRenterRequestClosedAgentAlertPayload {
  to: string;
  agentName: string;
  requestId: string;
  reason: string;
  closedAt: string;
  cc?: string[];
}

export interface IRenterAccessGrantedNotificationPayload {
  to: string;
  renterName: string;
  agentName: string;
  agentEmail: string;
  listingTitle: string;
  location: string;
  accessType: "free" | "paid";
  listingUrl: string;
}

export interface IAdminContactRequestPayload {
  to: string;
  senderEmail: string;
  subject: string;
  message: string;
  receivedAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface IAgentRegistrationVerifiedAdminPayload {
  to: string;
  agentFirstName: string;
  agentLastName: string;
  agentEmail: string;
  registrationDate: string;
}

export interface IRenterRegistrationVerifiedAdminPayload {
  to: string;
  renterFirstName: string;
  renterLastName: string;
  renterEmail: string;
  registrationDate: string;
  referralTag: string;
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
