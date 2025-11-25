// file: src/modules/email-verification/email-verification.interface.ts

import type { Document } from "mongoose";

/**
 * Email Verification OTP Document
 */
export interface IEmailVerificationOTP extends Document {
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
}
