// file: src/modules/renter/renter.model.ts

import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { Schema, type Document, type Query } from "mongoose";

// ============================================
// INTERFACE
// ============================================

export interface IRenterModel extends Document {
  // User reference
  userId: Schema.Types.ObjectId;

  // Common fields (from User)
  email: string;
  fullName: string;
  phoneNumber?: string;

  // Registration tracking
  registrationType: "normal" | "agent_referral" | "admin_referral";
  referredByAgentId?: Schema.Types.ObjectId;
  referredByAdminId?: Schema.Types.ObjectId;

  // Profile data
  occupation?: string;
  moveInDate?: Date;
  petFriendly?: boolean;

  // Questionnaire (for admin referral)
  questionnaire?: {
    lookingToPurchase?: boolean;
    purchaseTimeline?: string;
    buyerSpecialistNeeded?: boolean;
    renterSpecialistNeeded?: boolean;
  };

  // Account status
  emailVerified: boolean;
  accountStatus: "active" | "suspended" | "pending";

  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;

  // Timestamps (auto-added by BaseSchemaUtil)
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SCHEMA DEFINITION
// ============================================

/**
 * ✅ Using BaseSchemaUtil.createSchema()
 * This automatically adds:
 * - timestamps (createdAt, updatedAt)
 * - pagination plugin
 * - all Mongoose schema configuration
 */
const renterSchema = BaseSchemaUtil.createSchema({
  // ============================================
  // USER REFERENCE
  // ============================================
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true,
  },

  // ============================================
  // COMMON FIELDS (Using BaseSchemaUtil Helpers)
  // ============================================
  /**
   * ✅ emailField(false) because email is NOT unique here
   * - Email uniqueness is enforced in User model
   * - This is a denormalized copy for easy filtering
   */
  ...BaseSchemaUtil.mergeDefinitions(
    BaseSchemaUtil.emailField(false), // Not unique in renter profile
    BaseSchemaUtil.phoneField() // Optional phone field
  ),

  fullName: {
    type: String,
    required: true,
    trim: true,
  },

  // ============================================
  // REGISTRATION TYPE & REFERRAL TRACKING
  // ============================================
  /**
   * ✅ Tracks which registration flow was used
   * - "normal": Direct registration
   * - "agent_referral": Referred by agent (AGT-xxxx)
   * - "admin_referral": Referred by admin (ADM-xxxx) - passwordless
   */
  registrationType: {
    type: String,
    enum: ["normal", "agent_referral", "admin_referral"],
    default: "normal",
    index: true,
  },

  /**
   * ✅ Agent who referred this renter (if agent_referral flow)
   * Sparse index: Only indexed if field exists
   */
  referredByAgentId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    sparse: true,
    index: true,
  },

  /**
   * ✅ Admin who referred this renter (if admin_referral flow)
   * Sparse index: Only indexed if field exists
   */
  referredByAdminId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    sparse: true,
    index: true,
  },

  // ============================================
  // RENTER PROFILE DATA
  // ============================================
  occupation: {
    type: String,
    sparse: true,
  },

  moveInDate: {
    type: Date,
    sparse: true,
  },

  petFriendly: {
    type: Boolean,
    default: false,
  },

  // ============================================
  // QUESTIONNAIRE DATA (For Admin Referral Only)
  // ============================================
  /**
   * ✅ Populated only for admin referral flow
   * Contains renter's preferences and specialist needs
   */
  questionnaire: {
    type: {
      lookingToPurchase: {
        type: Boolean,
        default: false,
      },
      purchaseTimeline: {
        type: String,
        enum: ["immediate", "2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4"],
        sparse: true,
      },
      buyerSpecialistNeeded: {
        type: Boolean,
        default: false,
      },
      renterSpecialistNeeded: {
        type: Boolean,
        default: false,
      },
    },
    sparse: true, // Only exists for admin referral renters
  },

  // ============================================
  // ACCOUNT STATUS
  // ============================================
  emailVerified: {
    type: Boolean,
    default: false,
    index: true,
  },

  accountStatus: {
    type: String,
    enum: ["active", "suspended", "pending"],
    default: "pending",
    index: true,
  },

  // ============================================
  // SOFT DELETE FIELDS (Using BaseSchemaUtil Helper)
  // ============================================
  /**
   * ✅ Using BaseSchemaUtil.softDeleteFields()
   * Provides:
   * - isDeleted: boolean (indexed)
   * - deletedAt: date (indexed)
   *
   * Allows querying soft-deleted vs active renters
   */
  ...BaseSchemaUtil.mergeDefinitions(BaseSchemaUtil.softDeleteFields()),
});

// ============================================
// INDEXES (Performance Optimization)
// ============================================

/**
 * ✅ Composite index for common queries
 * - Get verified renters for a user: { userId: 1, emailVerified: 1 }
 */
renterSchema.index({ userId: 1, emailVerified: 1 });

/**
 * ✅ Composite index for registration analytics
 * - Get renters by type created recently: { registrationType: 1, createdAt: -1 }
 */
renterSchema.index({ registrationType: 1, createdAt: -1 });

/**
 * ✅ Index for agent referral tracking
 * - Find all renters referred by specific agent: { referredByAgentId: 1 }
 */
renterSchema.index({ referredByAgentId: 1 });

/**
 * ✅ Index for admin referral tracking
 * - Find all renters referred by specific admin: { referredByAdminId: 1 }
 */
renterSchema.index({ referredByAdminId: 1 });

/**
 * ✅ Index for account status queries
 * - Find pending renters: { accountStatus: 1 }
 */
renterSchema.index({ accountStatus: 1 });

// ============================================
// MIDDLEWARE / HOOKS
// ============================================

/**
 * ✅ Auto-exclude soft-deleted renters in find queries
 * Unless explicitly requested with { includeDeleted: true }
 */
renterSchema.pre(/^find/, function (this: Query) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
});

/**
 * ✅ Auto-populate referrer details
 * If { populateReferrer: true } option provided
 */
renterSchema.pre(/^find/, function (this: Query) {
  if (this.getOptions().populateReferrer) {
    this.populate({
      path: "referredByAgentId referredByAdminId",
      select: "fullName email referralCode",
    });
  }
});

/**
 * ✅ Auto-populate user details
 * If { populateUser: true } option provided
 */
renterSchema.pre(/^find/, function (this: Query) {
  if (this.getOptions().populateUser) {
    this.populate({
      path: "userId",
      select: "fullName email role emailVerified",
    });
  }
});

// ============================================
// VIRTUAL FIELDS
// ============================================

/**
 * ✅ Determine registration source label
 * Returns human-readable registration type
 */
renterSchema.virtual("registrationSourceLabel").get(function (
  this: IRenterModel
) {
  const labels: Record<string, string> = {
    normal: "Direct Registration",
    agent_referral: "Agent Referral",
    admin_referral: "Admin Passwordless",
  };
  return labels[this.registrationType] || "Unknown";
});

/**
 * ✅ Check if renter was admin-referred (passwordless)
 */
renterSchema.virtual("isAdminReferred").get(function (this: IRenterModel) {
  return this.registrationType === "admin_referral";
});

/**
 * ✅ Check if renter was agent-referred
 */
renterSchema.virtual("isAgentReferred").get(function (this: IRenterModel) {
  return this.registrationType === "agent_referral";
});

/**
 * ✅ Check if renter account is ready for use
 */
renterSchema.virtual("isAccountReady").get(function (this: IRenterModel) {
  return this.emailVerified && this.accountStatus === "active";
});

// Ensure virtual fields are included in JSON
renterSchema.set("toJSON", { virtuals: true });
renterSchema.set("toObject", { virtuals: true });

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * ✅ Mark renter as soft-deleted
 */
renterSchema.methods.softDelete = async function (
  this: IRenterModel
): Promise<void> {
  this.isDeleted = true;
  this.deletedAt = new Date();
  await this.save();
};

/**
 * ✅ Restore soft-deleted renter
 */
renterSchema.methods.restore = async function (
  this: IRenterModel
): Promise<void> {
  this.isDeleted = false;
  this.deletedAt = undefined;
  await this.save();
};

/**
 * ✅ Complete renter profile (after registration)
 */
renterSchema.methods.completeProfile = async function (
  this: IRenterModel,
  data: Partial<IRenterModel>
): Promise<void> {
  Object.assign(this, data);
  await this.save();
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * ✅ Find renters by registration type
 */
renterSchema.statics.findByRegistrationType = async function (
  this: any,
  type: "normal" | "agent_referral" | "admin_referral"
) {
  return this.find({ registrationType: type });
};

/**
 * ✅ Find renters referred by specific agent
 */
renterSchema.statics.findByAgent = async function (this: any, agentId: string) {
  return this.find({ referredByAgentId: agentId });
};

/**
 * ✅ Find renters referred by specific admin
 */
renterSchema.statics.findByAdmin = async function (this: any, adminId: string) {
  return this.find({ referredByAdminId: adminId });
};

/**
 * ✅ Count renters by registration type
 */
renterSchema.statics.countByType = async function (this: any) {
  return this.aggregate([
    { $group: { _id: "$registrationType", count: { $sum: 1 } } },
  ]);
};
