// file: src/modules/grant-access/grant-access.model.ts

import { GRANT_ACCESS_CONFIG } from "@/config/pre-market.config";
import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema, Types, type Document } from "mongoose";

export interface IGrantAccessRequest extends Document<
  unknown,
  any,
  any,
  Record<string, any>,
  object
> {
  _id: Types.ObjectId;
  preMarketRequestId: Types.ObjectId | string;
  agentId: Types.ObjectId | string;
  status: "pending" | "approved" | "free" | "rejected" | "paid";

  payment?: {
    amount: number;
    currency: typeof GRANT_ACCESS_CONFIG.CURRENCY;
    stripePaymentIntentId?: string;
    paymentStatus: (typeof GRANT_ACCESS_CONFIG.PAYMENT_STATUSES)[number];
    failureCount: number;
    failedAt: Date[];
    succeededAt?: Date;
  };

  adminDecision?: {
    decidedBy: Types.ObjectId;
    decidedAt: Date;
    notes?: string;
    chargeAmount?: number;
    isFree: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

const grantAccessSchema = BaseSchemaUtil.createSchema({
  preMarketRequestId: {
    type: Schema.Types.ObjectId,
    ref: "PreMarketRequest",
    required: true,
    index: true,
  },

  agentId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  status: {
    type: String,
    enum: GRANT_ACCESS_CONFIG.STATUSES,
    default: "pending",
    index: true,
  } as any,

  payment: {
    amount: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      enum: [GRANT_ACCESS_CONFIG.CURRENCY],
      default: GRANT_ACCESS_CONFIG.CURRENCY,
    },
    stripePaymentIntentId: String,
    paymentStatus: {
      type: String,
      enum: GRANT_ACCESS_CONFIG.PAYMENT_STATUSES,
      default: "pending",
      index: true,
    },
    failureCount: {
      type: Number,
      default: 0,
      min: 0,
      max: GRANT_ACCESS_CONFIG.MAX_PAYMENT_ATTEMPTS,
    },

    failedAt: [Date],
    succeededAt: Date,

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },

  adminDecision: {
    decidedBy: { type: Schema.Types.ObjectId, ref: "User" },
    decidedAt: Date,
    notes: String,
    chargeAmount: Number,
    isFree: { type: Boolean, default: false },
  },
  ...BaseSchemaUtil.mergeDefinitions(BaseSchemaUtil.timestampFields()),
});

// ============================================
// UNIQUE INDEX
// ============================================

grantAccessSchema.index(
  {
    preMarketRequestId: 1,
    agentId: 1,
  },
  { unique: true }
);

export const GrantAccessRequestModel = model<IGrantAccessRequest>(
  "GrantAccessRequest",
  grantAccessSchema as any
);
