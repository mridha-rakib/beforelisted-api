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

  isActive: {
    type: Boolean,
    default: false,
    index: true,
  },

  activeAt: {
    type: Date,
  },
  activationHistory: [
    {
      action: {
        type: String,
        enum: ["activated", "deactivated"],
        required: true,
      },
      changedBy: {
        type: Types.ObjectId,
        ref: "User",
        required: true,
      },
      changedAt: {
        type: Date,
        default: Date.now,
      },
      reason: String,
      _id: false,
    },
  ],

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

  // ============================================
  // ACCESS MANAGEMENT
  // ============================================

  emailSubscriptionEnabled: {
    type: Boolean,
    default: true,
    index: true,
  },

  acceptingRequests: {
    type: Boolean,
    default: true,
    index: true,
  },
  acceptingRequestsToggledAt: {
    type: Date,
  },

  hasGrantAccess: {
    type: Boolean,
    default: false,
    index: true,
    description: "Admin-granted access to view all pre-market requests",
  },
  accessToggleHistory: [
    {
      action: {
        type: String,
        enum: ["granted", "revoked"],
        required: true,
      },
      toggledBy: {
        type: Types.ObjectId,
        ref: "User",
        required: true,
      },
      toggledAt: {
        type: Date,
        default: Date.now,
      },
      _id: false,
    },
  ],

  lastAccessToggleAt: {
    type: Date,
    index: true,
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
});

agentProfileSchema.index({ createdAt: -1 });
agentProfileSchema.index({ totalRentersReferred: -1 }); // Leaderboard

/**
 * Auto-populate userId with user details
 */
agentProfileSchema.pre(/^find/, function (this: any) {
  if (this.getOptions().populateUser) {
    this.populate({
      path: "userId",
      select:
        "fullName email phoneNumber referralCode totalReferrals accountStatus emailVerified",
    });
  }
});

export const AgentProfile = model<IAgentProfile>(
  "AgentProfile",
  agentProfileSchema
);
