// file: src/constants/index.ts
export const REFERRAL_CODE_PREFIX = {
  AGENT: "AGT",
  ADMIN: "ADMIN",
} as const;

export const USER_ROLES = {
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
