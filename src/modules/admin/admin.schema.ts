// file: src/modules/admin/admin.schema.ts

import { z } from "zod";

/**
 * Generate report validation
 */
export const generateReportSchema = z.object({
  body: z.object({
    reportType: z.enum([
      "revenue",
      "agents",
      "renters",
      "matches",
      "comprehensive",
    ]),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    format: z.enum(["json", "csv", "pdf"]).optional().default("json"),
  }),
});

/**
 * Delete user validation
 */
export const deleteUserSchema = z.object({
  params: z.object({
    userId: z.string().min(1),
  }),
  body: z.object({
    reason: z.string().min(1).max(500),
  }),
});

/**
 * Get revenue report validation
 */
export const getRevenueReportSchema = z.object({
  query: z.object({
    period: z.enum(["daily", "weekly", "monthly", "yearly"]).default("monthly"),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }),
});

/**
 * Get date range validation
 */
export const getDateRangeSchema = z.object({
  query: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }),
});
