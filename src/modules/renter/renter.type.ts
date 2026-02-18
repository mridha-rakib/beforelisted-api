// file: src/modules/renter/renter.type.ts

import { Types } from "mongoose";
import { z } from "zod";
import { renterDetailSchema, renterListSchema } from "./renter.schema";

// ============================================
// REGISTRATION PAYLOADS
// ============================================

export type RenterQuestionnairePayload = {
  lookingToPurchase?: boolean;
  purchaseTimeline?: string;
  buyerSpecialistNeeded?: boolean;
  renterSpecialistNeeded?: boolean;
};

export type RenterQuestionnaireRecord = RenterQuestionnairePayload & {
  _id: false;
};

/**
 * Agent Referral Renter Registration Payload
 */
export type AgentReferralRenterRegisterPayload = {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  questionnaire?: RenterQuestionnairePayload;
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
  questionnaire?: RenterQuestionnairePayload;
};

/**
 * Union type for all registration payloads
 */
export type RenterRegisterPayload =
  | AgentReferralRenterRegisterPayload
  | AdminReferralRenterRegisterPayload;

/**
 * Renter Response (for API)
 */
export type RenterResponse = {
  _id: string;
  userId: Types.ObjectId | string;
  registrationType: "normal" | "agent_referral" | "admin_referral";
  referredByAgentId?: string;
  referredByAdminId?: string;
  emailSubscriptionEnabled: boolean;
  profileImageUrl?: string;
  questionnaire?: RenterQuestionnairePayload;
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
  registrationType: "agent_referral" | "admin_referral";
  temporaryPassword?: string; // For admin referral only
  mustChangePassword?: boolean; // For admin referral only
  emailSent?: boolean;
  emailError?: string | null;
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
  fullName?: string;
  phoneNumber?: string;
  emailSubscriptionEnabled?: boolean;
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
  registrationType: "agent_referral" | "admin_referral";
  temporaryPassword?: string; // For admin referral
  mustChangePassword?: boolean; // For admin referral
};

export type RenterListRequest = z.infer<typeof renterListSchema>;
export type RenterDetailRequest = z.infer<typeof renterDetailSchema>;
