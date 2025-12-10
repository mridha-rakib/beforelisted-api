// file: src/modules/admin/types/admin-pre-market.type.ts

import type { PaginatedResponse } from "@/ts/pagination.types";

// ============================================
// RENTER INFORMATION
// ============================================

export interface AdminRenterInfo {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  registrationType: "normal" | "agent_referral" | "admin_referral";
  emailVerified: boolean;
  accountStatus: "active" | "suspended" | "pending";
  createdAt: Date;
}

// ============================================
// REFERRAL INFORMATION
// ============================================

export interface AdminReferralInfo {
  referrerId?: string;
  referrerName?: string;
  referrerType?: "Admin" | "Agent";
  referralType: string; // "Direct Registration" | "Agent Referral" | "Admin Passwordless"
  referred: boolean;
}

// ============================================
// PAYMENT INFORMATION (FROM GRANT ACCESS)
// ============================================

export interface AdminPaymentInfo {
  amount: number;
  currency: string;
  paymentStatus: "pending" | "succeeded" | "failed";
  paymentDate?: Date;
  paymentDeadline?: Date;
  chargeAmount?: number;
  isFree?: boolean;
}

// ============================================
// AGENT REQUEST STATISTICS
// ============================================

export interface AdminAgentRequestStats {
  total: number; // Total agents who requested
  approved: number; // Approved access
  pending: number; // Awaiting decision
  rejected: number; // Rejected requests
}

// ============================================
// REQUEST DETAILS
// ============================================

export interface AdminRequestDetails {
  description?: string;
  locations: Array<{
    borough: string;
    neighborhoods: string[];
  }>;
  priceRange: {
    min: number;
    max: number;
  };
  bedrooms: string[];
  bathrooms: string[];
  movingDateRange: {
    earliest: Date;
    latest: Date;
  };
  unitFeatures?: {
    laundryInUnit: boolean;
    privateOutdoorSpace: boolean;
    dishwasher: boolean;
  };
  buildingFeatures?: {
    doorman: boolean;
    elevator: boolean;
    laundryInBuilding: boolean;
  };
  petPolicy?: {
    catsAllowed: boolean;
    dogsAllowed: boolean;
  };
  guarantorRequired?: {
    personalGuarantor: boolean;
    thirdPartyGuarantor: boolean;
  };
}

// ============================================
// COMPLETE PRE-MARKET DETAILS FOR ADMIN
// ============================================

export interface AdminPreMarketDetail {
  // Request basics
  _id: string;
  requestId: string;
  status: "active" | "archived" | "deleted";
  createdAt: Date;
  updatedAt: Date;

  // Renter section
  renter: AdminRenterInfo;

  // Referral section
  referral: AdminReferralInfo;

  // Pre-market request details section
  requestDetails: AdminRequestDetails;

  // Payment section
  payment: AdminPaymentInfo;

  // Agent requests section
  agentRequests: AdminAgentRequestStats;
}

// ============================================
// PAGINATED RESPONSE
// ============================================

export interface AdminPreMarketListResponse
  extends PaginatedResponse<AdminPreMarketDetail> {
  summary?: {
    totalRequests: number;
    activeRequests: number;
    archivedRequests: number;
    totalAgentsRequesting: number;
  };
}

// ============================================
// FILTER QUERY PARAMS
// ============================================

export interface AdminPreMarketFilterQuery {
  page?: number;
  limit?: number;
  sort?: string;
  // Filters
  borough?: string;
  neighborhood?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: string; // "Studio,1BR,2BR"
  bathrooms?: string; // "1,2,3"
  status?: "active" | "archived" | "deleted";
  registrationType?: "normal" | "agent_referral" | "admin_referral";
  emailVerified?: boolean;
  renterName?: string;
  dateFrom?: string;
  dateTo?: string;
}
