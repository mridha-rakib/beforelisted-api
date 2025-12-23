// file: src/modules/pre-market/pre-market.service.ts

import { logger } from "@/middlewares/pino-logger";

import { ExcelService } from "@/services/excel.service";
import type { PaginatedResponse, PaginationQuery } from "@/ts/pagination.types";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@/utils/app-error.utils";
import { PaginationHelper } from "@/utils/pagination-helper";
import { Types } from "mongoose";
import { AgentProfileRepository } from "../agent/agent.repository";
import { GrantAccessRepository } from "../grant-access/grant-access.repository";
import { PaymentService } from "../payment/payment.service";
import { RenterRepository } from "../renter/renter.repository";
import { UserRepository } from "../user/user.repository";
import { preMarketNotifier, PreMarketNotifier } from "./pre-market-notifier";
import type { IPreMarketRequest } from "./pre-market.model";
import { PreMarketRepository } from "./pre-market.repository";
import {
  AdminAgentRequestSummary,
  AdminPreMarketPaginatedResponse,
  AdminPreMarketRequestItem,
  AdminRenterInfo,
  AgentRequestDetail,
} from "./pre-market.type";

export class PreMarketService {
  private readonly preMarketRepository: PreMarketRepository;
  private readonly grantAccessRepository: GrantAccessRepository;
  private renterRepository: RenterRepository;
  private agentRepository: AgentProfileRepository;
  private userRepository: UserRepository;
  private readonly excelService: ExcelService;

  private readonly paymentService: PaymentService;
  private readonly notifier: PreMarketNotifier;

  constructor() {
    this.preMarketRepository = new PreMarketRepository();
    this.grantAccessRepository = new GrantAccessRepository();
    this.agentRepository = new AgentProfileRepository();
    this.paymentService = new PaymentService(
      this.grantAccessRepository,
      this.preMarketRepository
    );
    this.notifier = new PreMarketNotifier();
    this.renterRepository = new RenterRepository();
    this.userRepository = new UserRepository();
    this.excelService = new ExcelService();
  }

  async createRequest(
    renterId: string,
    payload: {
      movingDateRange: { earliest: Date; latest: Date };
      priceRange: { min: number; max: number };
      locations: { borough: string; neighborhoods: string[] }[];
      bedrooms?: string[];
      bathrooms: string[];
      unitFeatures?: any;
      buildingFeatures?: any;
      petPolicy?: any;
      guarantorRequired?: any;
      preferences?: string[];
    }
  ): Promise<IPreMarketRequest> {
    const earliest = new Date(payload.movingDateRange.earliest);
    const latest = new Date(payload.movingDateRange.latest);

    if (earliest >= latest) {
      throw new BadRequestException(
        "Invalid date range: earliest must be before latest"
      );
    }

    if (payload.priceRange.min > payload.priceRange.max) {
      throw new BadRequestException(
        "Invalid price range: min must be less than max"
      );
    }

    const activeListingCount =
      await this.preMarketRepository.countActiveByRenterId(renterId);

    if (activeListingCount >= 3) {
      throw new BadRequestException(
        "You can create a maximum of 3 pre-market listings. "
      );
    }

    const requestNumber = activeListingCount + 1;
    const requestId = `BeforeListed-${requestNumber}`;
    const requestName = requestId;

    // Create request
    const request = await this.preMarketRepository.create({
      requestId,
      requestName,
      requestNumber,
      renterId,
      movingDateRange: payload.movingDateRange,
      priceRange: payload.priceRange,
      locations: payload.locations,
      bedrooms: payload.bedrooms || [],
      bathrooms: payload.bathrooms,
      unitFeatures: payload.unitFeatures || {},
      buildingFeatures: payload.buildingFeatures || {},
      petPolicy: payload.petPolicy || {},
      preferences: payload.preferences || [],
      guarantorRequired: payload.guarantorRequired || {},
      isActive: true,
      isDeleted: false,
      status: "active",
      viewedBy: {
        grantAccessAgents: [],
        normalAgents: [],
      },
    });

    // Send notifications
    this.sendNotifications(request, renterId).catch((error) => {
      logger.error(
        { error, requestId: request._id },
        "Failed to send notifications (non-blocking - request already created)"
      );
    });

    this.updateConsolidatedExcel().catch((error) => {
      logger.error({ error }, "Consolidated Excel update failed");
    });

    return request;
  }

  private async sendNotifications(
    request: any,
    renterId: string
  ): Promise<void> {
    const renter = await this.renterRepository.findByUserId(renterId);

    const agentIds = await this.preMarketRepository.getAllActiveAgentIds();

    if (!renter) {
      logger.warn(
        { renterId, requestId: request._id },
        "Renter not found for notification"
      );
      return;
    }

    // const listingUrl = `${env.CLIENT_URL}/listings/${request._id}`;

    const renterData = {
      renterId: renter.userId._id.toString(),
      renterName: renter.fullName,
      renterEmail: renter.email,
      renterPhone: renter.phoneNumber,
    };

    await preMarketNotifier.notifyNewRequest(request, renterData);

    logger.info(
      { requestId: request._id },
      "✅ All notifications sent successfully"
    );
  }

  // ============================================
  // READ REQUESTS
  // ============================================

  async getAllRequests(
    query: PaginationQuery
  ): Promise<PaginatedResponse<IPreMarketRequest>> {
    return this.preMarketRepository.findAllWithPagination(query) as any;
  }

  async getRenterRequests(
    renterId: string,
    query: PaginationQuery
  ): Promise<PaginatedResponse<IPreMarketRequest>> {
    return this.preMarketRepository.findByRenterId(renterId, query);
  }

  async getRequestById(requestId: string): Promise<IPreMarketRequest> {
    const request = await this.preMarketRepository.findById(requestId);

    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    return request.toObject ? request.toObject() : request;
  }

  async getRequestByRequestId(requestId: string): Promise<IPreMarketRequest> {
    const request = await this.preMarketRepository.findByRequestId(requestId);

    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    return request;
  }

  // ============================================
  // UPDATE REQUEST (RENTER ONLY)
  // ============================================

  async updateRequest(
    renterId: string,
    requestId: string,
    payload: any
  ): Promise<IPreMarketRequest> {
    const request = await this.getRequestById(requestId);

    // Verify ownership
    if (request.renterId.toString() !== renterId) {
      throw new BadRequestException("Cannot update others' requests");
    }

    // Validate moving date if updating
    if (payload.movingDateRange) {
      const earliest = new Date(payload.movingDateRange.earliest);
      const latest = new Date(payload.movingDateRange.latest);

      if (earliest >= latest) {
        throw new BadRequestException("Invalid date range");
      }
    }

    // Validate price range if updating
    if (payload.priceRange) {
      if (payload.priceRange.min > payload.priceRange.max) {
        throw new BadRequestException("Invalid price range");
      }
    }

    // Update
    const updated = await this.preMarketRepository.updateById(
      requestId,
      payload as Partial<IPreMarketRequest>
    );

    logger.info({ renterId }, `Pre-market request updated: ${requestId}`);

    return updated!;
  }

  // ============================================
  // DELETE REQUEST (RENTER ONLY)
  // ============================================

  async deleteRequest(renterId: string, requestId: string): Promise<void> {
    const request = await this.getRequestById(requestId);

    if (request.renterId.toString() !== renterId) {
      throw new BadRequestException("Cannot delete others' requests");
    }

    await this.preMarketRepository.softDelete(requestId);

    logger.info({ renterId }, `Pre-market request deleted: ${requestId}`);
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getLocationStatistics(): Promise<any> {
    return this.preMarketRepository.getLocationStatistics();
  }

  async getPriceRangeStatistics(): Promise<any> {
    return this.preMarketRepository.getPriceRangeStatistics();
  }

  // ============================================
  // TASK 1: GET ALL REQUESTS FOR AGENT
  // ============================================

  async getAllRequestsForAgent(
    agentId: string,
    query: PaginationQuery
  ): Promise<PaginatedResponse<IPreMarketRequest>> {
    const agent = await this.agentRepository.findByUserId(agentId);
    if (!agent) {
      throw new NotFoundException("Agent profile not found");
    }

    // ============================================
    // GRANT ACCESS AGENTS: See ALL listings
    // ============================================
    if (agent.hasGrantAccess) {
      logger.info(
        { agentId, type: "grant-access" },
        "Grant access agent fetching all pre-market listings"
      );

      const paginated =
        await this.preMarketRepository.findAllWithPagination(query);

      const enrichedData = await Promise.all(
        paginated.data.map(async (request) => {
          const renterInfo = await this.getRenterInfoForRequest(
            request.renterId.toString()
          );
          return {
            ...request,
            renterInfo,
            status: "matched",
          };
        })
      );

      // Track agent views
      await Promise.all(
        paginated.data.map((request) =>
          this.preMarketRepository.addAgentToViewedBy(
            request._id!.toString(),
            agentId,
            "grantAccessAgents"
          )
        )
      );

      return {
        data: enrichedData,
        pagination: {
          ...paginated.pagination,
        },
      } as any;
    }

    // ============================================
    // NORMAL AGENTS: See ONLY paid listings
    // ============================================
    logger.info(
      { agentId, type: "normal" },
      "Normal agent fetching their paid pre-market listings"
    );

    // Step 1: Get all GrantAccess records for this agent with status = "paid"
    const paidAccess = await this.grantAccessRepository.findByAgentIdAndStatus(
      agentId,
      "paid"
    );

    if (!Array.isArray(paidAccess) || paidAccess.length === 0) {
      logger.info({ agentId }, "Normal agent has no paid access yet");
      return PaginationHelper.buildResponse(
        [],
        0,
        (query.page as number) || 1,
        (query.limit as number) || 10
      ) as any;
    }

    const preMarketRequestIds = paidAccess.map((access) =>
      access.preMarketRequestId.toString()
    );

    const listings =
      await this.preMarketRepository.findByIds(preMarketRequestIds);

    if (!listings || listings.length === 0) {
      return PaginationHelper.buildResponse(
        [],
        0,
        (query.page as number) || 1,
        (query.limit as number) || 10
      ) as any;
    }

    // Manual pagination - counts ONLY your filtered results
    const page = (query.page as number) || 1;
    const limit = (query.limit as number) || 10;
    const total = listings.length;
    const pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedData = listings.slice(startIndex, startIndex + limit);

    // Enrich with renter info
    const enrichedData = await Promise.all(
      paginatedData.map(async (request: any) => {
        const renterInfo = await this.getRenterInfoForRequest(
          request.renterId?.toString()
        );
        return {
          ...request,
          renterInfo,
          status: "matched",
        };
      })
    );

    // Track views
    await Promise.all(
      paginatedData.map((request: any) =>
        this.preMarketRepository.addAgentToViewedBy(
          request._id!.toString(),
          agentId,
          "normalAgents"
        )
      )
    );

    // Return with CORRECT pagination count
    const response = PaginationHelper.buildResponse(
      enrichedData,
      total,
      page,
      limit
    ) as any;

    return response;
  }

  // ============================================
  // TASK 2: GET SPECIFIC REQUEST FOR AGENT
  // ============================================

  async getRequestForAgent(agentId: string, requestId: string): Promise<any> {
    const agent = await this.agentRepository.findByUserId(agentId);
    if (!agent) {
      throw new ForbiddenException("Agent profile not found");
    }

    const request = await this.getRequestById(requestId);

    const enrichedRequest = await this.enrichRequestWithRenterInfo(
      request,
      agentId,
      agent.hasGrantAccess
    );

    return enrichedRequest;
  }

  // ============================================
  // HELPER: FILTER VISIBILITY
  // ============================================

  private filterRequestVisibility(
    request: any,
    hasGrantAccess: boolean
  ): IPreMarketRequest {
    if (hasGrantAccess) {
      return request;
    }

    const filtered = {
      ...request,
      renterName: undefined,
      renterEmail: undefined,
      renterPhone: undefined,
      renterId: undefined,
    };

    Object.keys(filtered).forEach((key) => {
      if (filtered[key] === undefined) {
        delete filtered[key];
      }
    });

    return filtered;
  }

  /**
   * HELPER: Enrich request with renter and referrer information
   * Fetches renter details and referrer (if applicable)
   */
  private async enrichRequestWithRenterInfo(
    request: any,
    agentId: string,
    hasGrantAccess: boolean
  ): Promise<any> {
    // Get renter details
    const renter = await this.renterRepository.findById(
      request.renterId.toString()
    );

    if (!renter) {
      logger.warn(
        { renterId: request.renterId, requestId: request.requestId },
        "Renter not found for request"
      );
      return request;
    }

    // Get referrer information
    let referrerInfo = null;
    if (renter.referredByAgentId) {
      const referrer = await this.userRepository.findById(
        renter.referredByAgentId.toString()
      );
      if (referrer) {
        referrerInfo = {
          referrerId: referrer._id,
          referrerName: referrer.fullName,
          referrerRole: "Agent",
          referralType: "agent_referral",
        };
      }
    } else if (renter.referredByAdminId) {
      const referrer = await this.userRepository.findById(
        renter.referredByAdminId.toString()
      );
      if (referrer) {
        referrerInfo = {
          referrerId: referrer._id,
          referrerName: referrer.fullName,
          referrerRole: "Admin",
          referralType: "admin_referral",
        };
      }
    }

    const renterInfo: any = {
      renterId: renter._id,
      registrationType: renter.registrationType,
    };

    if (hasGrantAccess) {
      renterInfo.renterName = renter.fullName;
      renterInfo.renterEmail = renter.email;
      renterInfo.renterPhone = renter.phoneNumber || null;
    }

    if (referrerInfo) {
      renterInfo.referrer = referrerInfo;
    }

    return {
      ...request,
      renterInfo,
    };
  }

  async getAllRequestsForAdmin(
    query: PaginationQuery
  ): Promise<AdminPreMarketPaginatedResponse> {
    const paginated = await this.preMarketRepository.findAllForAdmin(query);

    const enrichedData = await Promise.all(
      paginated.data.map((request) => this.enrichRequestForAdmin(request))
    );

    return {
      ...paginated,
      data: enrichedData,
    };
  }

  /**
   * Admin: Get single pre-market request with all details.
   */
  async getRequestByIdForAdmin(
    requestId: string
  ): Promise<AdminPreMarketRequestItem> {
    const request = await this.preMarketRepository.findByIdForAdmin(requestId);

    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    const enriched = await this.enrichRequestForAdmin(request);
    return enriched;
  }

  // ============================================
  // HELPER: ENRICH REQUEST FOR ADMIN VIEW
  // ============================================

  private async enrichRequestForAdmin(
    request: IPreMarketRequest
  ): Promise<AdminPreMarketRequestItem> {
    const renter = await this.renterRepository.findRenterWithReferrer(
      request.renterId.toString()
    );

    const renterInfo = await this.buildRenterInfo(renter);

    const agentRequestSummary = await this.getAgentRequestSummary(
      request._id!.toString()
    );

    const agentRequests = await this.getAgentRequestDetails(
      request._id!.toString()
    );

    return {
      ...(request.toObject ? request.toObject() : request),
      renterInfo,
      agentRequestSummary,
      agentRequests,
    } as AdminPreMarketRequestItem;
  }

  // ============================================
  // HELPER: AGENT REQUEST SUMMARY
  // ============================================

  private async getAgentRequestSummary(
    preMarketRequestId: string | Types.ObjectId
  ): Promise<AdminAgentRequestSummary> {
    const allRequests =
      await this.grantAccessRepository.findByPreMarketRequestId(
        preMarketRequestId
      );

    if (!allRequests || allRequests.length === 0) {
      return { total: 0, approved: 0, pending: 0 };
    }

    let approved = 0;
    let pending = 0;

    for (const req of allRequests) {
      if (req.status === "approved" || req.status === "paid") {
        approved += 1;
      } else if (req.status === "pending") {
        pending += 1;
      }
    }

    return {
      total: allRequests.length,
      approved,
      pending,
    };
  }

  /**
   * Build renterInfo object from Renter document with referrer details.
   * Handles cases where renter or referrer might not exist.
   */
  private async buildRenterInfo(renter: any): Promise<AdminRenterInfo> {
    if (!renter) {
      // Renter soft-deleted or not found
      return {
        renterId: "",
        fullName: "Unknown renter",
        email: "",
        registrationType: "normal",
      };
    }

    const renterInfo: AdminRenterInfo = {
      renterId: renter._id?.toString() || renter.renterId?.toString() || "",
      fullName: renter.fullName || "",
      email: renter.email || "",
      phoneNumber: renter.phoneNumber,
      registrationType: renter.registrationType || "normal",
    };

    if (
      renter.registrationType === "agent_referral" &&
      renter.referredByAgentId
    ) {
      const referrer =
        typeof renter.referredByAgentId === "object"
          ? renter.referredByAgentId
          : await this.userRepository.findById(
              renter.referredByAgentId.toString()
            );

      if (referrer) {
        renterInfo.referralInfo = {
          referrerId: referrer._id?.toString() || "",
          referrerName: referrer.fullName || referrer.name || "Unknown",
          referrerType: "AGENT",
        };
      }
    } else if (
      renter.registrationType === "admin_referral" &&
      renter.referredByAdminId
    ) {
      const referrer =
        typeof renter.referredByAdminId === "object"
          ? renter.referredByAdminId
          : await this.userRepository.findById(
              renter.referredByAdminId.toString()
            );

      if (referrer) {
        renterInfo.referralInfo = {
          referrerId: referrer._id?.toString() || "",
          referrerName: referrer.fullName || referrer.name || "Unknown",
          referrerType: "ADMIN",
        };
      }
    }

    return renterInfo;
  }

  private async getAgentRequestDetails(
    preMarketRequestId: string
  ): Promise<AgentRequestDetail[]> {
    const allRequests =
      await this.grantAccessRepository.findByPreMarketRequestId(
        preMarketRequestId
      );

    if (!allRequests || allRequests.length === 0) {
      return [];
    }

    // Fetch full agent details for each request
    const requestsWithAgents = await Promise.all(
      allRequests.map(async (req: any) => {
        // Get agent user details
        const agent = await this.userRepository.findById(
          req.agentId.toString()
        );

        // const agentProfile = await this.agentRepository.findByUserId(
        //   req.agentId.toString()
        // );

        // Build agent object with proper types
        const agentInfo = agent
          ? {
              agentId: agent._id?.toString() || "",
              fullName: agent.fullName || "",
              email: agent.email || "",
              phoneNumber: agent.phoneNumber || undefined,
              role: (agent.role as string) || "Agent",
              profileImageUrl: (agent.profileImageUrl || undefined) as
                | string
                | undefined,
            }
          : {
              agentId: req.agentId?.toString() || "",
              fullName: "Unknown Agent",
              email: "",
              phoneNumber: undefined,
              role: "Agent",
              profileImageUrl: undefined,
            };

        const agentRequestDetail: AgentRequestDetail = {
          _id: req._id?.toString() || "",
          agentId: req.agentId?.toString() || "",
          agent: agentInfo,
          status:
            (req.status as "pending" | "approved" | "rejected" | "paid") ||
            "pending",
          requestedAt: req.createdAt || new Date(),
          payment: req.payment
            ? {
                amount: req.payment.amount || 0,
                currency: req.payment.currency || "USD",
                status: req.payment.status || "pending",
              }
            : undefined,
        };

        return agentRequestDetail;
      })
    );

    return requestsWithAgents;
  }

  /**
   * Only shows "Match" status requests with full renter information
   */
  async getRequestsForGrantAccessAgents(
    agentId: string,
    query: PaginationQuery
  ): Promise<PaginatedResponse<any>> {
    const agent = await this.agentRepository.findByUserId(agentId);
    if (!agent || !agent.hasGrantAccess) {
      throw new ForbiddenException(
        "You do not have grant access to view these requests"
      );
    }

    // Get requests for this agent
    const paginated = await this.preMarketRepository.findForGrantAccessAgents(
      agentId,
      query
    );

    // Enrich each request with full renter information
    const enrichedData = await Promise.all(
      paginated.data.map(async (request) => {
        return this.enrichRequestWithFullRenterInfo(request, agentId);
      })
    );

    // Mark agent as having viewed these requests
    const requestIds = paginated.data.map((r) => r._id?.toString());
    await Promise.all(
      requestIds.map((requestId) =>
        this.preMarketRepository.addAgentToViewedBy(
          requestId!,
          agentId,
          "grantAccessAgents"
        )
      )
    );

    return {
      ...paginated,
      data: enrichedData,
    };
  }

  /**
   * Only for grant access agents (full visibility)
   */
  public async enrichRequestWithFullRenterInfo(
    request: IPreMarketRequest,
    agentId: string
  ) {
    const renter = await this.renterRepository.findRenterWithReferrer(
      request.renterId.toString()
    );

    if (!renter) {
      logger.warn(
        { renterId: request.renterId, requestId: request.requestId },
        "Renter not found for request"
      );
      return { ...request, renterInfo: null };
    }

    // Get referrer information if applicable
    let referrerInfo = null;

    if (renter.referredByAgentId) {
      const referrer = await this.userRepository.findById(
        renter.referredByAgentId.toString()
      );
      if (referrer) {
        referrerInfo = {
          referrerId: referrer._id?.toString(),
          referrerName: referrer.fullName,
          referrerRole: "Agent",
          referralType: "agent_referral",
        };
      }
    } else if (renter.referredByAdminId) {
      const referrer = await this.userRepository.findById(
        renter.referredByAdminId._id
      );
      if (referrer) {
        referrerInfo = {
          referrerId: referrer._id?.toString(),
          referrerName: referrer.fullName,
          referrerRole: "Admin",
          referralType: "admin_referral",
        };
      }
    }

    // Build full renter info
    const renterInfo = {
      renterId: renter._id?.toString(),
      renterName: renter.fullName,
      renterEmail: renter.email,
      renterPhone: renter.phoneNumber,
      registrationType: renter.registrationType,
      referrer: referrerInfo,
    };

    // Return enriched request
    return {
      ...request,
      renterInfo,
    };
  }

  /**
   * Now returns listings WITH or WITHOUT renter info based on access
   */
  async getAvailableRequestsForNormalAgents(
    agentId: string,
    query: PaginationQuery
  ): Promise<PaginatedResponse<IPreMarketRequest>> {
    const agent = await this.agentRepository.findByUserId(agentId);
    if (!agent) {
      throw new ForbiddenException("Agent profile not found");
    }

    // Get all Available status requests
    const paginated =
      await this.preMarketRepository.findAvailableForNormalAgents(
        agentId,
        query
      );

    // For each request, conditionally include renter info
    const enrichedData = await Promise.all(
      paginated.data.map(async (request) => {
        const accessCheck = await this.canAgentSeeRenterInfo(
          agentId,
          request._id!.toString()
        );

        if (accessCheck.canSee) {
          const enriched = await this.enrichRequestWithFullRenterInfo(
            request,
            agentId
          );
          return {
            ...enriched,
            renterInfo: enriched.renterInfo,
            accessType: accessCheck.accessType,
            canRequestAccess: false,
          };
        } else {
          return {
            ...request,
            renterInfo: null,
            accessType: "none",
            canRequestAccess: true,
            requestAccessMessage:
              "Request grant access to see renter information",
          };
        }
      })
    );

    // Mark as viewed
    const requestIds = paginated.data.map((r) => r._id?.toString());
    await Promise.all(
      requestIds.map((requestId) =>
        this.preMarketRepository.addAgentToViewedBy(
          requestId!,
          agentId,
          "normalAgents"
        )
      )
    );

    return {
      ...paginated,
      data: enrichedData,
    };
  }

  async getRequestDetailsForAgent(
    agentId: string,
    requestId: string
  ): Promise<any> {
    const request = await this.preMarketRepository.getRequestById(requestId);
    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    // Get agent
    const agent = await this.agentRepository.findByUserId(agentId);
    if (!agent) {
      throw new ForbiddenException("Agent profile not found");
    }

    // GRANT ACCESS AGENTS - Full info
    if (agent.hasGrantAccess) {
      return this.enrichRequestWithFullRenterInfo(request, agentId);
    }

    // NORMAL AGENTS - Check access status
    const grantAccess = await this.grantAccessRepository.findByAgentAndRequest(
      agentId,
      requestId
    );

    if (!grantAccess) {
      throw new ForbiddenException(
        "You must request access to view renter information"
      );
    }

    if (grantAccess.status === "rejected") {
      throw new ForbiddenException(
        "Your access request was rejected by the admin"
      );
    }

    if (grantAccess.status === "pending") {
      throw new ForbiddenException(
        "Your access request is pending admin approval"
      );
    }

    // Access approved or paid - show full info
    if (grantAccess.status === "approved" || grantAccess.status === "paid") {
      return this.enrichRequestWithFullRenterInfo(request, agentId);
    }

    throw new ForbiddenException("You do not have access to this request");
  }

  public async checkAgentAccessToRequest(
    agentId: string,
    requestId: string
  ): Promise<{
    hasAccess: boolean;
    accessType: "admin-granted" | "payment-based" | "none";
    grantAccessRecord?: any;
  }> {
    // Check if agent has admin-granted access
    const agent = await this.agentRepository.findByUserId(agentId);
    if (agent && agent.hasGrantAccess) {
      return {
        hasAccess: true,
        accessType: "admin-granted",
      };
    }

    // Check if agent paid for this specific request
    const grantAccess = await this.grantAccessRepository.findOne({
      agentId,
      preMarketRequestId: requestId,
      status: { $in: ["approved", "paid"] },
    });

    if (grantAccess) {
      return {
        hasAccess: true,
        accessType: "payment-based",
        grantAccessRecord: grantAccess,
      };
    }

    return {
      hasAccess: false,
      accessType: "none",
    };
  }

  /**
   * Check if agent has access to view RENTER INFO for a request
   * Returns true if:
   * 1. Agent has admin-granted access (hasGrantAccess = true), OR
   * 2. Agent paid for this specific request (status = "approved" or "paid")
   */
  async canAgentSeeRenterInfo(
    agentId: string,
    requestId: string | Types.ObjectId
  ): Promise<{
    canSee: boolean;
    accessType: "admin-granted" | "payment-based" | "none";
  }> {
    // Check 1: Admin-granted access
    const agent = await this.agentRepository.findByUserId(agentId);
    if (agent?.hasGrantAccess) {
      return {
        canSee: true,
        accessType: "admin-granted",
      };
    }

    // Check 2: Payment-based access for THIS specific request
    const grantAccess = await this.grantAccessRepository.findOne({
      agentId,
      preMarketRequestId: requestId,
      status: { $in: ["approved", "paid"] },
    });

    if (grantAccess) {
      return {
        canSee: true,
        accessType: "payment-based",
      };
    }

    return {
      canSee: false,
      accessType: "none",
    };
  }

  /**
   * Mark request as viewed by agent
   * Adds agent to viewedBy array to track engagement
   */
  async markRequestAsViewedByAgent(
    requestId: string,
    agentId: string,
    type: "grantAccessAgents" | "normalAgents"
  ): Promise<void> {
    await this.preMarketRepository.addAgentToViewedBy(requestId, agentId, type);
  }

  /**
   * Get renter's specific pre-market request
   * Only the renter who owns it can view
   */
  async getRenterRequestById(
    renterId: string,
    requestId: string
  ): Promise<IPreMarketRequest> {
    const request = await this.preMarketRepository.findById(requestId);

    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    // Verify ownership
    if (request.renterId.toString() !== renterId) {
      throw new ForbiddenException(
        "You can only view your own pre-market requests"
      );
    }

    logger.info(
      { renterId, requestId: request.requestId },
      "Renter retrieved their request details"
    );

    return request;
  }

  // ============================================
  // ADMIN: DELETE PRE-MARKET REQUEST
  // ============================================

  /**
   * Admin can delete any pre-market request
   * Soft delete - marks as deleted without removing from DB
   * Related grant access records are also marked as deleted
   */
  async adminDeleteRequest(requestId: string): Promise<void> {
    const request = await this.preMarketRepository.findById(requestId);

    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    // Delete the request (soft delete)
    await this.preMarketRepository.deleteById(requestId);

    // Also clean up related grant access records
    // await this.grantAccessRepository.softDeleteByPreMarketRequestId(requestId);

    logger.warn(
      { requestId, renterId: request.renterId },
      "Admin deleted pre-market request"
    );
  }

  // ============================================
  // LISTING ACTIVATION/DEACTIVATION
  // ============================================

  /**
   * Toggle listing activation status (Admin or Renter)
   * @param listingId - Pre-market listing ID
   * @param isActive - New activation status
   * @param userId - User performing action
   * @param userRole - User role (Admin or Renter)
   */
  async toggleListingActivation(
    listingId: string,
    isActive: boolean,
    userId: string,
    userRole: string
  ): Promise<IPreMarketRequest> {
    const listing = await this.getRequestById(listingId);

    // Check authorization
    if (userRole === "Renter") {
      // Renter can only toggle own listings
      if (listing.renterId.toString() !== userId) {
        throw new ForbiddenException("You can only manage your own listings");
      }
    } else if (userRole !== "Admin") {
      // Only Admin or Renter allowed
      throw new ForbiddenException(
        "You don't have permission to manage listings"
      );
    }

    // Update listing
    const updated = await this.preMarketRepository.toggleListingActive(
      listingId,
      isActive
    );

    if (!updated) {
      throw new NotFoundException("Pre-market request not found");
    }

    logger.info(
      { userId, listingId, isActive, userRole },
      `Listing activation toggled: ${isActive ? "activated" : "deactivated"}`
    );

    return updated;
  }

  /**
   * Check if agent can access listing (activation guard)
   * @param listingId - Pre-market listing ID
   */
  async canAgentAccessListing(listingId: string): Promise<{
    canAccess: boolean;
    isActive: boolean;
    reason?: string;
  }> {
    const listing =
      await this.preMarketRepository.findByIdWithActivationStatus(listingId);

    if (!listing) {
      return {
        canAccess: false,
        isActive: false,
        reason: "Listing not found",
      };
    }

    if (!listing.isActive) {
      return {
        canAccess: false,
        isActive: false,
        reason: "This listing is no longer accepting requests",
      };
    }

    return {
      canAccess: true,
      isActive: true,
    };
  }

  /**
   * Get all listings for a renter (admin view)
   * @param renterId - Renter ID
   * @param includeInactive - Include deactivated listings
   */
  async getRenterListings(
    renterId: string,
    includeInactive: boolean = true
  ): Promise<IPreMarketRequest[]> {
    return this.preMarketRepository.findByRenterIdAll(
      renterId,
      includeInactive
    );
  }

  async getRenterRequestsWithAgents(
    renterId: string,
    query: PaginationQuery
  ): Promise<{
    data: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    // Step 1: Get ALL requests for this renter
    const requests = await this.preMarketRepository.findByRenterId(
      renterId,
      query
    );

    if (!requests || requests.data.length === 0) {
      return {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: 10,
          hasNext: false,
          hasPrev: false,
        },
      };
    }

    const requestsWithAgents = await Promise.all(
      requests.data.map(async (request) => {
        try {
          const requestId = request._id!.toString();
          const grantAccessRecords =
            await this.grantAccessRepository.findByPreMarketRequestId(
              requestId
            );

          const agentMap = new Map<string, { status: string; record: any }>();

          for (const record of grantAccessRecords || []) {
            const agentId = record.agentId.toString();
            if (!agentMap.has(agentId)) {
              agentMap.set(agentId, {
                status: record.status,
                record,
              });
            }
          }

          const grantAccessAgents =
            await this.agentRepository.findAllGrantAccessAgent({
              hasGrantAccess: true,
            });

          const uniqueAgentIds = new Set<string>();

          for (const id of agentMap.keys()) {
            uniqueAgentIds.add(id);
          }

          for (const agent of grantAccessAgents) {
            if (!agent.userId) {
              continue;
            }

            const grantAccessUserId =
              typeof agent.userId === "string"
                ? agent.userId
                : ((agent.userId as any)?._id?.toString() ??
                  agent.userId.toString());

            if (grantAccessUserId) {
              uniqueAgentIds.add(grantAccessUserId);
            }
          }

          const agentIds = Array.from(uniqueAgentIds);

          const agents = [];

          for (const agentId of agentIds) {
            try {
              // Get agent profile (company, license)
              const agentProfile =
                await this.agentRepository.findByUserId(agentId);

              // Get agent user (name, email, phone, image)
              const agentUser = await this.userRepository.findById(agentId);

              if (agentProfile && agentUser) {
                const accessInfo = agentMap.get(agentId);
                const hasGrantAccess = agentProfile.hasGrantAccess;
                const accessStatus = accessInfo?.status;
                const hasRequestAccess =
                  accessStatus === "paid" || accessStatus === "approved";

                if (hasGrantAccess || hasRequestAccess) {
                  agents.push({
                    _id: agentProfile._id?.toString(),
                    userId: agentUser._id?.toString(),
                    fullName: agentUser.fullName,
                    email: agentUser.email,
                    phoneNumber: agentUser.phoneNumber || null,
                    licenseNumber: agentProfile.licenseNumber,
                    profileImageUrl: agentUser.profileImageUrl || null,
                    accessStatus,
                    ...(agentProfile.hasGrantAccess && {
                      hasGrantAccess: agentProfile.hasGrantAccess,
                    }),
                  });
                }
              }
            } catch (error) {
              logger.warn(
                { agentId, requestId },
                "Failed to fetch agent details, skipping"
              );
              continue;
            }
          }

          // Sort agents by name for consistent ordering
          agents.sort((a, b) => a.fullName.localeCompare(b.fullName));

          // Return request with agent matches
          const requestObject = request.toObject ? request.toObject() : request;

          return {
            ...requestObject,
            agentMatches: {
              totalCount: agents.length,
              agents: agents,
            },
          };
        } catch (error) {
          logger.warn(
            { requestId: request._id, error },
            "Failed to fetch agents for request, returning without agents"
          );

          // Return request without agents if fetch fails
          const requestObject = request.toObject ? request.toObject() : request;
          return {
            ...requestObject,
            agentMatches: {
              totalCount: 0,
              agents: [],
            },
          };
        }
      })
    );

    return {
      data: requestsWithAgents,
      pagination: requests.pagination,
    };
  }

  private async getRenterInfoForRequest(renterId: string) {
    const renter = await this.renterRepository.findRenterWithReferrer(renterId);

    if (!renter) {
      return null;
    }

    let referrerInfo = null;

    if (renter.referredByAgentId) {
      const referrer = await this.userRepository.findById(
        renter.referredByAgentId.toString()
      );
      if (referrer) {
        referrerInfo = {
          referrerId: referrer._id?.toString(),
          referrerName: referrer.fullName,
          referrerType: "AGENT",
        };
      }
    } else if (renter.referredByAdminId) {
      const referrer = await this.userRepository.findById(
        typeof renter.referredByAdminId === "string"
          ? renter.referredByAdminId
          : renter.referredByAdminId._id
      );
      if (referrer) {
        referrerInfo = {
          referrerId: referrer._id?.toString(),
          referrerName: referrer.fullName,
          referrerType: "ADMIN",
        };
      }
    }

    return {
      renterId: renter._id?.toString() || renterId,
      fullName: renter.fullName,
      email: renter.email,
      phoneNumber: renter.phoneNumber,
      registrationType: renter.registrationType,
      referralInfo: referrerInfo,
    };
  }

  /**
   * Update the single consolidated Excel file
   * Called after every new request creation
   */
  private async updateConsolidatedExcel(): Promise<void> {
    // 1. Generate Excel with ALL requests
    const buffer = await this.excelService.generateConsolidatedPreMarketExcel();

    // 2. Upload to S3
    const { url, fileName } =
      await this.excelService.uploadConsolidatedExcel(buffer);

    // 3. Get current total count
    const totalRequests = await this.preMarketRepository.count();

    // 4. Get previous version number
    const previousMetadata = await this.preMarketRepository.getExcelMetadata();
    const version = (previousMetadata?.version || 0) + 1;

    // 5. Update metadata in database
    await this.preMarketRepository.updateExcelMetadata({
      type: "pre_market",
      fileName,
      fileUrl: url,
      lastUpdated: new Date(),
      totalRequests,
      version,
      generatedAt: new Date(),
    });

    logger.info(
      { url, fileName, version, totalRequests },
      "Consolidated Excel updated"
    );
  }

  /**
   * Get consolidated Excel file info
   * Can be called by admin to get download link
   */
  async getConsolidatedExcel(): Promise<any> {
    const metadata = await this.preMarketRepository.getExcelMetadata();

    if (!metadata) {
      throw new NotFoundException("No consolidated Excel file found");
    }
    return metadata;
  }

  public async getAllListingsWithAllData(): Promise<any> {
    try {
      const listings =
        await this.preMarketRepository.getAllListingsWithAllData();

      return listings;
    } catch (error) {
      logger.error({ error }, "Failed to get all listings with data");
      throw error;
    }
  }
}
