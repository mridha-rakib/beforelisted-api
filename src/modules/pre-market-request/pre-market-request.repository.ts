// file: src/modules/pre-market-request/pre-market-request.repository.ts

import { BaseRepository } from "@/modules/base/base.repository";
import type { IPreMarketRequest } from "./pre-market-request.interface";
import { PreMarketRequest } from "./pre-market-request.model";

/**
 * Pre-Market Request Repository
 */
export class PreMarketRequestRepository extends BaseRepository<IPreMarketRequest> {
  constructor() {
    super(PreMarketRequest);
  }

  /**
   * Find requests by renter ID
   */
  async findByRenterId(renterId: string): Promise<IPreMarketRequest[]> {
    return this.model.find({ renterId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Find active requests by renter ID
   */
  async findActiveByRenterId(renterId: string): Promise<IPreMarketRequest[]> {
    return this.model
      .find({ renterId, isActive: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find request by ID and renter ID (ownership check)
   */
  async findByIdAndRenterId(
    requestId: string,
    renterId: string
  ): Promise<IPreMarketRequest | null> {
    return this.model.findOne({ _id: requestId, renterId }).exec();
  }

  /**
   * Find all active requests (for agents/admin)
   */
  async findAllActive(): Promise<IPreMarketRequest[]> {
    return this.model.find({ isActive: true }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Find active requests by location (for agent filtering)
   */
  async findByLocations(locations: string[]): Promise<IPreMarketRequest[]> {
    return this.model
      .find({
        isActive: true,
        preferredLocations: { $in: locations },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Find active requests by budget range (for agent filtering)
   */
  async findByBudgetRange(
    minBudget: number,
    maxBudget: number
  ): Promise<IPreMarketRequest[]> {
    return this.model
      .find({
        isActive: true,
        budgetMin: { $lte: maxBudget },
        budgetMax: { $gte: minBudget },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Deactivate request
   */
  async deactivateRequest(
    requestId: string
  ): Promise<IPreMarketRequest | null> {
    return this.model
      .findByIdAndUpdate(requestId, { isActive: false }, { new: true })
      .exec();
  }

  /**
   * Activate request
   */
  async activateRequest(requestId: string): Promise<IPreMarketRequest | null> {
    return this.model
      .findByIdAndUpdate(requestId, { isActive: true }, { new: true })
      .exec();
  }

  /**
   * Increment match count
   */
  async incrementMatchCount(
    requestId: string
  ): Promise<IPreMarketRequest | null> {
    return this.model
      .findByIdAndUpdate(requestId, { $inc: { matchCount: 1 } }, { new: true })
      .exec();
  }

  /**
   * Decrement match count
   */
  async decrementMatchCount(
    requestId: string
  ): Promise<IPreMarketRequest | null> {
    return this.model
      .findByIdAndUpdate(requestId, { $inc: { matchCount: -1 } }, { new: true })
      .exec();
  }

  /**
   * Count active requests
   */
  async countActive(): Promise<number> {
    return this.model.countDocuments({ isActive: true }).exec();
  }

  /**
   * Count requests by renter
   */
  async countByRenterId(renterId: string): Promise<number> {
    return this.model.countDocuments({ renterId }).exec();
  }

  /**
   * Delete all requests for renter (when renter account deleted)
   */
  async deleteByRenterId(renterId: string): Promise<any> {
    return this.model.deleteMany({ renterId }).exec();
  }
}
