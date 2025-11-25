// file: src/modules/email-verification/email-verification.types.ts
// ✅ COMPLETELY REUSABLE TYPE SYSTEM - Works for ANY user type

/**
 * ============================================
 * GENERIC EMAIL VERIFICATION TYPE SYSTEM
 * ============================================
 *
 * Designed to work with ANY user type:
 * - Agent
 * - Renter
 * - Admin
 * - Future user types (extensible)
 */

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
export interface IEmailVerificationOTP {
  _id?: string;
  userId: string;
  email: string;
  userType: UserType; // ✅ KEY: Track which user type this is for
  code: string; // 4-digit OTP
  expiresAt: Date;
  verified: boolean;
  verifiedAt?: Date;
  attempts: number;
  lastAttemptAt?: Date;
  maxAttempts: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * OTP creation request - generic for all user types
 */
export interface ICreateOTPRequest {
  userId: string;
  email: string;
  userType: UserType;
  userName: string; // For email template
}

/**
 * OTP creation response - same for all user types
 */
export interface ICreateOTPResponse {
  otp: string;
  expiresAt: Date;
  expiresInMinutes: number;
  code: string; // Alias for otp (backward compatible)
}

/**
 * OTP verification request
 */
export interface IVerifyOTPRequest {
  email: string;
  code: string;
}

/**
 * OTP verification response
 */
export interface IVerifyOTPResponse {
  userId: string;
  email: string;
  userType: UserType;
  verified: true;
}

/**
 * OTP resend request
 */
export interface IResendOTPRequest {
  email: string;
  userType: UserType;
}

/**
 * OTP resend response
 */
export interface IResendOTPResponse {
  message: string;
  expiresAt: Date;
  expiresInMinutes: number;
}

/**
 * Resend eligibility status
 */
export interface IResendEligibility {
  canResend: boolean;
  reason?: string;
  nextResendTime?: Date;
  attemptsRemaining?: number;
}

/**
 * Verification status for user
 */
export interface IVerificationStatus {
  isVerified: boolean;
  pendingVerification: boolean;
  userType?: UserType;
  expiresAt?: Date;
  expiresInMinutes?: number;
  attempts?: number;
}

/**
 * Statistics for user OTPs
 */
export interface IOTPStatistics {
  totalOTPs: number;
  activeOTPs: number;
  verifiedOTPs: number;
  failedAttempts: number;
  averageAttemptsPerOTP: number;
}

/**
 * Email verification event (for logging/analytics)
 */
export interface IEmailVerificationEvent {
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
}
