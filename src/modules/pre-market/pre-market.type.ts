// file: src/modules/pre-market/pre-market.type.ts

import type { PREMARKET_CONFIG } from "@/config/pre-market.config";

// ============================================
// PRE-MARKET REQUEST TYPES
// ============================================

export type PreMarketLocation = (typeof PREMARKET_CONFIG.LOCATIONS)[number];
export type PreMarketBedroom = (typeof PREMARKET_CONFIG.BEDROOMS)[number];
export type PreMarketBathroom = (typeof PREMARKET_CONFIG.BATHROOMS)[number];
export type PreMarketStatus =
  (typeof PREMARKET_CONFIG.REQUEST_STATUSES)[number];

export type CreatePreMarketRequestPayload = {
  movingDateRange: {
    earliest: Date;
    latest: Date;
  };
  priceRange: {
    min: number;
    max: number;
  };
  locations: PreMarketLocation[];
  bedrooms: PreMarketBedroom[];
  bathrooms: PreMarketBathroom[];
  description?: string;
  unitFeatures?: {
    laundryInUnit?: boolean;
    privateOutdoorSpace?: boolean;
    dishwasher?: boolean;
  };
  buildingFeatures?: {
    doorman?: boolean;
    elevator?: boolean;
    laundryInBuilding?: boolean;
  };
  petPolicy?: {
    catsAllowed?: boolean;
    dogsAllowed?: boolean;
  };
  guarantorRequired?: {
    personalGuarantor?: boolean;
    thirdPartyGuarantor?: boolean;
  };
};

export type UpdatePreMarketRequestPayload =
  Partial<CreatePreMarketRequestPayload>;

// ============================================
// GRANT ACCESS TYPES
// ============================================

export type GrantAccessStatus = "pending" | "approved" | "rejected" | "paid";
export type PaymentStatus = "pending" | "succeeded" | "failed";

export type RequestAccessPayload = {
  preMarketRequestId: string;
};

export type AdminDecisionPayload = {
  action: "approve" | "charge" | "reject";
  adminId: string;
  isFree?: boolean;
  chargeAmount?: number;
  notes?: string;
};
