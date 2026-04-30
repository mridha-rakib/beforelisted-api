// file: src/services/email-notification.types.ts

export interface IPreMarketAgentNotificationPayload {
  to: string;
  agentName: string;
  agentType: "Grant Access" | "Normal";
  listingTitle: string;
  listingDescription: string;
  location: string;
  serviceType: string;
  listingUrl: string;
}

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
  taggedAgentEmail: string;
  taggedAgentFullName: string;
  taggedAgentTitle: string;
  taggedAgentBrokerage: string;
}

export interface IRenterRequestExpiredNotificationPayload {
  to: string;
  renterName: string;
}

export interface IRenterRequestUpdatedNotificationPayload {
  to: string;
  agentName: string;
  requestId: string;
  renterName: string;
  updatedFields: string[];
  updatedFieldValues: string[];
  updatedAt: string;
  cc?: string[];
}

export interface INonRegisteredAgentSharedRequestNotificationPayload {
  to: string;
  agentName: string;
  renterFirstName: string;
  requestId: string;
  marketScope: string;
  minPrice: string;
  maxPrice: string;
  earliestDate: string;
  latestDate: string;
  bedrooms: string;
  bathrooms: string;
  location: string;
  features: string;
  preferencesByOrder: string;
  submittedAt: string;
}

export type INonRegisteredAgentRequestSubmissionNotificationPayload =
  INonRegisteredAgentSharedRequestNotificationPayload;

export interface IAgentRequestConfirmationPayload {
  to: string;
  agentName: string;
  renterName: string;
  renterEmail: string;
  renterPhoneNumber: string;
  requestId: string;
  marketScope: string;
  minPrice: string;
  maxPrice: string;
  earliestDate: string;
  latestDate: string;
  bedrooms: string;
  bathrooms: string;
  location: string;
  features: string;
  preferencesByOrder: string;
  submittedAt: string;
  cc?: string[];
}

export interface IRenterOpportunityFoundRegisteredAgentPayload {
  to: string;
  renterName: string;
  registeredAgentFullName: string;
  registeredAgentTitle: string;
  registeredAgentBrokerage: string;
  registeredAgentEmail: string;
  registeredAgentPhone: string;
}

export interface IRenterOpportunityFoundOtherAgentPayload {
  to: string;
  renterName: string;
  cc?: string[];
  replyTo?: string;
  requestScope?: "Upcoming" | "All Market" | "Upcoming (M)";
  matchedAgentFullName?: string;
  matchedAgentTitle?: string;
  matchedAgentBrokerageName?: string;
  matchedAgentEmail?: string;
  matchedAgentPhone?: string;
  matchedAgentDisclosureLink?: string | null;
}

export interface IMatchReferralAcknowledgmentToMatchingAgentPayload {
  to: string;
  matchedAgentName: string;
  renterFullName: string;
  registeredAgentFullName: string;
  registeredAgentTitle: string;
  registeredAgentBrokerage: string;
  requestRepresentedByTuvalMor?: boolean;
  matchedAgentIsTuvalMor?: boolean;
  cc?: string[];
}

export interface IOwnerRepresentationMatchReferralAcknowledgmentPayload {
  to: string;
  registeredAgentFirstName: string;
  renterFullName: string;
  requestId: string;
  registeredAgentFullName: string;
  registeredAgentTitle: string;
  registeredAgentBrokerage: string;
  matchedAgentFullName: string;
  matchedAgentTitle: string;
  matchedAgentBrokerage: string;
  matchedAgentEmail: string;
  matchedAgentPhoneNumber: string;
  requestRepresentedByTuvalMor?: boolean;
  cc?: string[];
}

export interface IRenterRequestClosedAgentAlertPayload {
  to: string;
  agentName: string;
  renterFullName: string;
  renterEmail: string;
  renterPhoneNumber: string;
  requestId: string;
  reason: string;
  closedAt: string;
  marketScope: string;
  minPrice: string;
  maxPrice: string;
  earliestDate: string;
  latestDate: string;
  bedrooms: string;
  bathrooms: string;
  location: string;
  features: string;
  preferencesByOrder: string;
  submittedAt: string;
  cc?: string[];
}

export interface IRenterRequestClosedRenterNotificationPayload {
  to: string;
  renterFirstName: string;
  requestId: string;
  reason: string;
  closedAt: string;
}

export interface IRenterArchiveNotificationPayload {
  to: string;
  renterName: string;
  subject: string;
  headerTitle?: string;
  bodyHtml: string;
  cc?: string[];
  replyTo?: string;
  templateType: string;
}

export interface IRenterSearchReactivatedAgentNotificationPayload {
  to: string;
  agentName: string;
  clientFullName: string;
  requestId: string;
  requestLink: string;
}

export interface IActiveSearchConfirmationReminderPayload {
  to: string;
  renterName: string;
  subject: string;
  headerTitle?: string;
  bodyHtml: string;
  cc?: string[];
  replyTo?: string;
  templateType: string;
}

export interface ISystemArchivedSearchInactiveAgentNotificationPayload {
  to: string;
  agentName: string;
  renterName: string;
  requestId: string;
}

export interface IRenterUnarchiveNotificationPayload {
  to: string;
  renterName: string;
  subject: string;
  headerTitle?: string;
  bodyHtml: string;
  cc?: string[];
  replyTo?: string;
  templateType: string;
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
  agentTitle: string;
  agentBrokerage: string;
  agentEmail: string;
  agentPhoneNumber: string;
  registrationDate: string;
  agentRegistrationLink: string;
}

export interface IRenterRegistrationVerifiedAdminPayload {
  to: string;
  renterName: string;
  renterPhone: string;
  renterEmail: string;
  registrationDate: string;
  registeredAgentName: string;
  registeredAgentBrokerage: string;
  registeredAgentEmail?: string;
}

export interface IRenterRegisteredAgentInactivePayload {
  to: string;
  renterName: string;
  defaultAgentReferralLoginLink?: string;
  notificationReason?: "inactive" | "deleted";
}

export interface IPreMarketAgentNotification {
  notificationId: string;
  agentId: string;
  preMarketRequestId: string;
  type: "NEW_LISTING" | "ACCESS_GRANTED" | "ACCESS_DENIED" | "PAYMENT_REQUIRED";
  title: string;
  message: string;
  listingTitle?: string;
  location?: string;
  serviceType?: string;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
  actionUrl?: string;
}

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
  actionUrl?: string;
}

export interface INotificationEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
  attempt: number;
  maxAttempts: number;
}
