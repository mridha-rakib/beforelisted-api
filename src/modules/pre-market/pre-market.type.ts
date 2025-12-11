// file: src/modules/pre-market/pre-market.type.ts

import type { PREMARKET_CONFIG } from "@/config/pre-market.config";
import { PaginatedResponse } from "@/ts/pagination.types";
import { Types } from "mongoose";
import { IPreMarketRequest } from "./pre-market.model";

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

export interface AdminReferrerInfo {
  referrerId: string;
  referrerName: string;
  referrerType: "AGENT" | "ADMIN"; // or "NORMAL" for none
}

export interface AdminRenterInfo {
  renterId: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  registrationType: "normal" | "agent_referral" | "admin_referral";
  referralInfo?: AdminReferrerInfo;
}

export type AdminPreMarketRenterInfo = {
  renterId: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  registrationType: "normal" | "agent_referral" | "admin_referral";
  referrerName?: string;
  referrerType?: "AGENT" | "ADMIN" | "NORMAL";
};

export type AdminAgentRequestSummary = {
  total: number;
  approved: number;
  pending: number;
};

export type AdminPreMarketRequestItem = IPreMarketRequest & {
  renterInfo: AdminPreMarketRenterInfo;
  agentRequestSummary: AdminAgentRequestSummary;
  agentRequests: AgentRequestDetail[];
};

export type AdminPreMarketPaginatedResponse =
  PaginatedResponse<AdminPreMarketRequestItem>;

export interface AgentRequestDetail {
  _id: string | Types.ObjectId;
  agentId: string;
  agent: {
    agentId: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
    role: string;
    profileImageUrl?: string;
  };
  status: "pending" | "approved" | "rejected" | "paid";
  requestedAt: Date;
  payment?: {
    amount: number;
    currency: string;
    status: string;
  };
}
