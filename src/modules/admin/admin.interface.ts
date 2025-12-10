// // file: src/modules/admin/admin.interface.ts

// // ============================================
// // DASHBOARD STATISTICS
// // ============================================

// export interface IDashboardStats {
//   totalRequests: number;
//   activeRequests: number;
//   archivedRequests: number;
//   totalAgentsRequestedAccess: number;
//   totalAgentsGrantedAccess: number;
//   pendingGrantAccessRequests: number;
//   approvedGrantAccessRequests: number;
//   rejectedGrantAccessRequests: number;
//   totalPaymentAmount: number;
//   successfulPayments: number;
//   failedPayments: number;
//   pendingPayments: number;
// }

// export interface IDashboardOverview extends IDashboardStats {
//   recentRequests: Array<{
//     id: string;
//     requestId: string;
//     renterName: string;
//     location: string;
//     priceRange: { min: number; max: number };
//     createdAt: Date;
//     status: "active" | "archived" | "deleted";
//   }>;
//   topLocations: Array<{
//     location: string;
//     count: number;
//   }>;
//   priceRangeDistribution: Array<{
//     range: string;
//     count: number;
//   }>;
// }

// // ============================================
// // PRE-MARKET REQUEST DETAILS
// // ============================================

// export interface IRenterInfo {
//   renterId: string;
//   renterName: string;
//   renterEmail: string;
//   renterPhone: string | null;
//   registrationType: string;
//   emailVerified: boolean;
//   referrer?: {
//     referrerId: string;
//     referrerName: string;
//     referrerRole: "Agent" | "Admin";
//     referralType: "agent_referral" | "admin_referral";
//   };
// }

// export interface IPreMarketRequestDetail {
//   _id: string;
//   requestId: string;
//   renterInfo: IRenterInfo;
//   requestName: string;
//   description?: string;
//   movingDateRange: {
//     earliest: Date;
//     latest: Date;
//   };
//   priceRange: {
//     min: number;
//     max: number;
//   };
//   locations: Array<{
//     borough: string;
//     neighborhoods: string[];
//   }>;
//   bedrooms: string[];
//   bathrooms: string[];
//   unitFeatures: {
//     laundryInUnit: boolean;
//     privateOutdoorSpace: boolean;
//     dishwasher: boolean;
//   };
//   buildingFeatures: {
//     doorman: boolean;
//     elevator: boolean;
//     laundryInBuilding: boolean;
//   };
//   petPolicy: {
//     catsAllowed: boolean;
//     dogsAllowed: boolean;
//   };
//   guarantorRequired: {
//     personalGuarantor: boolean;
//     thirdPartyGuarantor: boolean;
//   };
//   status: "active" | "archived" | "deleted";
//   viewedBy: {
//     grantAccessAgents: string[];
//     normalAgents: string[];
//   };
//   grantAccessRequests: IGrantAccessSummary[];
//   paymentSummary: IPaymentSummary;
//   createdAt: Date;
//   updatedAt: Date;
// }

// // ============================================
// // GRANT ACCESS SUMMARY (for list view)
// // ============================================

// export interface IGrantAccessSummary {
//   _id: string;
//   agentId: string;
//   agentName: string;
//   agentEmail: string;
//   agentCompany?: string;
//   status: "pending" | "approved" | "rejected";
//   approvalType?: "free" | "paid";
//   chargeAmount?: number;
//   adminDecision?: {
//     decidedBy: string;
//     decidedAt: Date;
//     notes?: string;
//     isFree: boolean;
//   };
//   payment?: {
//     amount: number;
//     currency: string;
//     paymentStatus: "pending" | "succeeded" | "failed";
//     succeededAt?: Date;
//     failureCount: number;
//   };
//   requestedAt: Date;
// }

// // ============================================
// // PAYMENT SUMMARY
// // ============================================

// export interface IPaymentSummary {
//   totalAmount: number;
//   totalReceived: number;
//   totalPending: number;
//   totalFailed: number;
//   currency: string;
//   paymentRecords: Array<{
//     grantAccessId: string;
//     amount: number;
//     status: "pending" | "succeeded" | "failed";
//     succeededAt?: Date;
//     failureCount: number;
//   }>;
// }

// // ============================================
// // QUERY FILTERS
// // ============================================

// export interface IAdminQueryFilters {
//   status?: "active" | "archived" | "deleted";
//   locations?: string[];
//   minPrice?: number;
//   maxPrice?: number;
//   fromDate?: Date;
//   toDate?: Date;
//   grantAccessStatus?: "pending" | "approved" | "rejected";
//   paymentStatus?: "pending" | "succeeded" | "failed";
// }
