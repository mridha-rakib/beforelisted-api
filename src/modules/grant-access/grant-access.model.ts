// file: src/modules/grant-access/grant-access.model.ts

import type { Document, Types } from "mongoose";

import { model, Schema } from "mongoose";

import { GRANT_ACCESS_CONFIG } from "@/config/pre-market.config";
import { BaseSchemaUtil } from "@/utils/base-schema.utils";

export type IGrantAccessRequest = {
  _id: Types.ObjectId;
  preMarketRequestId: Types.ObjectId | string;
  agentId: Types.ObjectId | string;
  status: "pending" | "approved" | "free" | "rejected" | "paid";
  representation_type?: "owner_representation" | "renter_representation";
  representationSelectedAt?: Date;
  opportunityDetails?: string;
  /**
   * Chronological history of opportunityDetails messages the agent has sent
   * for this grant, including the original. Most recent message is also
   * reflected in the top-level `opportunityDetails` field for convenience.
   * Used so admins can see all follow-up attempts (e.g. "I found another
   * place for you") when reviewing a pending grant.
   */
  opportunityDetailsHistory?: Array<{
    message: string;
    sentAt: Date;
    isAdditionalOpportunity?: boolean;
  }>;
  /**
   * The scope the request was at when this match was created. Used by the
   * admin scope-toggle lock to decide whether a request is genuinely in the
   * "Upcoming (M)" state — only grants matched while the request was at
   * "All Market" count. Records predating this field default to null and
   * are treated as "matched at Upcoming" for backward compatibility.
   */
  scopeAtMatch?: "Upcoming" | "All Market" | null;

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
} & Document<
  unknown,
  any,
  any,
  Record<string, any>,
  object
>;

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

  representation_type: {
    type: String,
    enum: ["owner_representation", "renter_representation"],
    index: true,
  },

  representationSelectedAt: {
    type: Date,
  },

  opportunityDetails: {
    type: String,
    trim: true,
    maxlength: 350,
  },

  opportunityDetailsHistory: {
    type: [
      {
        message: { type: String, trim: true, maxlength: 350 },
        sentAt: { type: Date, default: Date.now },
        isAdditionalOpportunity: { type: Boolean, default: false },
      },
    ],
    default: [],
  },

  scopeAtMatch: {
    type: String,
    enum: ["Upcoming", "All Market", null],
    default: null,
    index: true,
  },

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
  { unique: true },
);
grantAccessSchema.index({ agentId: 1, status: 1, createdAt: -1 });
grantAccessSchema.index({ preMarketRequestId: 1, status: 1, createdAt: -1 });

export const GrantAccessRequestModel = model<IGrantAccessRequest>(
  "GrantAccessRequest",
  grantAccessSchema as any,
);
