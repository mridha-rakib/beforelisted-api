// file: src/modules/email-verification/email-verification.interface.ts

import type { Document } from "mongoose";

/**
 * Email Verification OTP Document
 */
export type IEmailVerificationOTP = {
  userId: string;
  email: string;
  code: string;
  expiresAt: Date;
  verified: boolean;
  verifiedAt?: Date;
  attempts: number;
  lastAttemptAt?: Date;
  maxAttempts: number;
  isUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
} & Document;

/**
 * Email Verification Service Response Types
 */
export type ICreateOTPResponse = {
  otp: string;
  expiresAt: Date;
  expiresInMinutes: number;
};

export type IVerifyOTPResponse = {
  userId: string;
  email: string;
  verified: true;
};

export type IResendOTPResponse = {
  message: string;
  expiresAt: Date;
  expiresInMinutes: number;
};

export type IOTPResendStatus = {
  canResend: boolean;
  reason?: string;
  nextResendTime?: Date;
  attemptsRemaining?: number;
};
