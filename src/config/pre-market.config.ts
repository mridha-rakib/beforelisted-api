// file: src/config/pre-market.config.ts

import { z } from "zod";

// PRE-MARKET CONFIG
export const PREMARKET_CONFIG = {
  // Request ID generation
  REQUEST_ID_PREFIX: "BeforeListed-PM",

  // Locations
  // LOCATIONS: [] as const,

  // Bedroom options
  BEDROOMS: ["Studio", "1BR", "2BR", "3BR", "4BR+"] as const,

  // Bathroom options
  BATHROOMS: ["1", "2", "3", "4+"] as const,

  // Request statuses
  REQUEST_STATUSES: ["active", "archived", "deleted"] as const,

  // Validation
  PRICE_MIN: 0,
  PRICE_MAX: 100000,
  DESCRIPTION_MAX_LENGTH: 500,

  // Date validation
  MIN_MOVING_DAYS_AHEAD: 0,
  MAX_MOVING_DAYS_AHEAD: 365,

  // Pagination
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ============================================
// GRANT ACCESS CONFIGURATION
// ============================================

export const GRANT_ACCESS_CONFIG = {
  // Statuses
  STATUSES: ["pending", "approved", "free", "rejected", "paid"] as const,

  // Payment statuses
  PAYMENT_STATUSES: ["pending", "succeeded", "failed"] as const,

  // Default charge amount
  DEFAULT_CHARGE_AMOUNT: 0,

  // Max payment attempts
  MAX_PAYMENT_ATTEMPTS: 3,

  // Currency
  CURRENCY: "USD" as const,

  // Webhook timeout
  WEBHOOK_TIMEOUT_MS: 5000,
} as const;

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const priceRangeSchema = z.object({
  min: z.number().min(PREMARKET_CONFIG.PRICE_MIN),
  max: z.number().max(PREMARKET_CONFIG.PRICE_MAX),
});

export const movingDateRangeSchema = z.object({
  earliest: z.coerce.date(),
  latest: z.coerce.date(),
});

// export const locationSchema = z.enum(PREMARKET_CONFIG.LOCATIONS);
export const bedroomSchema = z.enum(PREMARKET_CONFIG.BEDROOMS);
export const bathroomSchema = z.enum(PREMARKET_CONFIG.BATHROOMS);
