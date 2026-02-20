// file: src/modules/renter/renter.model.ts

import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Types, type Document, type Query } from "mongoose";

export interface IRenterModel extends Document {
  userId: Types.ObjectId;

  email: string;
  fullName: string;
  phoneNumber?: string;
  emailSubscriptionEnabled: boolean;

  registrationType: "normal" | "agent_referral" | "admin_referral";
  referredByAgentId?: Types.ObjectId | string;
  referredByAdminId?: Types.ObjectId | string;

  // Questionnaire (for admin referral)
  questionnaire?: {
    lookingToPurchase?: boolean;
    purchaseTimeline?: string;
    buyerSpecialistNeeded?: boolean;
    renterSpecialistNeeded?: boolean;
    _id: false;
  };

  accountStatus: "active" | "inactive" | "pending";

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
  userId: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true,
  },

  ...BaseSchemaUtil.mergeDefinitions(
    BaseSchemaUtil.emailField(false),
    BaseSchemaUtil.phoneField(),
  ),

  fullName: {
    type: String,
    required: true,
    trim: true,
  } as any,

  emailSubscriptionEnabled: {
    type: Boolean,
    default: true,
    index: true,
  } as any,

  registrationType: {
    type: String,
    enum: ["normal", "agent_referral", "admin_referral"],
    default: "normal",
    index: true,
  } as any,

  referredByAgentId: {
    type: Types.ObjectId,
    ref: "User",
    sparse: true,
    index: true,
  } as any,

  referredByAdminId: {
    type: Types.ObjectId,
    ref: "User",
    sparse: true,
    index: true,
  } as any,

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

renterSchema.index({ registrationType: 1, createdAt: -1 });
renterSchema.index({ accountStatus: 1 });

renterSchema.pre(/^find/, function (this: Query<any, any>) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
});

renterSchema.pre(/^find/, function (this: Query<any, any>) {
  if (this.getOptions().populateReferrer) {
    this.populate({
      path: "referredByAgentId referredByAdminId",
      select: "fullName email referralCode",
    });
  }
});

renterSchema.pre(/^find/, function (this: Query<any, any>) {
  if (this.getOptions().populateUser) {
    this.populate({
      path: "userId",
      select: "fullName email role emailVerified",
    });
  }
});

renterSchema.virtual("registrationSourceLabel").get(function (
  this: IRenterModel,
) {
  const labels: Record<string, string> = {
    normal: "Direct Registration",
    agent_referral: "Agent Referral",
    admin_referral: "Admin Passwordless",
  };
  return labels[this.registrationType] || "Unknown";
});

renterSchema.virtual("isAdminReferred").get(function (this: IRenterModel) {
  return this.registrationType === "admin_referral";
});

renterSchema.virtual("isAgentReferred").get(function (this: IRenterModel) {
  return this.registrationType === "agent_referral";
});

renterSchema.set("toJSON", { virtuals: true });
renterSchema.set("toObject", { virtuals: true });

renterSchema.methods.softDelete = async function (
  this: IRenterModel,
): Promise<void> {
  this.isDeleted = true;
  this.deletedAt = new Date();
  await this.save();
};

renterSchema.methods.restore = async function (
  this: IRenterModel,
): Promise<void> {
  this.isDeleted = false;
  this.deletedAt = undefined;
  await this.save();
};

renterSchema.methods.completeProfile = async function (
  this: IRenterModel,
  data: Partial<IRenterModel>,
): Promise<void> {
  Object.assign(this, data);
  await this.save();
};

renterSchema.statics.findByRegistrationType = async function (
  this: any,
  type: "normal" | "agent_referral" | "admin_referral",
) {
  return this.find({ registrationType: type });
};

renterSchema.statics.findByAgent = async function (this: any, agentId: string) {
  return this.find({ referredByAgentId: agentId });
};

renterSchema.statics.findByAdmin = async function (this: any, adminId: string) {
  return this.find({ referredByAdminId: adminId });
};

renterSchema.statics.countByType = async function (this: any) {
  return this.aggregate([
    { $group: { _id: "$registrationType", count: { $sum: 1 } } },
  ]);
};

export const RenterModel = model<IRenterModel>("Renter", renterSchema as any);
