// file: src/modules/renter/renter.type.ts

import { Types } from "mongoose";

// ============================================
// REGISTRATION PAYLOADS
// ============================================

/**
 * Normal Renter Registration Payload
 */
export type NormalRenterRegisterPayload = {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
};

/**
 * Agent Referral Renter Registration Payload
 */
export type AgentReferralRenterRegisterPayload = NormalRenterRegisterPayload & {
  referralCode: string; // AGT-xxxxx
};

/**
 * Admin Referral Renter Registration Payload (Passwordless)
 */
export type AdminReferralRenterRegisterPayload = {
  email: string;
  fullName: string;
  phoneNumber?: string;
  referralCode: string; // ADM-xxxxx
  questionnaire?: {
    lookingToPurchase?: boolean;
    purchaseTimeline?: string;
    buyerSpecialistNeeded?: boolean;
    renterSpecialistNeeded?: boolean;
  };
};

/**
 * Union type for all registration payloads
 */
export type RenterRegisterPayload =
  | NormalRenterRegisterPayload
  | AgentReferralRenterRegisterPayload
  | AdminReferralRenterRegisterPayload;

/**
 * Renter Response (for API)
 */
export type RenterResponse = {
  _id: string;
  userId: Types.ObjectId | string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  registrationType: "normal" | "agent_referral" | "admin_referral";
  referredByAgentId?: string;
  referredByAdminId?: string;
  emailVerified: boolean;
  accountStatus: "active" | "suspended" | "pending";
  occupation?: string;
  moveInDate?: Date;
  petFriendly: boolean;
  questionnaire?: {
    lookingToPurchase?: boolean;
    purchaseTimeline?: string;
    buyerSpecialistNeeded?: boolean;
    renterSpecialistNeeded?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Registration Response
 */
export type RenterRegistrationResponse = {
  user: {
    _id: string;
    email: string;
    fullName: string;
    role: string;
  };
  renter: RenterResponse;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  };
  registrationType: "normal" | "agent_referral" | "admin_referral";
  temporaryPassword?: string; // For admin referral only
  mustChangePassword?: boolean; // For admin referral only
};

/**
 * Admin Referral Response with temporary password
 */
export type AdminReferralRegistrationResponse = RenterRegistrationResponse & {
  temporaryPassword: string;
  mustChangePassword: true;
  loginInstructions: string;
};

/**
 * Email Verification Request
 */
export type VerifyEmailPayload = {
  email: string;
  code: string; // 4-digit OTP
};

/**
 * Password Reset Request
 */
export type RequestPasswordResetPayload = {
  email: string;
};

/**
 * OTP Verification Request
 */
export type VerifyOTPPayload = {
  email: string;
  otp: string; // 4-digit OTP
};

/**
 * Password Reset Payload
 */
export type ResetPasswordPayload = {
  email: string;
  otp: string; // 4-digit OTP
  newPassword: string;
};

/**
 * Update Renter Profile Payload
 */
export type UpdateRenterProfilePayload = {
  phoneNumber?: string;
  occupation?: string;
  moveInDate?: Date;
  petFriendly?: boolean;
};

/**
 * Referral Service Result
 */
export type ReferralParseResult = {
  type: "normal" | "agent_referral" | "admin_referral";
  code: string;
  prefix?: "AGT" | "ADM";
  isValid: boolean;
};

/**
 * Service Response Types
 */
export type RenterServiceResponse = {
  user: any;
  renter: RenterResponse;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  };
};

/**
 * Controller Response Types
 */
export type RenterControllerResponse = {
  user: any;
  renter: RenterResponse;
  accessToken: string; // Only in JSON response
  expiresIn: string;
  registrationType: "normal" | "agent_referral" | "admin_referral";
  temporaryPassword?: string; // For admin referral
  mustChangePassword?: boolean; // For admin referral
};
