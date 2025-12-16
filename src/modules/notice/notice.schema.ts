// file: src/modules/notice/notice.schema.ts

import { z } from "zod";

export const createNoticeSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(200, "Title must be less than 200 characters"),
    content: z.string().min(1, "Content is required"),
    description: z
      .string()
      .max(500, "Description must be less than 500 characters")
      .optional(),
    isActive: z.boolean().default(true),
  }),
});

export const updateNoticeSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(200, "Title must be less than 200 characters")
      .optional(),
    content: z.string().min(1, "Content is required").optional(),
    description: z
      .string()
      .max(500, "Description must be less than 500 characters")
      .optional(),
    isActive: z.boolean().optional(),
  }),
});
