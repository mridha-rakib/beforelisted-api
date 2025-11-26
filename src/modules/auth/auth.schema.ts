// file: src/modules/auth/auth.schema.ts

import { MESSAGES, ROLES } from "@/constants/app.constants";
import { z } from "zod";

/**
 * Register schema with conditional password validation
 */
export const registerSchema = z.object({
  body: z
    .object({
      email: z.string().email(MESSAGES.VALIDATION.INVALID_EMAIL),
      password: z
        .string()
        .min(8, MESSAGES.VALIDATION.PASSWORD_TOO_SHORT)
        .optional(),
      fullName: z.string().min(2).max(100),
      phoneNumber: z.string().optional(),
      role: z.enum([ROLES.AGENT, ROLES.RENTER]),

      // Agent-specific fields
      licenseNumber: z.string().optional(),
      brokerageName: z.string().optional(),
      brokerageAddress: z.string().optional(),
      licenseExpiryDate: z.string().optional(), // ISO date string

      // Referral field
      referralCode: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      // AGENT VALIDATION
      if (data.role === ROLES.AGENT) {
        // Agents cannot use referral codes
        if (data.referralCode) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Agents cannot register using referral links",
            path: ["referralCode"],
          });
        }

        // Password is REQUIRED for agents
        if (!data.password) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Password is required for agent registration",
            path: ["password"],
          });
        }

        // License number is REQUIRED for agents
        if (!data.licenseNumber) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "License number is required for agents",
            path: ["licenseNumber"],
          });
        }

        // Brokerage name is REQUIRED for agents
        if (!data.brokerageName) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Brokerage name is required for agents",
            path: ["brokerageName"],
          });
        }
      }

      // RENTER VALIDATION
      if (data.role === ROLES.RENTER) {
        // Check if using referral code
        if (data.referralCode) {
          // Determine referral type from code prefix
          const isAdminReferral = data.referralCode.startsWith("ADM-");
          const isAgentReferral = data.referralCode.startsWith("AGT-");

          if (!isAdminReferral && !isAgentReferral) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Invalid referral code format",
              path: ["referralCode"],
            });
          }

          // Admin referral: Password is OPTIONAL (will be auto-generated)
          // Agent referral: Password is REQUIRED
          if (isAgentReferral && !data.password) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "Password is required when registering via agent referral",
              path: ["password"],
            });
          }
        } else {
          // Normal renter registration: Password is REQUIRED
          if (!data.password) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Password is required for registration",
              path: ["password"],
            });
          }
        }
      }
    }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(MESSAGES.VALIDATION.INVALID_EMAIL),
    password: z.string().min(1, "Password is required"),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    email: z.email(MESSAGES.VALIDATION.INVALID_EMAIL),
    code: z.string().length(4, "Verification code must be 4 digits"),
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
  body: z.object({}).optional(),
});

export const resendVerificationCodeSchema = z.object({
  body: z.object({
    email: z.email(MESSAGES.VALIDATION.INVALID_EMAIL),
    userType: z.enum(["Agent", "Renter", "Admin"]).optional(),
  }),
});
