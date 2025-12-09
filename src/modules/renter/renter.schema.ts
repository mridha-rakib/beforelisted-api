// file: src/modules/renter/renter.schema.ts

import { MESSAGES } from "@/constants/app.constants";
import { logger } from "@/middlewares/pino-logger";
import { z } from "zod";

// ============================================
// REGISTRATION SCHEMAS
// ============================================

/**
 * Normal Renter Registration Schema
 */
export const normalRenterRegisterSchema = z.object({
  body: z.object({
    email: z.email(MESSAGES.VALIDATION.INVALID_EMAIL),
    password: z.string().min(8, MESSAGES.VALIDATION.PASSWORD_TOO_SHORT),
    fullName: z.string().min(2).max(100),
    phoneNumber: z.string().optional(),
  }),
});

/**
 * Agent Referral Renter Registration Schema
 */
export const agentReferralRenterRegisterSchema = z.object({
  body: z
    .object({
      email: z.email(MESSAGES.VALIDATION.INVALID_EMAIL),
      password: z.string().min(8, MESSAGES.VALIDATION.PASSWORD_TOO_SHORT),
      fullName: z.string().min(2).max(100),
      phoneNumber: z.string().optional(),
      referralCode: z
        .string()
        .regex(
          /^AGT-[A-Z0-9]{16}$/,
          "Invalid agent referral code format (must start with AGT-)"
        ),
    })
    .superRefine((data, ctx) => {
      if (!data.referralCode.startsWith("AGT-")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid referral code type for agent referral",
          path: ["referralCode"],
        });
      }
    }),
});

/**
 * Admin Referral Renter Registration Schema (Passwordless)
 */
export const adminReferralRenterRegisterSchema = z.object({
  body: z
    .object({
      email: z.email(MESSAGES.VALIDATION.INVALID_EMAIL),
      fullName: z.string().min(2).max(100),
      phoneNumber: z.string().optional(),
      referralCode: z
        .string()
        .regex(
          /^ADM-[A-Z0-9]{16}$/,
          "Invalid admin referral code format (must start with ADM-)"
        ),
      questionnaire: z
        .object({
          lookingToPurchase: z.boolean().optional(),
          purchaseTimeline: z.string().optional(),
          buyerSpecialistNeeded: z.boolean().optional(),
          renterSpecialistNeeded: z.boolean().optional(),
        })
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (!data.referralCode.startsWith("ADM-")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid referral code type for admin referral",
          path: ["referralCode"],
        });
      }
    }),
});

/**
 * Generic Renter Registration Schema (Detects registration type)
 */
export const renterRegisterSchema = z.object({
  body: z
    .object({
      email: z.email(MESSAGES.VALIDATION.INVALID_EMAIL),
      password: z
        .string()
        .min(8, MESSAGES.VALIDATION.PASSWORD_TOO_SHORT)
        .optional(),
      fullName: z.string().min(2).max(100),
      phoneNumber: z.string().optional(),
      referralCode: z.string().optional(),
      questionnaire: z
        .object({
          lookingToPurchase: z.boolean().optional(),
          purchaseTimeline: z.string().optional(),
          buyerSpecialistNeeded: z.boolean().optional(),
          renterSpecialistNeeded: z.boolean().optional(),
        })
        .optional(),
    })
    .superRefine((data, ctx) => {
      const ReferralParser =
        require("@/utils/referral-parser.utils").ReferralParser;

      if (data.referralCode) {
        const validation = ReferralParser.validate(data.referralCode);

        logger.warn(validation, "Validation debuging.");
        if (!validation.isValid) {
          ctx.addIssue({
            code: "custom",
            message: validation.error || "Invalid referral code format",
            path: ["referralCode"],
          });
          return;
        }

        if (validation.type === "agent_referral") {
          // Agent referral: password REQUIRED
          if (!data.password) {
            ctx.addIssue({
              code: "custom",
              message: "Password is required for agent referral registration",
              path: ["password"],
            });
          }
        } else if (validation.type === "admin_referral") {
          // Admin referral: password NOT allowed (will be auto-generated)
          if (data.password) {
            ctx.addIssue({
              code: "custom", // ✅ FIX 2
              message:
                "Password should not be provided for admin referral registration",
              path: ["password"],
            });
          }
        }
      } else {
        // Normal registration - password is required
        if (!data.password) {
          ctx.addIssue({
            code: "custom",
            message: "Password is required for normal registration",
            path: ["password"],
          });
        }
      }
    }),
});

// ============================================
// EMAIL VERIFICATION SCHEMAS
// ============================================

/**
 * Verify Email Schema
 */
export const verifyEmailSchema = z.object({
  body: z.object({
    email: z.string().email(MESSAGES.VALIDATION.INVALID_EMAIL),
    code: z.string().length(4, "Verification code must be 4 digits"),
  }),
});

/**
 * Resend Verification Code Schema
 */
export const resendVerificationCodeSchema = z.object({
  body: z.object({
    email: z.string().email(MESSAGES.VALIDATION.INVALID_EMAIL),
  }),
});

// ============================================
// PASSWORD SCHEMAS
// ============================================

/**
 * Request Password Reset Schema
 */
export const requestPasswordResetSchema = z.object({
  body: z.object({
    email: z.string().email(MESSAGES.VALIDATION.INVALID_EMAIL),
  }),
});

/**
 * Verify OTP Schema (for password reset)
 */
export const verifyOTPSchema = z.object({
  body: z.object({
    email: z.string().email(MESSAGES.VALIDATION.INVALID_EMAIL),
    otp: z.string().length(4, "OTP must be 4 digits"),
  }),
});

/**
 * Reset Password Schema
 */
export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(MESSAGES.VALIDATION.INVALID_EMAIL),
    otp: z.string().length(4, "OTP must be 4 digits"),
    newPassword: z.string().min(8, MESSAGES.VALIDATION.PASSWORD_TOO_SHORT),
  }),
});

/**
 * Update Renter Profile Schema
 */
export const updateRenterProfileSchema = z.object({
  body: z.object({
    phoneNumber: z.string().optional(),
    occupation: z.string().optional(),
    moveInDate: z.date().optional(),
  }),
});

/**
 * Get Renter Profile Schema
 */
export const getRenterProfileSchema = z.object({
  params: z.object({
    userId: z.string().min(1),
  }),
});
