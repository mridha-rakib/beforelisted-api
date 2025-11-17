// file: src/modules/user/user.model.ts

import { ACCOUNT_STATUS, ROLES } from "@/constants/app.constants";
import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Query } from "mongoose";
import type { IUser } from "./user.interface";

/**
 * User Schema - Base user for all roles
 * Using BaseSchemaUtil for DRY schema creation
 */
const userSchema = BaseSchemaUtil.createSchema<IUser>({
  ...BaseSchemaUtil.mergeDefinitions(
    BaseSchemaUtil.emailField(true),
    BaseSchemaUtil.passwordField(),
    BaseSchemaUtil.phoneField(),
    {
      fullName: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },
      role: {
        type: String,
        enum: Object.values(ROLES),
        required: true,
        index: true,
      },
      accountStatus: {
        type: String,
        enum: Object.values(ACCOUNT_STATUS),
        default: ACCOUNT_STATUS.PENDING,
        index: true,
      },
      emailVerified: {
        type: Boolean,
        default: false,
        index: true,
      },
      emailVerificationToken: {
        type: String,
        select: false,
      },
      emailVerificationExpiresAt: {
        type: Date,
        select: false,
      },
      lastLoginAt: {
        type: Date,
        index: true,
      },
      isDeleted: {
        type: Boolean,
        default: false,
        index: true,
      },
      deletedAt: {
        type: Date,
        index: true,
      },
      deletedBy: {
        type: String,
      },
    }
  ),
});

// Composite indexes for efficient queries
userSchema.index({ email: 1, isDeleted: 1 });
userSchema.index({ role: 1, accountStatus: 1, isDeleted: 1 });
userSchema.index({ createdAt: -1, isDeleted: 1 });

// Exclude soft-deleted users by default
userSchema.pre(/^find/, function (this: Query<any, IUser>) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
});

export const User = model<IUser>("User", userSchema);
