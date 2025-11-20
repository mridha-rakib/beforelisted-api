// file: src/modules/agent/agent.interface.ts

import type { Document, Types } from "mongoose";

/**
 * Agent Profile Document Interface
 */
export interface IAgentProfile extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  licenseNumber: string;
  brokerageName: string;
  brokerageAddress?: string;
  licenseExpiryDate: Date;
  isVerified: boolean;
  verifiedAt?: Date;
  isSuspended: boolean;
  suspendedAt?: Date;
  suspensionReason?: string;
  grantAccessCount: number; // How many renters gave access
  totalMatches: number; // Total match requests received
  successfulMatches: number; // Completed deals
  avgResponseTime?: number; // In hours
  isApprovedByAdmin: boolean;
  approvedByAdmin?: string; // Admin ID who approved
  approvedAt?: Date;
  adminNotes?: string;
  totalRentersReferred: number;
  activeReferrals: number;
  referralConversionRate: number; // Percentage
  profileCompleteness: number; // Percentage 0-100
  createdAt: Date;
  updatedAt: Date;
}
