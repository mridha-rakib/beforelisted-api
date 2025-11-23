// file: src/modules/email-verification/email-verification.interface.ts

import type { Document } from "mongoose";

/**
 * Email Verification OTP Document
 */
export interface IEmailVerificationOTP extends Document {
  userId: string;
  email: string;
  otp: string; // 4-digit code
  attempts: number; // Track failed attempts
  maxAttempts: number; // Maximum allowed attempts
  isUsed: boolean; // Mark as used after verification
  expiresAt: Date; // Expiration timestamp
  createdAt: Date;
  updatedAt: Date;
}
