// file: src/modules/moving-discounts/moving-discounts.schema.ts

import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const createCategorySchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(200, "Title must be less than 200 characters"),
  }),
});

export const updateCategorySchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(200, "Title must be less than 200 characters")
      .optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: objectIdSchema,
  }),
});

export const reorderCategoriesSchema = z.object({
  body: z.object({
    orderedIds: z
      .array(objectIdSchema)
      .min(1, "orderedIds must contain at least one id"),
  }),
});

export const createItemSchema = z.object({
  body: z.object({
    categoryId: objectIdSchema,
    companyName: z
      .string()
      .min(1, "Company name is required")
      .max(200, "Company name must be less than 200 characters"),
    discount: z
      .string()
      .min(1, "Discount is required")
      .max(300, "Discount must be less than 300 characters"),
    description: z
      .string()
      .min(1, "Description is required")
      .max(1000, "Description must be less than 1000 characters"),
    link: z
      .string()
      .url("Link must be a valid URL"),
  }),
});

export const updateItemSchema = z.object({
  body: z.object({
    companyName: z
      .string()
      .min(1, "Company name is required")
      .max(200, "Company name must be less than 200 characters")
      .optional(),
    discount: z
      .string()
      .min(1, "Discount is required")
      .max(300, "Discount must be less than 300 characters")
      .optional(),
    description: z
      .string()
      .min(1, "Description is required")
      .max(1000, "Description must be less than 1000 characters")
      .optional(),
    link: z.string().url("Link must be a valid URL").optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: objectIdSchema,
  }),
});

export const reorderItemsSchema = z.object({
  body: z.object({
    categoryId: objectIdSchema,
    orderedIds: z
      .array(objectIdSchema)
      .min(1, "orderedIds must contain at least one id"),
  }),
});

export const idParamSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});
