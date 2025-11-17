// file: src/modules/renter/renter.model.ts

import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model } from "mongoose";
import type { IRenterProfile, IRenterSavedRequest } from "./renter.interface";

/**
 * Renter Profile Schema
 */
const renterProfileSchema = BaseSchemaUtil.createSchema<IRenterProfile>({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  preferredLocations: [String],
  budgetMin: Number,
  budgetMax: Number,
  minBedrooms: Number,
  maxBedrooms: Number,
  petPreferences: String,
  moveInFlexibilityWeeks: {
    type: Number,
    default: 0,
  },
  activeRequestsCount: {
    type: Number,
    default: 0,
  },
  totalSavedRequests: {
    type: Number,
    default: 0,
  },
});

renterProfileSchema.index({ userId: 1 });

export const RenterProfile = model<IRenterProfile>(
  "RenterProfile",
  renterProfileSchema
);

/**
 * Renter Saved Request Schema
 */
const renterSavedRequestSchema =
  BaseSchemaUtil.createSchema<IRenterSavedRequest>({
    userId: {
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

renterSavedRequestSchema.index({ userId: 1, isActive: 1 });
renterSavedRequestSchema.index({ userId: 1, createdAt: -1 });

export const RenterSavedRequest = model<IRenterSavedRequest>(
  "RenterSavedRequest",
  renterSavedRequestSchema
);
