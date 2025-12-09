// file: src/modules/renter/renter.model.ts

import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Types, type Document, type Query } from "mongoose";

// ============================================
// INTERFACE
// ============================================

export interface IRenterModel extends Document {
  // User reference
  userId: Types.ObjectId;

  // Common fields (from User)
  email: string;
  fullName: string;
  phoneNumber?: string;

  // Registration tracking
  registrationType: "normal" | "agent_referral" | "admin_referral";
  referredByAgentId?: Types.ObjectId | string;
  referredByAdminId?: Types.ObjectId | string;

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
    _id: false;
  };

  accountStatus: "active" | "suspended" | "pending";

  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;

  // Timestamps (auto-added by BaseSchemaUtil)
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  softDelete(): Promise<void>;
  restore(): Promise<void>;
  completeProfile(data: Partial<IRenterModel>): Promise<void>;
}

const renterSchema = BaseSchemaUtil.createSchema({
  // ============================================
  // USER REFERENCE
  // ============================================
  userId: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true,
  },

  ...BaseSchemaUtil.mergeDefinitions(
    BaseSchemaUtil.emailField(false),
    BaseSchemaUtil.phoneField()
  ),

  fullName: {
    type: String,
    required: true,
    trim: true,
  } as any,

  registrationType: {
    type: String,
    enum: ["normal", "agent_referral", "admin_referral"],
    default: "normal",
    index: true,
  } as any,

  /**
   * Sparse index: Only indexed if field exists
   */
  referredByAgentId: {
    type: Types.ObjectId,
    ref: "User",
    sparse: true,
    index: true,
  } as any,

  /**
   * Sparse index: Only indexed if field exists
   */
  referredByAdminId: {
    type: Types.ObjectId,
    ref: "User",
    sparse: true,
    index: true,
  } as any,

  // ============================================
  // QUESTIONNAIRE DATA (For Admin Referral Only)
  // ============================================

  questionnaire: {
    type: {
      lookingToPurchase: {
        type: Boolean,
        default: false,
      },
      purchaseTimeline: {
        type: String,
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
      _id: false,
    },
    sparse: true,
  } as any,

  ...BaseSchemaUtil.mergeDefinitions(BaseSchemaUtil.softDeleteFields()),
});

// ============================================
// INDEXES (Performance Optimization)
// ============================================

renterSchema.index({ registrationType: 1, createdAt: -1 });
renterSchema.index({ referredByAgentId: 1 });
renterSchema.index({ referredByAdminId: 1 });
renterSchema.index({ accountStatus: 1 });

// ============================================
// MIDDLEWARE / HOOKS
// ============================================

/**
 * ✅ Auto-exclude soft-deleted renters in find queries
 * Unless explicitly requested with { includeDeleted: true }
 */
renterSchema.pre(/^find/, function (this: Query<any, any>) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
});

/**
 * ✅ Auto-populate referrer details
 * If { populateReferrer: true } option provided
 */
renterSchema.pre(/^find/, function (this: Query<any, any>) {
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
renterSchema.pre(/^find/, function (this: Query<any, any>) {
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

export const RenterModel = model<IRenterModel>("Renter", renterSchema as any);
