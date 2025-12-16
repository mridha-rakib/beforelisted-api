// file: src/modules/faq/faq.schema.ts

import { z } from "zod";

export const createFAQSchema = z.object({
  body: z.object({
    question: z
      .string()
      .min(1, "Question is required")
      .max(300, "Question must be less than 300 characters"),
    answer: z.string().min(1, "Answer is required"),
    isActive: z.boolean().default(true),
  }),
});

export const updateFAQSchema = z.object({
  body: z.object({
    question: z
      .string()
      .min(1, "Question is required")
      .max(300, "Question must be less than 300 characters")
      .optional(),
    answer: z.string().min(1, "Answer is required").optional(),
    isActive: z.boolean().optional(),
  }),
});

export const getFAQByCategorySchema = z.object({
  params: z.object({}),
});
