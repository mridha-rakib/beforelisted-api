// file: src/modules/monthly-report/monthly-report.schema.ts

import { z } from "zod";

export const createMonthlyReportSchema = z.object({
  body: z.object({
    link: z.string().min(1, "Link is required"),
    month: z
      .number()
      .int("Month must be an integer")
      .min(1, "Month must be between 1 and 12")
      .max(12, "Month must be between 1 and 12"),
    year: z
      .number()
      .int("Year must be an integer")
      .min(2000, "Year must be 2000 or later")
      .max(2100, "Year must be 2100 or earlier"),
    isActive: z.boolean().default(true),
  }),
});

export const updateMonthlyReportSchema = z.object({
  body: z.object({
    link: z.string().min(1, "Link is required").optional(),
    month: z
      .number()
      .int("Month must be an integer")
      .min(1, "Month must be between 1 and 12")
      .max(12, "Month must be between 1 and 12")
      .optional(),
    year: z
      .number()
      .int("Year must be an integer")
      .min(2000, "Year must be 2000 or later")
      .max(2100, "Year must be 2100 or earlier")
      .optional(),
    isActive: z.boolean().optional(),
  }),
});

export const getReportByIdSchema = z.object({
  params: z.object({
    id: z.string().min(24, "Invalid report ID"),
  }),
});

export const deleteReportSchema = z.object({
  params: z.object({
    id: z.string().min(24, "Invalid report ID"),
  }),
});
