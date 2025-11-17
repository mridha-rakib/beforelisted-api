// file: src/modules/renter/renter.repository.ts

import { BaseRepository } from "@/modules/base/base.repository";
import type { IRenterProfile, IRenterSavedRequest } from "./renter.interface";
import { RenterProfile, RenterSavedRequest } from "./renter.model";

/**
 * Renter Profile Repository
 */
export class RenterProfileRepository extends BaseRepository<IRenterProfile> {
  constructor() {
    super(RenterProfile);
  }

  /**
   * Find renter profile by user ID
   */
  async findByUserId(userId: string): Promise<IRenterProfile | null> {
    return this.model.findOne({ userId }).exec();
  }

  /**
   * Update request counts
   */
  async updateRequestCounts(
    userId: string,
    activeCount: number,
    totalCount: number
  ): Promise<IRenterProfile | null> {
    return this.model
      .findOneAndUpdate(
        { userId },
        {
          activeRequestsCount: activeCount,
          totalSavedRequests: totalCount,
        },
        { new: true }
      )
      .exec();
  }
}

/**
 * Renter Saved Request Repository
 */
export class RenterSavedRequestRepository extends BaseRepository<IRenterSavedRequest> {
  constructor() {
    super(RenterSavedRequest);
  }

  /**
   * Find requests by user ID
   */
  async findByUserId(userId: string): Promise<IRenterSavedRequest[]> {
    return this.model.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Find active requests by user ID
   */
  async findActiveByUserId(userId: string): Promise<IRenterSavedRequest[]> {
    return this.model
      .find({ userId, isActive: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find request by ID and user ID (ownership check)
   */
  async findByIdAndUserId(
    requestId: string,
    userId: string
  ): Promise<IRenterSavedRequest | null> {
    return this.model.findOne({ _id: requestId, userId }).exec();
  }

  /**
   * Count active requests for user
   */
  async countActiveByUserId(userId: string): Promise<number> {
    return this.model.countDocuments({ userId, isActive: true }).exec();
  }

  /**
   * Count total requests for user
   */
  async countByUserId(userId: string): Promise<number> {
    return this.model.countDocuments({ userId }).exec();
  }

  /**
   * Deactivate request
   */
  async deactivateRequest(
    requestId: string
  ): Promise<IRenterSavedRequest | null> {
    return this.model
      .findByIdAndUpdate(requestId, { isActive: false }, { new: true })
      .exec();
  }

  /**
   * Activate request
   */
  async activateRequest(
    requestId: string
  ): Promise<IRenterSavedRequest | null> {
    return this.model
      .findByIdAndUpdate(requestId, { isActive: true }, { new: true })
      .exec();
  }

  /**
   * Delete all requests for user (when deleting profile)
   */
  async deleteUserRequests(userId: string): Promise<any> {
    return this.model.deleteMany({ userId }).exec();
  }

  /**
   * Update match count
   */
  async updateMatchCount(
    requestId: string,
    count: number
  ): Promise<IRenterSavedRequest | null> {
    return this.model
      .findByIdAndUpdate(requestId, { matchCount: count }, { new: true })
      .exec();
  }
}
