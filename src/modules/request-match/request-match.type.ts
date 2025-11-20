// file: src/modules/request-match/request-match.type.ts

/**
 * Create Request Match payload
 */
export type CreateRequestMatchPayload = {
  preMarketRequestId: string;
  agentNotes?: string;
};

/**
 * Request Match response
 */
export type RequestMatchResponse = {
  _id: string;
  agentId: string;
  preMarketRequestId: string;
  status: "pending" | "approved" | "rejected";
  grantAccessRequested: boolean;
  grantAccessApproved: boolean;
  grantAccessPaymentStatus: "pending" | "paid" | "free";
  grantAccessAmount?: number;
  adminNotes?: string;
  agentNotes?: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Admin set grant access price payload
 */
export type AdminSetGrantAccessPricePayload = {
  grantAccessAmount?: number; // null = free, number = charge amount
};

/**
 * Stripe payment payload
 */
export type StripePaymentPayload = {
  matchId: string;
  stripePaymentMethodId: string;
};

/**
 * Admin approve/reject match
 */
export type AdminApproveRejectMatchPayload = {
  status: "approved" | "rejected";
  adminNotes?: string;
};
