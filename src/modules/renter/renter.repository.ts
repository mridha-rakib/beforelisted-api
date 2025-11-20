// file: src/modules/renter/renter.repository.ts

import { BaseRepository } from "@/modules/base/base.repository";
import type { Types } from "mongoose";
import type { IRenterProfile } from "./renter.interface";
import { RenterProfile } from "./renter.model";

/**
 * Renter Profile Repository
 * All methods properly typed
 */
export class RenterProfileRepository extends BaseRepository<IRenterProfile> {
  constructor() {
    super(RenterProfile);
  }

  /**
   * Find renter by user ID
   */
  async findByUserId(
    userId: string | Types.ObjectId
  ): Promise<IRenterProfile | null> {
    return this.model.findOne({ userId }).exec();
  }

  /**
   * Update renter profile by userId
   */
  async updateByUserId(
    userId: string | Types.ObjectId,
    data: Partial<IRenterProfile>
  ): Promise<IRenterProfile | null> {
    return this.model.findOneAndUpdate({ userId }, data, { new: true }).exec();
  }

  /**
   * Get renters subscribed to email notifications
   */
  async findEmailSubscribed(): Promise<IRenterProfile[]> {
    return this.model.find({ emailNotificationsSubscribed: true }).exec();
  }

  /**
   * Get renters subscribed to weekly digest
   */
  async findWeeklyDigestSubscribed(): Promise<IRenterProfile[]> {
    return this.model.find({ weeklyReportDigest: true }).exec();
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: string | Types.ObjectId,
    preferences: {
      savedRequestsAlerts?: boolean;
      emailNotificationsSubscribed?: boolean;
      matchNotifications?: boolean;
      weeklyReportDigest?: boolean;
    }
  ): Promise<IRenterProfile | null> {
    return this.model
      .findOneAndUpdate({ userId }, preferences, { new: true })
      .exec();
  }

  /**
   * Unsubscribe from email
   */
  async unsubscribeEmail(
    userId: string | Types.ObjectId
  ): Promise<IRenterProfile | null> {
    return this.model
      .findOneAndUpdate(
        { userId },
        {
          emailNotificationsSubscribed: false,
          matchNotifications: false,
          weeklyReportDigest: false,
        },
        { new: true }
      )
      .exec();
  }

  /**
   * Increment pre-market request counts
   */
  async incrementPreMarketRequests(
    userId: string | Types.ObjectId
  ): Promise<IRenterProfile | null> {
    return this.model
      .findOneAndUpdate(
        { userId },
        {
          $inc: {
            totalPreMarketRequests: 1,
            activePreMarketRequests: 1,
          },
        },
        { new: true }
      )
      .exec();
  }

  /**
   * Decrement active pre-market requests
   */
  async decrementActivePreMarketRequests(
    userId: string | Types.ObjectId
  ): Promise<IRenterProfile | null> {
    return this.model
      .findOneAndUpdate(
        { userId },
        { $inc: { activePreMarketRequests: -1 } },
        { new: true }
      )
      .exec();
  }

  /**
   * Increment total matches
   */
  async incrementTotalMatches(
    userId: string | Types.ObjectId
  ): Promise<IRenterProfile | null> {
    return this.model
      .findOneAndUpdate(
        { userId },
        { $inc: { totalMatches: 1 } },
        { new: true }
      )
      .exec();
  }

  /**
   * Increment approved matches
   */
  async incrementApprovedMatches(
    userId: string | Types.ObjectId
  ): Promise<IRenterProfile | null> {
    return this.model
      .findOneAndUpdate(
        { userId },
        { $inc: { approvedMatches: 1 } },
        { new: true }
      )
      .exec();
  }

  /**
   * Update profile completeness
   */
  async updateProfileCompleteness(
    userId: string | Types.ObjectId,
    completeness: number
  ): Promise<IRenterProfile | null> {
    return this.model
      .findOneAndUpdate(
        { userId },
        { profileCompleteness: Math.min(completeness, 100) },
        { new: true }
      )
      .exec();
  }
}
