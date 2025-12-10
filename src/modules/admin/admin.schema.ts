// file: src/modules/admin/schemas/admin-pre-market.schema.ts

import { z } from "zod";

export const adminPreMarketListSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    sort: z.string().default("-createdAt"),
    // Location filters
    borough: z.string().optional(),
    neighborhood: z.string().optional(),
    // Price filters
    minPrice: z.coerce.number().int().nonnegative().optional(),
    maxPrice: z.coerce.number().int().nonnegative().optional(),
    // Bedroom/bathroom filters
    bedrooms: z.string().optional(), // "Studio,1BR,2BR"
    bathrooms: z.string().optional(), // "1,2,3"
    // Status filters
    status: z.enum(["active", "archived", "deleted"]).optional(),
    registrationType: z
      .enum(["normal", "agent_referral", "admin_referral"])
      .optional(),
    emailVerified: z
      .enum(["true", "false"])
      .transform((val) => val === "true")
      .optional(),
    // Date range filters
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
  }),
});

export const adminPreMarketDetailSchema = z.object({
  params: z.object({
    requestId: z.string().min(24, "Invalid request ID"),
  }),
});

export const adminPreMarketStatisticsSchema = z.object({});
