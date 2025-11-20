// file: src/modules/request-match/request-match.repository.ts

import { BaseRepository } from "@/modules/base/base.repository";
import type { IRequestMatch } from "./request-match.interface";
import { RequestMatch } from "./request-match.model";

/**
 * Request Match Repository
 */
export class RequestMatchRepository extends BaseRepository<IRequestMatch> {
  constructor() {
    super(RequestMatch);
  }

  /**
   * Find matches by agent ID
   */
  async findByAgentId(agentId: string): Promise<IRequestMatch[]> {
    return this.model.find({ agentId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Find matches by pre-market request ID
   */
  async findByPreMarketRequestId(
    preMarketRequestId: string
  ): Promise<IRequestMatch[]> {
    return this.model
      .find({ preMarketRequestId })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find pending matches for a pre-market request
   */
  async findPendingByPreMarketRequestId(
    preMarketRequestId: string
  ): Promise<IRequestMatch[]> {
    return this.model
      .find({ preMarketRequestId, status: "pending" })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find if agent already has pending match for this request
   */
  async findExistingMatch(
    agentId: string,
    preMarketRequestId: string
  ): Promise<IRequestMatch | null> {
    return this.model
      .findOne({ agentId, preMarketRequestId, status: "pending" })
      .exec();
  }

  /**
   * Count pending matches
   */
  async countPendingMatches(preMarketRequestId: string): Promise<number> {
    return this.model
      .countDocuments({ preMarketRequestId, status: "pending" })
      .exec();
  }

  /**
   * Update match status
   */
  async updateStatus(
    matchId: string,
    status: "approved" | "rejected",
    adminNotes?: string
  ): Promise<IRequestMatch | null> {
    return this.model
      .findByIdAndUpdate(
        matchId,
        {
          status,
          adminNotes,
        },
        { new: true }
      )
      .exec();
  }

  /**
   * Set grant access amount (admin)
   */
  async setGrantAccessAmount(
    matchId: string,
    amount?: number
  ): Promise<IRequestMatch | null> {
    return this.model
      .findByIdAndUpdate(
        matchId,
        {
          grantAccessAmount: amount,
          grantAccessPaymentStatus: amount ? "pending" : "free",
          grantAccessRequestedAt: new Date(),
        },
        { new: true }
      )
      .exec();
  }

  /**
   * Mark payment as completed
   */
  async markPaymentCompleted(
    matchId: string,
    stripePaymentId: string
  ): Promise<IRequestMatch | null> {
    return this.model
      .findByIdAndUpdate(
        matchId,
        {
          grantAccessPaymentStatus: "paid",
          grantAccessApproved: true,
          grantAccessApprovedAt: new Date(),
          grantAccessStripePaymentId: stripePaymentId,
        },
        { new: true }
      )
      .exec();
  }

  /**
   * Mark free access granted
   */
  async markFreeAccessGranted(matchId: string): Promise<IRequestMatch | null> {
    return this.model
      .findByIdAndUpdate(
        matchId,
        {
          grantAccessPaymentStatus: "free",
          grantAccessApproved: true,
          grantAccessApprovedAt: new Date(),
        },
        { new: true }
      )
      .exec();
  }

  /**
   * Find all matches for admin review
   */
  async findAllForAdmin(): Promise<IRequestMatch[]> {
    return this.model.find({}).sort({ createdAt: -1 }).exec();
  }

  /**
   * Delete match
   */
  async deleteMatch(matchId: string): Promise<any> {
    return this.model.deleteOne({ _id: matchId }).exec();
  }
}
