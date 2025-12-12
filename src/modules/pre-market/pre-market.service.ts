// file: src/modules/pre-market/pre-market.service.ts

import { env } from "@/env";
import { logger } from "@/middlewares/pino-logger";

import type { PaginatedResponse, PaginationQuery } from "@/ts/pagination.types";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@/utils/app-error.utils";
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
  }

  // ============================================
  // CREATE REQUEST
  // ============================================

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
      description?: string;
    }
  ): Promise<IPreMarketRequest> {
    // Validate date range
    const earliest = new Date(payload.movingDateRange.earliest);
    const latest = new Date(payload.movingDateRange.latest);

    if (earliest >= latest) {
      throw new BadRequestException(
        "Invalid date range: earliest must be before latest"
      );
    }

    // Validate price range
    if (payload.priceRange.min > payload.priceRange.max) {
      throw new BadRequestException(
        "Invalid price range: min must be less than max"
      );
    }

    // Generate request ID
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const requestId = `BL-TM-${randomStr}`;
    const requestName = requestId;

    // Create request
    const request = await this.preMarketRepository.create({
      requestId,
      requestName,
      renterId,
      movingDateRange: payload.movingDateRange,
      priceRange: payload.priceRange,
      locations: payload.locations,
      bedrooms: payload.bedrooms || [],
      bathrooms: payload.bathrooms,
      unitFeatures: payload.unitFeatures || {},
      buildingFeatures: payload.buildingFeatures || {},
      petPolicy: payload.petPolicy || {},
      guarantorRequired: payload.guarantorRequired || {},
      description: payload.description,
      status: "active",
      viewedBy: {
        grantAccessAgents: [],
        normalAgents: [],
      },
    });

    logger.info({ renterId }, `Pre-market request created: ${requestId}`);

    // Send notifications
    this.sendNotifications(request, renterId).catch((error) => {
      logger.error(
        { error, requestId: request._id },
        "Failed to send notifications (non-blocking - request already created)"
      );
      // Don't throw - notification failure should not break response
    });

    return request;
  }

  /**
   * Send notifications to agents and admin
   * Called asynchronously after request creation
   * Failures here do NOT affect the main request
   */
  private async sendNotifications(
    request: any,
    renterId: string
  ): Promise<void> {
    // Get renter details for notification payload
    const renter = await this.renterRepository.findById(renterId);

    if (!renter) {
      logger.warn(
        { renterId, requestId: request._id },
        "Renter not found for notification"
      );
      return;
    }

    // Build frontend listing URL
    const listingUrl = `${env.CLIENT_URL}/listings/${request._id}`;

    // Prepare notification payload
    const notificationPayload = {
      preMarketRequestId: request._id.toString(),
      title: request.title,
      description: request.description,
      location: request.location,
      serviceType: request.serviceType,
      renterId: renterId,
      renterName: renter.fullName,
      renterEmail: renter.email,
      renterPhone: renter.phoneNumber,
      listingUrl,
    };

    // Send notifications via notifier service
    const result =
      await preMarketNotifier.notifyNewRequest(notificationPayload);

    if (result.success) {
      logger.info(
        {
          requestId: request._id,
          agentsNotified: result.agentsNotified,
          adminNotified: result.adminNotified,
          emailsSent: result.emailsSent,
        },
        "✅ All notifications sent successfully"
      );
    } else {
      logger.warn(
        {
          requestId: request._id,
          success: result.success,
          errors: result.errors,
        },
        "⚠️ Some notifications failed"
      );
    }
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

    // Verify ownership
    if (request.renterId.toString() !== renterId) {
      throw new BadRequestException("Cannot delete others' requests");
    }

    // Soft delete
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

    if (agent.hasGrantAccess) {
      return this.getRequestsForGrantAccessAgents(agentId, query);
    }

    return this.getAvailableRequestsForNormalAgents(agentId, query);
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

    // Build renter info based on visibility
    const renterInfo: any = {
      renterId: renter._id,
      registrationType: renter.registrationType,
    };

    // Show contact info only to grant access agents
    if (hasGrantAccess) {
      renterInfo.renterName = renter.fullName;
      renterInfo.renterEmail = renter.email;
      renterInfo.renterPhone = renter.phoneNumber || null;
    }

    // Add referrer info (visible to all agents)
    if (referrerInfo) {
      renterInfo.referrer = referrerInfo;
    }

    // Merge with request
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
    console.log("++++++++++++++++++++++++++++++++++++++++++++");
    console.log(request);
    console.log("++++++++++++++++++++++++++++++++++++++++++++");
    const renter = await this.renterRepository.findRenterWithReferrer(
      request.renterId.toString()
    );

    // Build renter info from renter document
    const renterInfo = await this.buildRenterInfo(renter);

    // 2. Get agent request summary from grant access records
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

    // Add referrer info if applicable
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
      return request;
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
}
