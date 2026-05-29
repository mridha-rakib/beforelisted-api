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
 * Agent Referral Renter Registration Payload
 */
export type IAgentReferralRenterRegistration = {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  referralCode: string; // AGT-xxxxxxxx
};

/**
 * Admin Referral Renter Registration Payload (Passwordless)
 */
export type IAdminReferralRenterRegistration = {
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
};

/**
 * Renter Registration Response
 */
export type IRenterRegistrationResponse = {
  success: boolean;
  message: string;
  data?: {
    userId: string;
    renterId: string;
    email: string;
    fullName: string;
    registrationType: "agent_referral" | "admin_referral";
    emailVerified: boolean;
    accountStatus: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken?: string;
  };
  error?: string;
  timestamp: Date;
};

// ============================================
// EMAIL VERIFICATION INTERFACES
// ============================================

/**
 * Send Verification Code Request
 */
export type ISendVerificationCodeRequest = {
  email: string;
  userId: string;
};

/**
 * Verify Email Code Request
 */
export type IVerifyEmailCodeRequest = {
  email: string;
  verificationCode: string;
};

/**
 * Verify Email Response
 */
export type IVerifyEmailResponse = {
  success: boolean;
  message: string;
  data?: {
    email: string;
    emailVerified: boolean;
  };
  error?: string;
  timestamp: Date;
};

/**
 * Resend Verification Code Request
 */
export type IResendVerificationCodeRequest = {
  email: string;
  userId: string;
};

// ============================================
// PASSWORD MANAGEMENT INTERFACES
// ============================================

/**
 * Request Password Reset (Forgot Password)
 */
export type IForgotPasswordRequest = {
  email: string;
};

/**
 * Verify Forgot Password Code
 */
export type IVerifyForgotPasswordCodeRequest = {
  email: string;
  resetCode: string;
};

/**
 * Reset Password with Code
 */
export type IResetPasswordRequest = {
  email: string;
  resetCode: string;
  newPassword: string;
  // confirmPassword: string;
};

/**
 * Update Password (Authenticated)
 */
export type IUpdatePasswordRequest = {
  currentPassword: string;
  newPassword: string;
  // confirmPassword: string;
};

/**
 * Password Update Response
 */
export type IPasswordUpdateResponse = {
  success: boolean;
  message: string;
  data?: {
    email: string;
    passwordChanged: true;
  };
  error?: string;
  timestamp: Date;
};

// ============================================
// LOGIN INTERFACES
// ============================================

/**
 * Renter Login Request
 */
export type IRenterLoginRequest = {
  email: string;
  password: string;
};

/**
 * Renter Login Response
 */
export type IRenterLoginResponse = {
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
};

// ============================================
// PROFILE INTERFACES
// ============================================

/**
 * Get Renter Profile
 */
export type IRenterProfile = {
  userId: Types.ObjectId | string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  registrationType: "normal" | "agent_referral" | "admin_referral";
  referredByAgentId?: Types.ObjectId | string;
  referredByAdminId?: Types.ObjectId | string;
  emailVerified: boolean;
  accountStatus: string;
  emailSubscriptionEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Update Renter Profile
 */
export type IUpdateRenterProfileRequest = {
  fullName?: string;
  phoneNumber?: string;
  emailSubscriptionEnabled?: boolean;
};

// ============================================
// ERROR RESPONSES
// ============================================

/**
 * Authentication Error Response
 */
export type IAuthErrorResponse = {
  success: false;
  error: string;
  errorCode?: string;
  timestamp: Date;
};

// ============================================
// INTERNAL OPERATION INTERFACES
// ============================================

/**
 * Renter Creation Data (Internal)
 */
export type IRenterCreationData = {
  userId: Types.ObjectId | string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  registrationType: "normal" | "agent_referral" | "admin_referral";
  referredByAgentId?: Types.ObjectId | string;
  referredByAdminId?: Types.ObjectId | string;
  emailVerified: boolean;
  accountStatus: "pending" | "active" | "suspended";
};

/**
 * Password Reset Token Data (Internal)
 */
export type IPasswordResetTokenData = {
  userId: string;
  email: string;
  resetCode: string;
  expiresAt: Date;
  used: boolean;
};

/**
 * Generated Password Response (Internal)
 */
export type IGeneratedPasswordResponse = {
  password: string;
  expiresInHours: number;
  mustChangeOnLogin: boolean;
};
