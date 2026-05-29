// file: src/modules/email-verification/email-verification.types.ts

/**
 * Designed to work with ANY user type:
 * - Agent
 * - Renter
 * - Admin
 * - Future user types (extensible)
 */

import type { Document, Types } from "mongoose";

/**
 * User type enum - extensible for any user role
 */
export enum UserType {
  AGENT = "agent",
  RENTER = "renter",
  ADMIN = "admin",
}

/**
 * Email verification OTP record in database
 * Generic: works for all user types
 */
export type IEmailVerificationOTP = {
  _id: Types.ObjectId;
  userId: string;
  email: string;
  userType: UserType | string; // ✅ KEY: Track which user type this is for
  code: string; // 4-digit OTP
  expiresAt: Date;
  verified: boolean;
  verifiedAt?: Date;
  attempts: number;
  lastAttemptAt?: Date;
  maxAttempts: number;
  createdAt?: Date;
  updatedAt?: Date;
} & Document;

/**
 * OTP creation request - generic for all user types
 */
export type ICreateOTPRequest = {
  userId: string;
  email: string;
  userType: UserType | string;
  userName: string; // For email template
};

/**
 * OTP creation response - same for all user types
 */
export type ICreateOTPResponse = {
  otp: string;
  expiresAt: Date;
  expiresInMinutes: number;
  code: string; // Alias for otp (backward compatible)
};

/**
 * OTP verification request
 */
export type IVerifyOTPRequest = {
  email: string;
  code: string;
};

/**
 * OTP verification response
 */
export type IVerifyOTPResponse = {
  userId: string;
  email: string;
  userType: UserType | string;
  verified: true;
};

/**
 * OTP resend request
 */
export type IResendOTPRequest = {
  email: string;
  userType?: UserType | string;
  userName?: string;
};

/**
 * OTP resend response
 */
export type IResendOTPResponse = {
  message: string;
  expiresAt: Date;
  expiresInMinutes: number;
};

/**
 * Resend eligibility status
 */
export type IResendEligibility = {
  canResend: boolean;
  reason?: string;
  nextResendTime?: Date;
  attemptsRemaining?: number;
};

/**
 * Verification status for user
 */
export type IVerificationStatus = {
  isVerified: boolean;
  pendingVerification: boolean;
  userType?: UserType | string;
  expiresAt?: Date;
  expiresInMinutes?: number;
  attempts?: number;
};

/**
 * Statistics for user OTPs
 */
export type IOTPStatistics = {
  totalOTPs: number;
  activeOTPs: number;
  verifiedOTPs: number;
  failedAttempts: number;
  averageAttemptsPerOTP: number;
};

/**
 * Email verification event (for logging/analytics)
 */
export type IEmailVerificationEvent = {
  userId: string;
  email: string;
  userType: UserType;
  eventType:
    | "CREATED"
    | "VERIFIED"
    | "RESENT"
    | "EXPIRED"
    | "MAX_ATTEMPTS_EXCEEDED";
  timestamp: Date;
  metadata?: Record<string, any>;
};
