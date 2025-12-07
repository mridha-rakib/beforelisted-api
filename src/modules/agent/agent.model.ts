// file: src/modules/agent/agent.model.ts

import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Types } from "mongoose";
import type { IAgentProfile } from "./agent.interface";

const agentProfileSchema = BaseSchemaUtil.createSchema<IAgentProfile>({
  userId: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true,
  } as any,
  licenseNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  brokerageName: {
    type: String,
    required: true,
  },
  // ============================================
  // VERIFICATION & STATUS
  // ============================================

  isVerified: {
    type: Boolean,
    default: false,
    index: true,
  },
  verifiedAt: Date,

  isSuspended: {
    type: Boolean,
    default: false,
    index: true,
  },
  suspendedAt: Date,
  suspensionReason: String,

  isApprovedByAdmin: {
    type: Boolean,
    default: false,
    index: true,
  },
  approvedByAdmin: {
    type: Types.ObjectId,
    ref: "User",
  },
  approvedAt: Date,
  adminNotes: String,

  // ============================================
  // REFERRAL ANALYTICS
  // ============================================

  /**
   * Total renters referred by this agent
   * Synced with User.totalReferrals
   */
  totalRentersReferred: {
    type: Number,
    default: 0,
    min: 0,
  },

  /**
   * Renters who completed registration
   */
  activeReferrals: {
    type: Number,
    default: 0,
    min: 0,
  },

  /**
   * Conversion rate: (activeReferrals / totalRentersReferred) * 100
   */
  referralConversionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },

  // ============================================
  // PERFORMANCE METRICS
  // ============================================

  grantAccessCount: {
    type: Number,
    default: 0,
  },
  totalMatches: {
    type: Number,
    default: 0,
  },
  successfulMatches: {
    type: Number,
    default: 0,
  },
  avgResponseTime: Number,

  profileCompleteness: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
});

// ============================================
// INDEXES
// ============================================

agentProfileSchema.index({ userId: 1, isVerified: 1 });
agentProfileSchema.index({ isApprovedByAdmin: 1, isSuspended: 1 });
agentProfileSchema.index({ createdAt: -1 });
agentProfileSchema.index({ totalRentersReferred: -1 }); // Leaderboard

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Auto-populate userId with user details
 */
agentProfileSchema.pre(/^find/, function (this: any) {
  if (this.getOptions().populateUser) {
    this.populate({
      path: "userId",
      select: "fullName email phone referralCode totalReferrals",
    });
  }
});

export const AgentProfile = model<IAgentProfile>(
  "AgentProfile",
  agentProfileSchema
);
