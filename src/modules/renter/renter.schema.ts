// file: src/modules/renter/renter.schema.ts

import { z } from "zod";

/**
 * Update renter profile validation
 */
export const updateRenterProfileSchema = z.object({
  body: z.object({
    preferredLocations: z.array(z.string()).optional(),
    budgetMin: z.number().positive().optional(),
    budgetMax: z.number().positive().optional(),
    minBedrooms: z.number().nonnegative().optional(),
    maxBedrooms: z.number().nonnegative().optional(),
    petPreferences: z.string().optional(),
    moveInFlexibilityWeeks: z.number().nonnegative().optional(),
  }),
});

/**
 * Create saved request validation
 */
export const createSavedRequestSchema = z.object({
  body: z.object({
    requestName: z.string().min(1).max(100),
    preferredLocations: z.array(z.string()).min(1),
    budgetMin: z.number().positive(),
    budgetMax: z.number().positive(),
    bedrooms: z.string().min(1),
    bathrooms: z.string().min(1),
    unitFeatures: z.array(z.string()).optional(),
    buildingFeatures: z.array(z.string()).optional(),
    petPolicy: z.array(z.string()).optional(),
    acceptGuarantor: z.array(z.string()).optional(),
    notes: z.string().optional(),
    moveInDateStart: z.coerce.date().optional(),
    moveInDateEnd: z.coerce.date().optional(),
  }),
});

/**
 * Update saved request validation
 */
export const updateSavedRequestSchema = z.object({
  body: z.object({
    requestName: z.string().min(1).max(100).optional(),
    preferredLocations: z.array(z.string()).min(1).optional(),
    budgetMin: z.number().positive().optional(),
    budgetMax: z.number().positive().optional(),
    bedrooms: z.string().min(1).optional(),
    bathrooms: z.string().min(1).optional(),
    unitFeatures: z.array(z.string()).optional(),
    buildingFeatures: z.array(z.string()).optional(),
    petPolicy: z.array(z.string()).optional(),
    acceptGuarantor: z.array(z.string()).optional(),
    notes: z.string().optional(),
    moveInDateStart: z.coerce.date().optional(),
    moveInDateEnd: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
  }),
});

/**
 * Get saved request validation (params)
 */
export const getSavedRequestSchema = z.object({
  params: z.object({
    requestId: z.string().min(1),
  }),
});

/**
 * Delete saved request validation (params)
 */
export const deleteSavedRequestSchema = z.object({
  params: z.object({
    requestId: z.string().min(1),
  }),
});

/**
 * Admin get renter profile validation (params)
 */
export const adminGetRenterSchema = z.object({
  params: z.object({
    userId: z.string().min(1),
  }),
});

/**
 * Admin update renter profile validation (params + body)
 */
export const adminUpdateRenterSchema = z.object({
  params: z.object({
    userId: z.string().min(1),
  }),
  body: z.object({
    preferredLocations: z.array(z.string()).optional(),
    budgetMin: z.number().positive().optional(),
    budgetMax: z.number().positive().optional(),
    minBedrooms: z.number().nonnegative().optional(),
    maxBedrooms: z.number().nonnegative().optional(),
    petPreferences: z.string().optional(),
    moveInFlexibilityWeeks: z.number().nonnegative().optional(),
  }),
});
