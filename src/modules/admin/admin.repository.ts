// file: src/modules/admin/repositories/admin-pre-market.repository.ts

import { logger } from "@/middlewares/pino-logger";
import { GrantAccessRepository } from "@/modules/grant-access/grant-access.repository";
import { PreMarketRepository } from "@/modules/pre-market/pre-market.repository";
import { RenterRepository } from "@/modules/renter/renter.repository";
import { UserRepository } from "@/modules/user/user.repository";
import type { PaginatedResponse } from "@/ts/pagination.types";
import type {
  AdminAgentRequestStats,
  AdminPaymentInfo,
  AdminPreMarketDetail,
  AdminPreMarketFilterQuery,
  AdminReferralInfo,
} from "./admin.type";

export class AdminPreMarketRepository {
  private preMarketRepository: PreMarketRepository;
  private renterRepository: RenterRepository;
  private userRepository: UserRepository;
  private grantAccessRepository: GrantAccessRepository;

  constructor() {
    this.preMarketRepository = new PreMarketRepository();
    this.renterRepository = new RenterRepository();
    this.userRepository = new UserRepository();
    this.grantAccessRepository = new GrantAccessRepository();
  }

  /**
   * Get all pre-market requests for admin with complete details
   * Includes renter info, referral info, payment info, and agent request stats
   */
  async getAllPreMarketRequestsForAdmin(
    filters: AdminPreMarketFilterQuery
  ): Promise<PaginatedResponse<AdminPreMarketDetail>> {
    try {
      // Parse pagination params
      const page = Math.max(1, filters.page || 1);
      const limit = Math.min(100, Math.max(1, filters.limit || 10));
      const skip = (page - 1) * limit;

      // Build MongoDB filter query
      const mongoFilter = this.buildFilterQuery(filters);

      logger.debug(
        { mongoFilter, page, limit },
        "Building admin pre-market query"
      );

      // Get paginated results from pre-market repository
      const result = await (this.preMarketRepository.model as any).paginate(
        mongoFilter,
        {
          page,
          limit,
          sort: filters.sort || "-createdAt",
        }
      );

      // Enrich each request with admin details
      const enrichedData = await Promise.all(
        result.docs.map((request: any) =>
          this.enrichRequestWithAdminDetails(request._id.toString())
        )
      );

      logger.info(
        { totalRequests: result.total, enrichedCount: enrichedData.length },
        "Enriched pre-market requests for admin"
      );

      // Format response
      return {
        data: enrichedData,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: result.pages || Math.ceil(result.total / limit),
          hasMore: result.hasNextPage || false,
          hasPrev: result.hasPrevPage || false,
        },
      };
    } catch (error) {
      logger.error(
        { error, filters },
        "Error fetching pre-market requests for admin"
      );
      throw error;
    }
  }

  /**
   * Get single pre-market request with complete admin details
   */
  async getPreMarketRequestDetailForAdmin(
    requestId: string
  ): Promise<AdminPreMarketDetail> {
    try {
      logger.debug({ requestId }, "Fetching admin details for request");
      const detail = await this.enrichRequestWithAdminDetails(requestId);
      logger.info({ requestId }, "Retrieved admin request details");
      return detail;
    } catch (error) {
      logger.error({ error, requestId }, "Error fetching request details");
      throw error;
    }
  }

  /**
   * Enrich request with all admin details
   * @private
   */
  private async enrichRequestWithAdminDetails(
    requestId: string
  ): Promise<AdminPreMarketDetail> {
    // Get pre-market request
    const preMarketRequest = await this.preMarketRepository.findById(requestId);
    if (!preMarketRequest) {
      throw new Error(`Pre-market request ${requestId} not found`);
    }

    // Get renter info
    const renter = await this.renterRepository.findById(
      preMarketRequest.renterId.toString()
    );
    const user = await this.userRepository.findById(
      renter?.userId?.toString() || ""
    );

    // Get referral info
    const referralInfo = await this.getReferralInfo(
      renter?.registrationType || "normal",
      renter?.referredByAgentId,
      renter?.referredByAdminId
    );

    // Get payment info from grant access records
    const paymentInfo = await this.getPaymentInfo(requestId);

    // Get agent request stats
    const agentRequestStats = await this.getAgentRequestStats(requestId);

    return {
      _id: preMarketRequest._id.toString(),
      requestId: preMarketRequest.requestId,
      status: preMarketRequest.status,
      createdAt: preMarketRequest.createdAt,
      updatedAt: preMarketRequest.updatedAt,

      // Renter Info Section
      renter: {
        _id: renter?._id?.toString() || "",
        name: user?.fullName || renter?.fullName || "Unknown",
        email: user?.email || renter?.email || "N/A",
        phone: user?.phoneNumber || renter?.phoneNumber,
        registrationType: renter?.registrationType || "normal",
        emailVerified: user?.emailVerified || false,
        accountStatus: user?.accountStatus || "pending",
        createdAt: user?.createdAt || new Date(),
      },

      // Referral Info Section
      referral: referralInfo,

      // Pre-Market Request Details Section
      requestDetails: {
        description: preMarketRequest.description,
        locations: preMarketRequest.locations || [],
        priceRange: preMarketRequest.priceRange,
        bedrooms: preMarketRequest.bedrooms || [],
        bathrooms: preMarketRequest.bathrooms || [],
        movingDateRange: preMarketRequest.movingDateRange,
        unitFeatures: preMarketRequest.unitFeatures || {},
        buildingFeatures: preMarketRequest.buildingFeatures || {},
        petPolicy: preMarketRequest.petPolicy || {},
        guarantorRequired: preMarketRequest.guarantorRequired || {},
      },

      // Payment Info Section
      payment: paymentInfo,

      // Agent Requests Section
      agentRequests: agentRequestStats,
    };
  }

  /**
   * Get referral information
   * @private
   */
  private async getReferralInfo(
    registrationType: string,
    agentId?: any,
    adminId?: any
  ): Promise<AdminReferralInfo> {
    const baseInfo = {
      referred: registrationType !== "normal",
      referralType: this.getReferralTypeLabel(registrationType),
    };

    if (registrationType === "agent_referral" && agentId) {
      try {
        const agentUser = await this.userRepository.findById(
          agentId.toString()
        );
        return {
          ...baseInfo,
          referrerId: agentId.toString(),
          referrerName: agentUser?.fullName || "Unknown Agent",
          referrerType: "Agent" as const,
        };
      } catch (error) {
        logger.warn({ agentId, error }, "Failed to fetch agent info");
        return baseInfo;
      }
    }

    if (registrationType === "admin_referral" && adminId) {
      try {
        const adminUser = await this.userRepository.findById(
          adminId.toString()
        );
        return {
          ...baseInfo,
          referrerId: adminId.toString(),
          referrerName: adminUser?.fullName || "Administrator",
          referrerType: "Admin" as const,
        };
      } catch (error) {
        logger.warn({ adminId, error }, "Failed to fetch admin info");
        return baseInfo;
      }
    }

    return baseInfo;
  }

  /**
   * Get referral type label
   * @private
   */
  private getReferralTypeLabel(registrationType: string): string {
    const labels: Record<string, string> = {
      normal: "Direct Registration",
      agent_referral: "Agent Referral",
      admin_referral: "Admin Passwordless",
    };
    return labels[registrationType] || "Unknown";
  }

  /**
   * Get payment information from grant access records
   * @private
   */
  private async getPaymentInfo(requestId: string): Promise<AdminPaymentInfo> {
    try {
      const grantAccess =
        await this.grantAccessRepository.findByPreMarketRequestId(requestId);

      if (!grantAccess || grantAccess.length === 0) {
        return {
          amount: 0,
          currency: "USD",
          paymentStatus: "pending" as const,
        };
      }

      // Get the latest/most relevant payment record
      const latestPayment = grantAccess[0];

      return {
        amount: latestPayment.payment?.amount || 0,
        currency: latestPayment.payment?.currency || "USD",
        paymentStatus: latestPayment.payment?.paymentStatus || "pending",
        paymentDate: latestPayment.payment?.succeededAt,
        paymentDeadline: latestPayment.adminDecision?.decidedAt,
        chargeAmount: latestPayment.adminDecision?.chargeAmount,
        isFree: latestPayment.adminDecision?.isFree,
      };
    } catch (error) {
      logger.warn({ requestId, error }, "Failed to fetch payment info");
      return {
        amount: 0,
        currency: "USD",
        paymentStatus: "pending" as const,
      };
    }
  }

  /**
   * Get agent request statistics
   * @private
   */
  private async getAgentRequestStats(
    requestId: string
  ): Promise<AdminAgentRequestStats> {
    try {
      const grantAccessRequests =
        await this.grantAccessRepository.findByPreMarketRequestId(requestId);

      if (!grantAccessRequests || grantAccessRequests.length === 0) {
        return {
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
        };
      }

      return {
        total: grantAccessRequests.length,
        approved: grantAccessRequests.filter(
          (r) => r.status === "approved" || r.status === "paid"
        ).length,
        pending: grantAccessRequests.filter((r) => r.status === "pending")
          .length,
        rejected: grantAccessRequests.filter((r) => r.status === "rejected")
          .length,
      };
    } catch (error) {
      logger.warn({ requestId, error }, "Failed to fetch agent request stats");
      return {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
      };
    }
  }

  /**
   * Build MongoDB filter query from admin filters
   * @private
   */
  private buildFilterQuery(filters: AdminPreMarketFilterQuery): any {
    const query: any = {
      isDeleted: false,
    };

    // Status filter
    if (filters.status) {
      query.status = filters.status;
    }

    // Price range filters
    const priceFilters: any[] = [];
    if (filters.minPrice !== undefined) {
      priceFilters.push({ "priceRange.min": { $gte: filters.minPrice } });
    }
    if (filters.maxPrice !== undefined) {
      priceFilters.push({ "priceRange.max": { $lte: filters.maxPrice } });
    }
    if (priceFilters.length > 0) {
      query.$and = priceFilters;
    }

    // Location filters
    if (filters.borough) {
      query["locations.borough"] = filters.borough;
    }

    if (filters.neighborhood) {
      query["locations.neighborhoods"] = filters.neighborhood;
    }

    // Bedroom filter
    if (filters.bedrooms) {
      const bedroomArray = filters.bedrooms
        .split(",")
        .map((b) => b.trim())
        .filter((b) => b);
      if (bedroomArray.length > 0) {
        query.bedrooms = { $in: bedroomArray };
      }
    }

    // Bathroom filter
    if (filters.bathrooms) {
      const bathroomArray = filters.bathrooms
        .split(",")
        .map((b) => b.trim())
        .filter((b) => b);
      if (bathroomArray.length > 0) {
        query.bathrooms = { $in: bathroomArray };
      }
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        const dateTo = new Date(filters.dateTo);
        dateTo.setHours(23, 59, 59, 999);
        query.createdAt.$lte = dateTo;
      }
    }

    logger.debug({ query }, "Built MongoDB filter query");
    return query;
  }
}
