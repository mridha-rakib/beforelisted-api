// file: src/modules/request-match/request-match.service.ts

import { logger } from "@/middlewares/pino-logger";
import { PreMarketRequestService } from "@/modules/pre-market-request/pre-market-request.service";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@/utils/app-error.utils";
import type { IRequestMatch } from "./request-match.interface";
import { RequestMatchRepository } from "./request-match.repository";
import type {
  AdminApproveRejectMatchPayload,
  AdminSetGrantAccessPricePayload,
  CreateRequestMatchPayload,
  RequestMatchResponse,
} from "./request-match.type";

/**
 * Request Match Service
 * Handles request match business logic
 */
export class RequestMatchService {
  private repository: RequestMatchRepository;
  private preMarketRequestService: PreMarketRequestService;

  constructor() {
    this.repository = new RequestMatchRepository();
    this.preMarketRequestService = new PreMarketRequestService();
  }

  /**
   * AGENT: Create request match (agent clicks "Request Match")
   */
  async createRequestMatch(
    agentId: string,
    payload: CreateRequestMatchPayload
  ): Promise<RequestMatchResponse> {
    // Check if pre-market request exists
    const preMarketRequest = await this.preMarketRequestService.getRequestById(
      payload.preMarketRequestId
    );
    if (!preMarketRequest) {
      throw new NotFoundException("Pre-market request not found");
    }

    // Check if agent already has pending match for this request
    const existingMatch = await this.repository.findExistingMatch(
      agentId,
      payload.preMarketRequestId
    );
    if (existingMatch) {
      throw new ConflictException(
        "You already have a pending match request for this pre-market listing"
      );
    }

    // Create match with status "pending"
    const match = await this.repository.create({
      agentId,
      preMarketRequestId: payload.preMarketRequestId,
      status: "pending",
      grantAccessRequested: false,
      grantAccessApproved: false,
      grantAccessPaymentStatus: "pending",
      agentNotes: payload.agentNotes,
    });

    // Increment match count on pre-market request
    await this.preMarketRequestService.incrementMatchCount(
      payload.preMarketRequestId
    );

    logger.info(
      { agentId, preMarketRequestId: payload.preMarketRequestId },
      "Request match created"
    );

    return this.toResponse(match);
  }

  /**
   * AGENT: Get own match requests
   */
  async getAgentMatches(agentId: string): Promise<RequestMatchResponse[]> {
    const matches = await this.repository.findByAgentId(agentId);
    return matches.map((m) => this.toResponse(m));
  }

  /**
   * AGENT: Get single match details
   */
  async getMatchDetails(
    agentId: string,
    matchId: string
  ): Promise<RequestMatchResponse> {
    const match = await this.repository.findById(matchId);
    if (!match) {
      throw new NotFoundException("Request match not found");
    }

    // Check ownership
    if (match.agentId !== agentId) {
      throw new NotFoundException("Request match not found");
    }

    return this.toResponse(match);
  }

  /**
   * ADMIN: Get all request matches
   */
  async adminGetAllMatches(): Promise<RequestMatchResponse[]> {
    const matches = await this.repository.findAllForAdmin();
    return matches.map((m) => this.toResponse(m));
  }

  /**
   * ADMIN: Get matches for a specific pre-market request
   */
  async adminGetMatchesForRequest(
    preMarketRequestId: string
  ): Promise<RequestMatchResponse[]> {
    const matches =
      await this.repository.findByPreMarketRequestId(preMarketRequestId);
    return matches.map((m) => this.toResponse(m));
  }

  /**
   * ADMIN: Get pending matches for a pre-market request
   */
  async adminGetPendingMatchesForRequest(
    preMarketRequestId: string
  ): Promise<RequestMatchResponse[]> {
    const matches =
      await this.repository.findPendingByPreMarketRequestId(preMarketRequestId);
    return matches.map((m) => this.toResponse(m));
  }

  /**
   * ADMIN: Approve or reject match
   */
  async adminUpdateMatchStatus(
    matchId: string,
    payload: AdminApproveRejectMatchPayload
  ): Promise<RequestMatchResponse> {
    const match = await this.repository.findById(matchId);
    if (!match) {
      throw new NotFoundException("Request match not found");
    }

    const updated = await this.repository.updateStatus(
      matchId,
      payload.status,
      payload.adminNotes
    );

    if (!updated) {
      throw new NotFoundException("Request match not found");
    }

    logger.info(
      { matchId, status: payload.status },
      "Match status updated by admin"
    );

    return this.toResponse(updated);
  }

  /**
   * ADMIN: Set grant access amount (agent requests, admin decides price)
   */
  async adminSetGrantAccessAmount(
    matchId: string,
    payload: AdminSetGrantAccessPricePayload
  ): Promise<RequestMatchResponse> {
    const match = await this.repository.findById(matchId);
    if (!match) {
      throw new NotFoundException("Request match not found");
    }

    const updated = await this.repository.setGrantAccessAmount(
      matchId,
      payload.grantAccessAmount
    );

    if (!updated) {
      throw new NotFoundException("Request match not found");
    }

    logger.info(
      { matchId, amount: payload.grantAccessAmount },
      "Grant access amount set by admin"
    );

    return this.toResponse(updated);
  }

  /**
   * AGENT: Request grant access (triggers admin to set price)
   */
  async requestGrantAccess(
    agentId: string,
    matchId: string
  ): Promise<RequestMatchResponse> {
    const match = await this.repository.findById(matchId);
    if (!match) {
      throw new NotFoundException("Request match not found");
    }

    // Check ownership
    if (match.agentId !== agentId) {
      throw new NotFoundException("Request match not found");
    }

    // Check if already requested or approved
    if (match.grantAccessRequested) {
      throw new BadRequestException(
        "Grant access already requested for this match"
      );
    }

    // Update to show grant access is requested
    const updated = await this.repository.findByIdAndUpdate(matchId, {
      grantAccessRequested: true,
      grantAccessRequestedAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundException("Request match not found");
    }

    logger.info({ agentId, matchId }, "Agent requested grant access");

    return this.toResponse(updated);
  }

  /**
   * ADMIN: Grant free access
   */
  async adminGrantFreeAccess(matchId: string): Promise<RequestMatchResponse> {
    const match = await this.repository.findById(matchId);
    if (!match) {
      throw new NotFoundException("Request match not found");
    }

    const updated = await this.repository.markFreeAccessGranted(matchId);

    if (!updated) {
      throw new NotFoundException("Request match not found");
    }

    logger.info({ matchId }, "Free grant access granted by admin");

    return this.toResponse(updated);
  }

  /**
   * Process Stripe payment (after successful payment)
   */
  async processStripePayment(
    agentId: string,
    matchId: string,
    stripePaymentId: string
  ): Promise<RequestMatchResponse> {
    const match = await this.repository.findById(matchId);
    if (!match) {
      throw new NotFoundException("Request match not found");
    }

    // Check ownership
    if (match.agentId !== agentId) {
      throw new NotFoundException("Request match not found");
    }

    // Check if amount was set by admin
    if (!match.grantAccessAmount || match.grantAccessAmount <= 0) {
      throw new BadRequestException("Grant access amount not set by admin yet");
    }

    const updated = await this.repository.markPaymentCompleted(
      matchId,
      stripePaymentId
    );

    if (!updated) {
      throw new NotFoundException("Request match not found");
    }

    logger.info(
      { agentId, matchId, stripePaymentId },
      "Stripe payment processed"
    );

    return this.toResponse(updated);
  }

  /**
   * ADMIN: Reject match and decrement count
   */
  async adminRejectMatch(
    matchId: string,
    adminNotes?: string
  ): Promise<RequestMatchResponse> {
    const match = await this.repository.findById(matchId);
    if (!match) {
      throw new NotFoundException("Request match not found");
    }

    // Only decrement if match is still pending
    if (match.status === "pending") {
      await this.preMarketRequestService.decrementMatchCount(
        match.preMarketRequestId
      );
    }

    const updated = await this.repository.updateStatus(
      matchId,
      "rejected",
      adminNotes
    );

    if (!updated) {
      throw new NotFoundException("Request match not found");
    }

    logger.info({ matchId }, "Match rejected by admin");

    return this.toResponse(updated);
  }

  /**
   * Check if agent has grant access for a pre-market request
   * (for showing renter contact info)
   */
  async hasGrantAccess(
    agentId: string,
    preMarketRequestId: string
  ): Promise<boolean> {
    const match = await this.repository.findExistingMatch(
      agentId,
      preMarketRequestId
    );

    if (!match) {
      return false;
    }

    return match.grantAccessApproved;
  }

  /**
   * Get grant access status for match
   */
  async getGrantAccessStatus(matchId: string): Promise<{
    requested: boolean;
    approved: boolean;
    paymentStatus: string;
    amount?: number;
  }> {
    const match = await this.repository.findById(matchId);
    if (!match) {
      throw new NotFoundException("Request match not found");
    }

    return {
      requested: match.grantAccessRequested,
      approved: match.grantAccessApproved,
      paymentStatus: match.grantAccessPaymentStatus,
      amount: match.grantAccessAmount,
    };
  }

  /**
   * Count pending matches for pre-market request
   */
  async countPendingMatches(preMarketRequestId: string): Promise<number> {
    return this.repository.countPendingMatches(preMarketRequestId);
  }

  /**
   * Internal: Get match by ID (for other services)
   */
  async getMatchById(matchId: string): Promise<IRequestMatch | null> {
    return this.repository.findById(matchId);
  }

  /**
   * Convert to response
   */
  private toResponse(match: IRequestMatch): RequestMatchResponse {
    return {
      _id: match._id.toString(),
      agentId: match.agentId,
      preMarketRequestId: match.preMarketRequestId,
      status: match.status,
      grantAccessRequested: match.grantAccessRequested,
      grantAccessApproved: match.grantAccessApproved,
      grantAccessPaymentStatus: match.grantAccessPaymentStatus,
      grantAccessAmount: match.grantAccessAmount,
      adminNotes: match.adminNotes,
      agentNotes: match.agentNotes,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
    };
  }
}
