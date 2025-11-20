// file: src/modules/renter/renter.schema.ts

import { z } from "zod";

/**
 * Renter registration validation (POST /renter/register)
 * Handles all 3 registration flows:
 * 1. Normal registration (with password)
 * 2. Admin referral (without password - auto-generated)
 * 3. Agent referral (with password)
 */
export const renterRegisterSchema = z.object({
  body: z
    .object({
      // User fields
      email: z.string().email("Invalid email address"),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .optional(),
      fullName: z.string().min(2).max(100),
      phoneNumber: z.string().optional(),

      // Referral field
      referralCode: z.string().optional(),
    })
    .superRefine((data, ctx) => {
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
            message: "Password is required when registering via agent referral",
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
    }),
});

/**
 * Create renter profile validation (INTERNAL)
 */
export const createRenterProfileSchema = z.object({
  body: z
    .object({
      referrerName: z.string().optional(),
      referrerEmail: z.string().email().optional(),
      acknowledgedAutoPassword: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Update notification preferences validation
 */
export const updateNotificationPreferencesSchema = z.object({
  body: z.object({
    savedRequestsAlerts: z.boolean().optional(),
    emailNotificationsSubscribed: z.boolean().optional(),
    matchNotifications: z.boolean().optional(),
    weeklyReportDigest: z.boolean().optional(),
  }),
});

/**
 * Get renter profile validation
 */
export const getRenterProfileSchema = z.object({
  params: z.object({
    userId: z.string().min(1).optional(),
  }),
});

/**
 * Acknowledge auto password validation
 */
export const acknowledgeAutoPasswordSchema = z.object({
  body: z.object({
    acknowledged: z.boolean(),
  }),
});
