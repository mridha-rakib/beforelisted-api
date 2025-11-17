import type { ACCOUNT_STATUS, ROLES } from "@/constants/app.constants";
import type { Document, Types } from "mongoose";

/**

Base User Document Interface
*/
export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  role: (typeof ROLES)[keyof typeof ROLES];
  accountStatus: (typeof ACCOUNT_STATUS)[keyof typeof ACCOUNT_STATUS];
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpiresAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
}

/**
 * User Statistics (denormalized)
 */
export interface IUserStats {
  agentStats?: {
    totalRequests: number;
    grantAccessStatus: "pending" | "granted" | "denied";
    verificationStatus: "pending" | "verified" | "rejected";
    isSuspended: boolean;
  };
  renterStats?: {
    activeRequests: number;
    totalSavedRequests: number;
    totalRequests: number;
  };
}

/**
 *Agent Profile Document Interface
 */
export interface IAgentProfile extends Document {
  userId: string;
  licenseNumber: string;
  brokerageName: string;
  verificationStatus: "pending" | "verified" | "rejected";
  verificationDocuments?: string[];
  hasGrantAccess: boolean;
  grantAccessGivenBy?: string;
  grantAccessDate?: Date;
  isSuspended: boolean;
  suspensionReason?: string;
  suspendedAt?: Date;
  suspendedBy?: string;
  specializations?: string[];
  bio?: string;
  profileCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**

Renter Profile Document Interface
*/
export interface IRenterProfile extends Document {
  userId: string;
  preferredLocations?: string[];
  budgetMin?: number;
  budgetMax?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  petPreferences?: string;
  moveInFlexibilityWeeks: number;
  profileCompleted: boolean;
  profileCompletionPercentage: number;
  activeRequestsCount: number;
  totalSavedRequests: number;
  preferencesUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**

Password Reset OTP Document Interface
*/
export interface IPasswordResetOTP extends Document {
  userId: string;
  otp: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  isUsed: boolean;
  usedAt?: Date;
  createdAt: Date;
}
