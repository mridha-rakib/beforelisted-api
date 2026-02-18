// file: src/config/pre-market.config.ts

import { z } from "zod";

export const PREMARKET_CONFIG = {
  REQUEST_ID_PREFIX: "R",
  BEDROOMS: ["Studio", "1BR", "2BR", "3BR", "4BR+"] as const,
  BATHROOMS: ["1", "2", "3", "4+"] as const,
  REQUEST_STATUSES: ["active", "archived", "deleted"] as const,
  PRICE_MIN: 0,
  PRICE_MAX: 10000000000,
  DESCRIPTION_MAX_LENGTH: 500,
  MIN_MOVING_DAYS_AHEAD: 0,
  MAX_MOVING_DAYS_AHEAD: 365,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const GRANT_ACCESS_CONFIG = {
  STATUSES: ["pending", "approved", "free", "rejected", "paid"] as const,
  PAYMENT_STATUSES: ["pending", "succeeded", "failed", "free"] as const,
  DEFAULT_CHARGE_AMOUNT: 0,
  MAX_PAYMENT_ATTEMPTS: 3,
  CURRENCY: "USD" as const,
  WEBHOOK_TIMEOUT_MS: 5000,
} as const;

export const priceRangeSchema = z.object({
  min: z.number().min(PREMARKET_CONFIG.PRICE_MIN),
  max: z.number().max(PREMARKET_CONFIG.PRICE_MAX),
});

export const movingDateRangeSchema = z.object({
  earliest: z.coerce.date(),
  latest: z.coerce.date(),
});

export const bedroomSchema = z.enum(PREMARKET_CONFIG.BEDROOMS);
export const bathroomSchema = z.enum(PREMARKET_CONFIG.BATHROOMS);
