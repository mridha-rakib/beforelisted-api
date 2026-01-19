// file: src/modules/agent/agent.interface.ts

import type { Document, Types } from "mongoose";

export interface IAccessToggleRecord {
  action: "granted" | "revoked";
  toggledBy: Types.ObjectId;
  toggledAt: Date;
  // reason?: string;
}

export interface IActivationRecord {
  action: "activated" | "deactivated";
  changedBy: Types.ObjectId;
  changedAt: Date;
  reason?: string;
}

/**
 * Agent Profile Document Interface
 */

export interface IAgentProfile extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  licenseNumber: string;
  brokerageName: string;

  // Activation Status
  isActive: boolean;
  activeAt?: Date;
  activationHistory: IActivationRecord[];

  // Admin Approval
  isApprovedByAdmin: boolean;
  approvedByAdmin?: Types.ObjectId;
  approvedAt?: Date;
  adminNotes?: string;

  // Referral Analytics
  totalRentersReferred: number;
  activeReferrals: number;
  referralConversionRate: number;

  // Access Management
  emailSubscriptionEnabled: boolean;
  acceptingRequests: boolean;
  acceptingRequestsToggledAt?: Date;
  hasGrantAccess: boolean;
  accessToggleHistory: IAccessToggleRecord[];
  lastAccessToggleAt?: Date;

  // Performance Metrics
  grantAccessCount: number;
  totalMatches: number;
  successfulMatches: number;
  avgResponseTime?: number;
  profileCompleteness: number;

  createdAt: Date;
  updatedAt: Date;
}
