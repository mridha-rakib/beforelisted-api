// file: src/modules/admin/admin.repository.ts

import { BaseRepository } from "@/modules/base/base.repository";
import type { IAdminAnalytics } from "./admin.interface";
import { AdminAnalytics } from "./admin.model";

/**
 * Admin Analytics Repository
 */
export class AdminAnalyticsRepository extends BaseRepository<IAdminAnalytics> {
  constructor() {
    super(AdminAnalytics);
  }

  /**
   * Get latest analytics
   */
  async getLatestAnalytics(): Promise<IAdminAnalytics | null> {
    return this.model.findOne().sort({ date: -1 }).exec();
  }

  /**
   * Get analytics for date range
   */
  async getAnalyticsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<IAdminAnalytics[]> {
    return this.model
      .find({
        date: { $gte: startDate, $lte: endDate },
      })
      .sort({ date: 1 })
      .exec();
  }

  /**
   * Get analytics for specific date
   */
  async getAnalyticsForDate(date: Date): Promise<IAdminAnalytics | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.model
      .findOne({
        date: { $gte: startOfDay, $lte: endOfDay },
      })
      .exec();
  }

  /**
   * Update or create analytics
   */
  async upsertAnalytics(
    date: Date,
    data: Partial<IAdminAnalytics>
  ): Promise<IAdminAnalytics> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.model
      .findOneAndUpdate(
        {
          date: { $gte: startOfDay, $lte: endOfDay },
        },
        data,
        { upsert: true, new: true }
      )
      .exec();
  }
}
