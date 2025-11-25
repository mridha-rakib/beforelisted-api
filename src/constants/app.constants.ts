// file: src/constants/app.constants.ts
import { env } from "@/env";

export const APP = {
  NAME: process.env.APP_NAME || "Renter-Agent Connection Platform",
  VERSION: "1.0.0",
} as const;

export const ROLES = {
  ADMIN: "admin",
  AGENT: "agent",
  RENTER: "renter",
} as const;

export const ACCOUNT_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  INACTIVE: "inactive",
} as const;

export const VERIFICATION_STATUS = {
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected",
} as const;

export const REQUEST_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
  ARCHIVED: "archived",
} as const;

export const PAYMENT_STATUS = {
  PENDING: "pending",
  AWAITING_PAYMENT: "awaiting_payment",
  COMPLETED: "completed",
  FAILED: "failed",
  REFUNDED: "refunded",
  FREE: "free",
} as const;

export const MATCH_REQUEST_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
} as const;

export const ADMIN_DECISION = {
  PENDING: "pending",
  APPROVED_FREE: "approved_free",
  APPROVED_PAID: "approved_paid",
  REJECTED: "rejected",
} as const;

export const PERIOD_TYPE = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  YEARLY: "yearly",
} as const;

export const PRICING_OPTION = {
  FREE: "free",
  CHARGED: "charged",
} as const;

export const REFERRAL_CODE = {
  PREFIX_AGENT: "AGT",
  PREFIX_ADMIN: "ADMIN",
  LENGTH: 8,
  EXPIRY_DAYS: 30,
} as const;

export const JWT = {
  ACCESS_EXPIRY: env.JWT_EXPIRY || "7d",
  REFRESH_EXPIRY: env.JWT_REFRESH_EXPIRY || "30d",
} as const;

export const EMAIL = {
  FROM: env.SMTP_FROM_EMAIL,
  FROM_NAME: env.SMTP_FROM_NAME || "Renter-Agent Platform",
  WELCOME: "welcome",
  PASSWORD_RESET_OTP: "password-reset-otp",
  AGENT_REFERRAL: "agent-referral",
  ADMIN_REFERRAL: "admin-referral",
} as const;

export const OTP = {
  LENGTH: 4,
  EXPIRY_MINUTES: 10,
  MAX_ATTEMPTS: 3,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

export const AUTH = {
  // Token expiry
  ACCESS_TOKEN_EXPIRY: "7d",
  REFRESH_TOKEN_EXPIRY: "30d",
  EMAIL_VERIFICATION_EXPIRY_HOURS: 24,

  // Password reset
  OTP_LENGTH: 4,
  OTP_EXPIRY_MINUTES: 10,
  OTP_MAX_ATTEMPTS: 3,

  // Rate limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_MINUTES: 15,
  PASSWORD_RESET_COOLDOWN_SECONDS: 60,

  // Password requirements
  MIN_PASSWORD_LENGTH: 8,
  AUTO_GENERATED_PASSWORD_LENGTH: 12,
  // Email verification OTP expiry in minutes
  EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES: 10,
} as const;

export const MESSAGES = {
  AUTH: {
    REGISTER_SUCCESS:
      "Registration successful. Please check your email to verify your account.",
    LOGIN_SUCCESS: "Login successful.",
    UNAUTHORIZED_ACCESS: "You do not have permission to perform this action.",
    EMAIL_VERIFICATION_SENT:
      "Verification email sent. Please check your inbox.",
    EMAIL_VERIFIED_SUCCESS: "Email verified successfully. You can now login.",
    PASSWORD_RESET_OTP_SENT:
      "OTP sent to your email. It will expire in 10 minutes.",
    PASSWORD_RESET_SUCCESS: "Password reset successfully.",
    INVALID_CREDENTIALS: "Invalid email or password.",
    EMAIL_ALREADY_EXISTS: "Email already registered.",
    EMAIL_NOT_VERIFIED: "Please verify your email before login.",
    ACCOUNT_SUSPENDED: "Your account has been suspended.",
    ACCOUNT_INACTIVE: "Your account is inactive.",
    INVALID_OTP: "Invalid OTP code.",
    OTP_EXPIRED: "OTP has expired. Please request a new one.",
    OTP_MAX_ATTEMPTS:
      "Maximum OTP attempts exceeded. Please request a new one.",
    LOGOUT_SUCCESS: "Logged out successfully.",
    REFRESH_TOKEN_INVALID: "Invalid or expired refresh token.",
    VERIFICATION_CODE_SENT: "Verification code sent to your email.",
    EMAIL_ALREADY_VERIFIED: "Email is already verified.",
  },
  USER: {
    USER_NOT_FOUND: "User not found.",
    USER_CREATED: "User created successfully.",
    USER_UPDATED: "User updated successfully.",
    USER_DELETED: "User deleted successfully.",
  },
  VALIDATION: {
    INVALID_EMAIL: "Invalid email format.",
    PASSWORD_TOO_SHORT: "Password must be at least 8 characters.",
    PASSWORD_WEAK:
      "Password must contain uppercase, lowercase, numbers, and special characters.",
    REQUIRED_FIELD: "This field is required.",
  },
} as const;

export const ERRORS = {
  INTERNAL_SERVER_ERROR: "Internal server error.",
  NOT_FOUND: "Resource not found.",
  UNAUTHORIZED: "Unauthorized access.",
  FORBIDDEN: "Forbidden access.",
  BAD_REQUEST: "Bad request.",
  CONFLICT: "Resource already exists.",
} as const;
