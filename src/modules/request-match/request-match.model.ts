// file: src/modules/request-match/request-match.model.ts

import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model } from "mongoose";
import type { IRequestMatch } from "./request-match.interface";

/**
 * Request Match Schema
 */
const requestMatchSchema = BaseSchemaUtil.createSchema<IRequestMatch>({
  agentId: {
    type: String,
    required: true,
    index: true,
  },
  preMarketRequestId: {
    type: String,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
    index: true,
  },
  grantAccessRequested: {
    type: Boolean,
    default: false,
  },
  grantAccessRequestedAt: Date,
  grantAccessApproved: {
    type: Boolean,
    default: false,
  },
  grantAccessApprovedAt: Date,
  grantAccessPaymentStatus: {
    type: String,
    enum: ["pending", "paid", "free"],
    default: "pending",
  },
  grantAccessAmount: Number,
  grantAccessStripePaymentId: String,
  adminNotes: String,
  agentNotes: String,
});

// Composite indexes for efficient queries
requestMatchSchema.index({ agentId: 1, status: 1 });
requestMatchSchema.index({ preMarketRequestId: 1, status: 1 });
requestMatchSchema.index({ agentId: 1, grantAccessApproved: 1 });
requestMatchSchema.index({ createdAt: -1 });

export const RequestMatch = model<IRequestMatch>(
  "RequestMatch",
  requestMatchSchema
);
