// file: src/modules/pre-market-request/pre-market-request.schema.ts

import { z } from "zod";

/**
 * Create pre-market request validation
 */
export const createPreMarketRequestSchema = z.object({
  body: z.object({
    requestName: z.string().min(1).max(100),
    preferredLocations: z
      .array(z.string())
      .min(1, "At least one location required"),
    budgetMin: z.number().positive("Budget must be positive"),
    budgetMax: z.number().positive("Budget must be positive"),
    bedrooms: z.string().min(1, "Bedrooms selection required"),
    bathrooms: z.string().min(1, "Bathrooms selection required"),
    unitFeatures: z.array(z.string()).optional(),
    buildingFeatures: z.array(z.string()).optional(),
    petPolicy: z.array(z.string()).optional(),
    acceptGuarantor: z.array(z.string()).optional(),
    notes: z.string().max(1000).optional(),
    moveInDateStart: z.coerce.date().optional(),
    moveInDateEnd: z.coerce.date().optional(),
  }),
});

/**
 * Update pre-market request validation (renter can only update name)
 */
export const updatePreMarketRequestSchema = z.object({
  body: z.object({
    requestName: z.string().min(1).max(100),
  }),
});

/**
 * Get pre-market request validation (params)
 */
export const getPreMarketRequestSchema = z.object({
  params: z.object({
    requestId: z.string().min(1),
  }),
});

/**
 * Deactivate request validation (params)
 */
export const deactivateRequestSchema = z.object({
  params: z.object({
    requestId: z.string().min(1),
  }),
});

/**
 * Activate request validation (params)
 */
export const activateRequestSchema = z.object({
  params: z.object({
    requestId: z.string().min(1),
  }),
});

/**
 * Admin filter requests validation (query)
 */
export const adminFilterRequestsSchema = z.object({
  query: z.object({
    page: z.coerce.number().positive().default(1).optional(),
    limit: z.coerce.number().positive().max(100).default(10).optional(),
    sort: z.string().default("-createdAt").optional(),
    location: z.string().optional(),
    budgetMin: z.coerce.number().positive().optional(),
    budgetMax: z.coerce.number().positive().optional(),
    bedrooms: z.string().optional(),
    bathrooms: z.string().optional(),
    isActive: z.enum(["true", "false"]).optional(),
  }),
});
