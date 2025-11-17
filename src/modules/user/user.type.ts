// file: src/modules/user/user.type.ts;
import type { IAgentProfile, IUser } from "./user.interface";

/**
 * User update payload (what users can update)
 */
export type UpdateUserPayload = {
  fullName?: string;
  phoneNumber?: string;
};

/**
 * Email change payload (requires verification)
 */
export type ChangeEmailPayload = {
  newEmail: string;
  verificationCode?: string;
};

/**
 * Password change payload
 */
export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

/**
 * Admin user update (admin can update more fields)
 */
export type AdminUpdateUserPayload = {
  fullName?: string;
  phoneNumber?: string;
  email?: string;
  accountStatus?: "active" | "suspended" | "inactive";
  role?: "admin" | "agent" | "renter";
};

/**
 *User creation payload
 */
export type UserCreatePayload = {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  role: string;
};

/**
 *User response (without password)
 */
export type UserResponse = Omit<
  IUser,
  | "password"
  | "emailVerificationExpiresAt"
  | "emailVerificationToken"
  | "isDeleted"
  | "deletedAt"
  | "deletedBy"
> & {
  _id: string;
};

/**

Agent Profile creation payload
*/
export type AgentProfilePayload = {
  licenseNumber: string;
  brokerageName: string;
  specializations?: string[];
  bio?: string;
};

/**
 * User with stats
 */
export type UserWithStats = UserResponse & {
  stats?: {
    agentStats?: {
      totalRequests: number;
      grantAccessStatus: string;
      verificationStatus: string;
      isSuspended: boolean;
    };
    renterStats?: {
      activeRequests: number;
      totalSavedRequests: number;
      totalRequests: number;
    };
  };
};

/**
 *Renter Profile creation payload
 */
export type RenterProfilePayload = {
  preferredLocations?: string[];
  budgetMin?: number;
  budgetMax?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  petPreferences?: string;
  moveInFlexibilityWeeks?: number;
};

/**

Agent Profile response
*/
export type AgentProfileResponse = Omit<IAgentProfile, "__v"> & {
  _id: string;
};
