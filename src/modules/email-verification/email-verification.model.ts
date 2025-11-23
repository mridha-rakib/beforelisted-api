// file: src/modules/email-verification/email-verification.model.ts

import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model } from "mongoose";
import type { IEmailVerificationOTP } from "./email-verification.interface";

const emailVerificationOTPSchema =
  BaseSchemaUtil.createSchema<IEmailVerificationOTP>({
    userId: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
      length: 4,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  });

// Compound index for efficient queries
emailVerificationOTPSchema.index({ userId: 1, isUsed: 1, expiresAt: 1 });
emailVerificationOTPSchema.index({ email: 1, isUsed: 1, expiresAt: 1 });

// TTL index - MongoDB will auto-delete expired documents after 24 hours
emailVerificationOTPSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 86400 }
);

export const EmailVerificationOTP = model<IEmailVerificationOTP>(
  "EmailVerificationOTP",
  emailVerificationOTPSchema
);
