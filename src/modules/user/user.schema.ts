// file: src/modules/user/user.schema.ts

import { MESSAGES } from "@/constants/app.constants";
import { z } from "zod";

/**
 * Update user profile validation
 */
export const updateUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100).optional(),
    phoneNumber: z.string().optional(),
  }),
});

/**
 * Change email validation
 */
export const changeEmailSchema = z.object({
  body: z.object({
    newEmail: z.string().email(MESSAGES.VALIDATION.INVALID_EMAIL),
  }),
});

/**
 * Verify new email validation
 */
export const verifyNewEmailSchema = z.object({
  body: z.object({
    newEmail: z.string().email(MESSAGES.VALIDATION.INVALID_EMAIL),
    verificationCode: z.string().min(1, "Verification code is required"),
  }),
});

/**
 * Change password validation
 */
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, MESSAGES.VALIDATION.PASSWORD_TOO_SHORT),
  }),
});

/**
 * Admin update user validation
 */
export const adminUpdateUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100).optional(),
    phoneNumber: z.string().optional(),
    email: z.string().email(MESSAGES.VALIDATION.INVALID_EMAIL).optional(),
    accountStatus: z.enum(["active", "suspended", "inactive"]).optional(),
    role: z.enum(["admin", "agent", "renter"]).optional(),
  }),
});

/**
 * List users query validation
 */
export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().positive().default(1).optional(),
    limit: z.coerce.number().positive().max(100).default(10).optional(),
    sort: z.string().default("-createdAt").optional(),
    search: z.string().optional(),
    role: z.enum(["admin", "agent", "renter"]).optional(),
    accountStatus: z
      .enum(["active", "suspended", "inactive", "pending"])
      .optional(),
  }),
});

/**
 * Delete user validation
 */
export const deleteUserSchema = z.object({
  params: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),
});
