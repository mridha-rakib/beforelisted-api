// file: src/modules/auth/auth.schema.ts

import { MESSAGES } from "@/constants/app.constants";
import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(MESSAGES.VALIDATION.INVALID_EMAIL),
    password: z.string().min(4, MESSAGES.VALIDATION.PASSWORD_TOO_SHORT),
    fullName: z.string().min(2).max(100),
    phoneNumber: z.string().optional(),
    role: z.enum(["agent", "renter"]),
    licenseNumber: z.string().optional(),
    brokerageName: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.email(MESSAGES.VALIDATION.INVALID_EMAIL),
    password: z.string().min(1, "Password is required"),
  }),
});

export const verifyEmailSchema = z.object({
  query: z.object({
    token: z.string().min(1, "Token is required"),
  }),
});

export const requestPasswordResetSchema = z.object({
  body: z.object({
    email: z.string().email(MESSAGES.VALIDATION.INVALID_EMAIL),
  }),
});

export const verifyOTPSchema = z.object({
  body: z.object({
    email: z.string().email(MESSAGES.VALIDATION.INVALID_EMAIL),
    otp: z.string().length(4, "OTP must be 4 digits"),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(MESSAGES.VALIDATION.INVALID_EMAIL),
    otp: z.string().length(4, "OTP must be 4 digits"),
    newPassword: z.string().min(8, MESSAGES.VALIDATION.PASSWORD_TOO_SHORT),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  }),
});
