// File: src/modules/renter/renter.interface.ts
/**
 * Renter Interfaces
 * Type definitions for renter authentication, registration, and password operations
 * ✅ Full TypeScript support
 * ✅ Aligned with User & Agent patterns
 */

import type { Types } from "mongoose";

// ============================================
// REGISTRATION INTERFACES
// ============================================

/**
 * Normal Renter Registration Payload
 */
export interface INormalRenterRegistration {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}

/**
 * Agent Referral Renter Registration Payload
 */
export interface IAgentReferralRenterRegistration
  extends INormalRenterRegistration {
  referralCode: string; // AGT-xxxxxxxx
}

/**
 * Admin Referral Renter Registration Payload (Passwordless)
 */
export interface IAdminReferralRenterRegistration {
  email: string;
  fullName: string;
  phoneNumber?: string;
  adminReferralCode: string; // ADM-xxxxxxxx
  questionnaire: {
    lookingToPurchase: boolean;
    purchaseTimeline?: string;
    buyerSpecialistNeeded: boolean;
    renterSpecialistNeeded: boolean;
  };
}

/**
 * Renter Registration Response
 */
export interface IRenterRegistrationResponse {
  success: boolean;
  message: string;
  data?: {
    userId: string;
    renterId: string;
    email: string;
    fullName: string;
    registrationType: "normal" | "agent_referral" | "admin_referral";
    emailVerified: boolean;
    accountStatus: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken?: string;
  };
  error?: string;
  timestamp: Date;
}

// ============================================
// EMAIL VERIFICATION INTERFACES
// ============================================

/**
 * Send Verification Code Request
 */
export interface ISendVerificationCodeRequest {
  email: string;
  userId: string;
}

/**
 * Verify Email Code Request
 */
export interface IVerifyEmailCodeRequest {
  email: string;
  verificationCode: string;
}

/**
 * Verify Email Response
 */
export interface IVerifyEmailResponse {
  success: boolean;
  message: string;
  data?: {
    email: string;
    emailVerified: boolean;
  };
  error?: string;
  timestamp: Date;
}

/**
 * Resend Verification Code Request
 */
export interface IResendVerificationCodeRequest {
  email: string;
  userId: string;
}

// ============================================
// PASSWORD MANAGEMENT INTERFACES
// ============================================

/**
 * Request Password Reset (Forgot Password)
 */
export interface IForgotPasswordRequest {
  email: string;
}

/**
 * Verify Forgot Password Code
 */
export interface IVerifyForgotPasswordCodeRequest {
  email: string;
  resetCode: string;
}

/**
 * Reset Password with Code
 */
export interface IResetPasswordRequest {
  email: string;
  resetCode: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Update Password (Authenticated)
 */
export interface IUpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Password Update Response
 */
export interface IPasswordUpdateResponse {
  success: boolean;
  message: string;
  data?: {
    email: string;
    passwordChanged: true;
  };
  error?: string;
  timestamp: Date;
}

// ============================================
// LOGIN INTERFACES
// ============================================

/**
 * Renter Login Request
 */
export interface IRenterLoginRequest {
  email: string;
  password: string;
}

/**
 * Renter Login Response
 */
export interface IRenterLoginResponse {
  success: boolean;
  message: string;
  data?: {
    userId: string;
    email: string;
    fullName: string;
    emailVerified: boolean;
    accountStatus: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken?: string;
  };
  error?: string;
  timestamp: Date;
}

// ============================================
// PROFILE INTERFACES
// ============================================

/**
 * Get Renter Profile
 */
export interface IRenterProfile {
  userId: Types.ObjectId | string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  registrationType: "normal" | "agent_referral" | "admin_referral";
  referredByAgentId?: Types.ObjectId | string;
  referredByAdminId?: Types.ObjectId | string;
  emailVerified: boolean;
  accountStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Update Renter Profile
 */
export interface IUpdateRenterProfileRequest {
  phoneNumber?: string;
  occupation?: string;
  moveInDate?: Date;
}

// ============================================
// ERROR RESPONSES
// ============================================

/**
 * Authentication Error Response
 */
export interface IAuthErrorResponse {
  success: false;
  error: string;
  errorCode?: string;
  timestamp: Date;
}

// ============================================
// INTERNAL OPERATION INTERFACES
// ============================================

/**
 * Renter Creation Data (Internal)
 */
export interface IRenterCreationData {
  userId: Types.ObjectId | string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  registrationType: "normal" | "agent_referral" | "admin_referral";
  referredByAgentId?: Types.ObjectId | string;
  referredByAdminId?: Types.ObjectId | string;
  emailVerified: boolean;
  accountStatus: "pending" | "active" | "suspended";
}

/**
 * Password Reset Token Data (Internal)
 */
export interface IPasswordResetTokenData {
  userId: string;
  email: string;
  resetCode: string;
  expiresAt: Date;
  used: boolean;
}

/**
 * Generated Password Response (Internal)
 */
export interface IGeneratedPasswordResponse {
  password: string;
  expiresInHours: number;
  mustChangeOnLogin: boolean;
}
