// file: src/modules/pre-market-request/pre-market-request.model.ts

import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model } from "mongoose";
import type { IPreMarketRequest } from "./pre-market-request.interface";

/**
 * Pre-Market Request Schema
 */
const preMarketRequestSchema = BaseSchemaUtil.createSchema<IPreMarketRequest>({
  renterId: {
    type: String,
    required: true,
    index: true,
  },
  requestName: {
    type: String,
    required: true,
  },
  preferredLocations: {
    type: [String],
    required: true,
    index: true,
  },
  budgetMin: {
    type: Number,
    required: true,
  },
  budgetMax: {
    type: Number,
    required: true,
  },
  bedrooms: {
    type: String,
    required: true,
  },
  bathrooms: {
    type: String,
    required: true,
  },
  unitFeatures: [String],
  buildingFeatures: [String],
  petPolicy: [String],
  acceptGuarantor: [String],
  notes: String,
  moveInDateStart: Date,
  moveInDateEnd: Date,
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  matchCount: {
    type: Number,
    default: 0,
  },
});

// Composite indexes for efficient queries
preMarketRequestSchema.index({ renterId: 1, isActive: 1 });
preMarketRequestSchema.index({ renterId: 1, createdAt: -1 });
preMarketRequestSchema.index({ isActive: 1, createdAt: -1 });
preMarketRequestSchema.index({ preferredLocations: 1, isActive: 1 });

export const PreMarketRequest = model<IPreMarketRequest>(
  "PreMarketRequest",
  preMarketRequestSchema
);
