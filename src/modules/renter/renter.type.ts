// File: src/modules/renter/renter.type.ts
/**
 * Renter Registration & Profile Types
 * ✅ Type-safe payloads for all 3 registration flows
 * ✅ Reusable response types
 */

// ============================================
// REGISTRATION PAYLOADS
// ============================================

/**
 * Normal Registration Payload
 * Standard renter registration with password
 */
export type RenterRegisterPayload = {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  referralCode?: string; // AGT-xxx or ADM-xxx (optional)
};

/**
 * Passwordless Registration Payload (Admin Referral)
 * For ADM-xxxx referral links
 */
export type PasswordlessRenterRegisterPayload = {
  email: string;
  fullName: string;
  phoneNumber?: string;
  adminReferralCode: string; // ADM-xxxx (required)
  questionnaire?: {
    lookingToPurchase?: boolean;
    purchaseTimeline?: string;
    buyerSpecialistNeeded?: boolean;
    renterSpecialistNeeded?: boolean;
  };
};

/**
 * Renter Email Verification Payload
 */
export type RenterVerifyEmailPayload = {
  email: string;
  otp: string;
};

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Renter Profile Response
 * Public safe fields only
 */
export type RenterProfileResponse = {
  _id: string;
  userId: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  registrationType: "normal" | "agent_referral" | "admin_referral";
  referredByAgentId?: string;
  referredByAdminId?: string;
  occupation?: string;
  moveInDate?: Date;
  petFriendly?: boolean;
  emailVerified: boolean;
  accountStatus: "active" | "suspended" | "pending";
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Renter Registration Response
 * User + Profile + Tokens
 */
export type RenterRegistrationResponse = {
  user: {
    _id: string;
    email: string;
    fullName: string;
    role: string;
  };
  profile: RenterProfileResponse;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  };
  otpExpiration?: Date; // For verification flow
};

/**
 * Passwordless Registration Response
 * User + Tokens (auto-authenticated)
 */
export type PasswordlessRegistrationResponse = {
  user: {
    _id: string;
    email: string;
    fullName: string;
    role: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  };
  message: string;
};

// ============================================
// INTERNAL TYPES
// ============================================

/**
 * Create Renter Profile Payload (Internal - after user created)
 */
export type CreateRenterProfilePayload = {
  userId: string;
  registrationType: "normal" | "agent_referral" | "admin_referral";
  referredByAgentId?: string;
  referredByAdminId?: string;
  occupation?: string;
  moveInDate?: Date;
  petFriendly?: boolean;
  questionnaire?: {
    lookingToPurchase?: boolean;
    purchaseTimeline?: string;
    buyerSpecialistNeeded?: boolean;
    renterSpecialistNeeded?: boolean;
  };
};

/**
 * Update Renter Profile Payload
 */
export type UpdateRenterProfilePayload = {
  occupation?: string;
  moveInDate?: Date;
  petFriendly?: boolean;
};
