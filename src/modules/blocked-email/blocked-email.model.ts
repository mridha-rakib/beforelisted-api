import mongoose, { Document, Schema, Types } from "mongoose";
import {
  BLOCKED_EMAIL_REASONS,
  type BlockedEmailReason,
  type BlockedEmailStatus,
} from "./blocked-email.type";

export interface IBlockedEmail extends Document {
  _id: Types.ObjectId;
  email: string;
  reason: BlockedEmailReason;
  status: BlockedEmailStatus;
  blockedAt: Date;
  blockedBy: Types.ObjectId;
  removedAt?: Date | null;
  removedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const blockedEmailSchema = new Schema<IBlockedEmail>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    reason: {
      type: String,
      enum: BLOCKED_EMAIL_REASONS,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "removed"],
      default: "active",
      index: true,
    },
    blockedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    blockedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    removedAt: {
      type: Date,
      default: null,
    },
    removedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "blocked_emails",
  },
);

export const BlockedEmail =
  mongoose.models.BlockedEmail ||
  mongoose.model<IBlockedEmail>("BlockedEmail", blockedEmailSchema);
