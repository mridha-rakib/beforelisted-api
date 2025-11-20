// file: src/modules/request-match/request-match.schema.ts

import { z } from "zod";

/**
 * Create request match validation
 */
export const createRequestMatchSchema = z.object({
  body: z.object({
    preMarketRequestId: z.string().min(1, "Pre-market request ID is required"),
    agentNotes: z.string().max(1000).optional(),
  }),
});

/**
 * Get match by ID validation (params)
 */
export const getMatchSchema = z.object({
  params: z.object({
    matchId: z.string().min(1, "Match ID is required"),
  }),
});

/**
 * Get matches for pre-market request validation
 */
export const getMatchesForRequestSchema = z.object({
  params: z.object({
    preMarketRequestId: z.string().min(1, "Pre-market request ID is required"),
  }),
});

/**
 * Admin approve/reject match validation
 */
export const adminApproveRejectMatchSchema = z.object({
  params: z.object({
    matchId: z.string().min(1, "Match ID is required"),
  }),
  body: z.object({
    status: z.enum(["approved", "rejected"]),
    adminNotes: z.string().max(1000).optional(),
  }),
});

/**
 * Admin set grant access amount validation
 */
export const adminSetGrantAccessAmountSchema = z.object({
  params: z.object({
    matchId: z.string().min(1, "Match ID is required"),
  }),
  body: z.object({
    grantAccessAmount: z.number().positive().optional(), // null/undefined = free
  }),
});

/**
 * Agent request grant access validation
 */
export const agentRequestGrantAccessSchema = z.object({
  params: z.object({
    matchId: z.string().min(1, "Match ID is required"),
  }),
});

/**
 * Process Stripe payment validation
 */
export const processStripePaymentSchema = z.object({
  params: z.object({
    matchId: z.string().min(1, "Match ID is required"),
  }),
  body: z.object({
    stripePaymentMethodId: z
      .string()
      .min(1, "Stripe payment method ID is required"),
  }),
});

/**
 * Admin grant free access validation
 */
export const adminGrantFreeAccessSchema = z.object({
  params: z.object({
    matchId: z.string().min(1, "Match ID is required"),
  }),
});
