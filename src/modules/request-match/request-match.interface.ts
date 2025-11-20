// file: src/modules/request-match/request-match.interface.ts

import type { Document } from 'mongoose';

/**
 * Request Match Document Interface
 * Represents when an agent requests to match with a renter's pre-market request
 */
export interface IRequestMatch extends Document {
  agentId: string;
  preMarketRequestId: string;
  status: 'pending' | 'approved' | 'rejected';
  grantAccessRequested: boolean;
  grantAccessRequested At?: Date;
  grantAccessApproved: boolean;
  grantAccessApprovedAt?: Date;
  grantAccessPaymentStatus: 'pending' | 'paid' | 'free';
  grantAccessAmount?: number; // Admin sets this amount
  grantAccessStripePaymentId?: string;
  adminNotes?: string;
  agentNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}
