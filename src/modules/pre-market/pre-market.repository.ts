// file: src/modules/pre-market/pre-market.repository.ts

import { env } from "@/env";
import { logger } from "@/middlewares/pino-logger";
import type { PaginatedResponse, PaginationQuery } from "@/ts/pagination.types";
import { PaginationHelper } from "@/utils/pagination-helper";
import { BaseRepository } from "../base/base.repository";
import {
  PreMarketRequestModel,
  type IPreMarketRequest,
} from "./pre-market.model";

export class PreMarketRepository extends BaseRepository<IPreMarketRequest> {
  constructor() {
    super(PreMarketRequestModel);
  }

  async findAllWithPagination(
    query: PaginationQuery
  ): Promise<PaginatedResponse<IPreMarketRequest>> {
    const paginateOptions = PaginationHelper.parsePaginationParams(query);

    const result = await (this.model as any).paginate(
      { isDeleted: false },
      paginateOptions
    );

    return PaginationHelper.formatResponse(result);
  }

  async findByRequestId(requestId: string): Promise<IPreMarketRequest | null> {
    return this.model
      .findOne({ requestId })
      .lean() as Promise<IPreMarketRequest | null>;
  }

  async findByRenterId(
    renterId: string,
    query: PaginationQuery
  ): Promise<PaginatedResponse<IPreMarketRequest>> {
    const paginateOptions = PaginationHelper.parsePaginationParams(query);

    const result = await (this.model as any).paginate(
      { renterId, status: "active" },
      paginateOptions
    );

    return PaginationHelper.formatResponse<IPreMarketRequest>(result);
  }

  async findByLocations(
    locations: string[],
    query: PaginationQuery
  ): Promise<PaginatedResponse<IPreMarketRequest>> {
    const paginateOptions = PaginationHelper.parsePaginationParams(query);

    const result = await (this.model as any).paginate(
      {
        locations: { $in: locations },
        status: "active",
      },
      paginateOptions
    );

    return PaginationHelper.formatResponse<IPreMarketRequest>(result);
  }

  async findByPriceRange(
    minPrice: number,
    maxPrice: number,
    query: PaginationQuery
  ): Promise<PaginatedResponse<IPreMarketRequest>> {
    const paginateOptions = PaginationHelper.parsePaginationParams(query);

    const result = await (this.model as any).paginate(
      {
        "priceRange.min": { $gte: minPrice },
        "priceRange.max": { $lte: maxPrice },
        status: "active",
      },
      paginateOptions
    );

    return PaginationHelper.formatResponse<IPreMarketRequest>(result);
  }

  async findByFilters(
    filters: Record<string, any>,
    query: PaginationQuery,
    searchFields: string[] = []
  ): Promise<PaginatedResponse<IPreMarketRequest>> {
    const paginateOptions = PaginationHelper.parsePaginationParams(query);
    const searchFilter = PaginationHelper.createSearchFilter(
      query,
      searchFields
    );

    const combinedFilter = {
      ...filters,
      ...searchFilter,
      status: "active",
    };

    const result = await (this.model as any).paginate(
      combinedFilter,
      paginateOptions
    );

    return PaginationHelper.formatResponse<IPreMarketRequest>(result);
  }

  // ============================================
  // UPDATE
  // ============================================

  async addAgentToViewedBy(
    requestId: string,
    agentId: string,
    type: "grantAccessAgents" | "normalAgents"
  ): Promise<IPreMarketRequest | null> {
    return this.model.findByIdAndUpdate(
      requestId,
      {
        $addToSet: { [`viewedBy.${type}`]: agentId },
      },
      { new: true }
    );
  }

  async removeAgentFromViewedBy(
    requestId: string,
    agentId: string,
    type: "grantAccessAgents" | "normalAgents"
  ): Promise<IPreMarketRequest | null> {
    return this.model.findByIdAndUpdate(
      requestId,
      {
        $pull: { [`viewedBy.${type}`]: agentId },
      },
      { new: true }
    );
  }

  // ============================================
  // DELETE
  // ============================================

  async softDelete(id: string): Promise<IPreMarketRequest | null> {
    return this.model.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        status: "deleted",
      },
      { new: true }
    );
  }

  async restore(id: string): Promise<IPreMarketRequest | null> {
    return this.model.findByIdAndUpdate(
      id,
      {
        isDeleted: false,
        deletedAt: null,
        status: "active",
      },
      { new: true }
    );
  }

  // ============================================
  // STATISTICS
  // ============================================

  async countByLocation(location: string): Promise<number> {
    return this.model.countDocuments({
      locations: location,
      status: "active",
    });
  }

  async getLocationStatistics(): Promise<
    Array<{ location: string; count: number }>
  > {
    return this.model.aggregate<{ location: string; count: number }>([
      { $match: { status: "active", isDeleted: false } },
      {
        $group: {
          _id: "$locations",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          location: "$_id",
          count: 1,
          _id: 0,
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);
  }

  async getPriceRangeStatistics(): Promise<{
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
  }> {
    const result = await this.model.aggregate([
      { $match: { status: "active", isDeleted: false } },
      {
        $group: {
          _id: null,
          minPrice: { $min: "$priceRange.min" },
          maxPrice: { $max: "$priceRange.max" },
          avgPrice: {
            $avg: {
              $divide: [{ $add: ["$priceRange.min", "$priceRange.max"] }, 2],
            },
          },
        },
      },
      {
        $project: {
          minPrice: 1,
          maxPrice: 1,
          avgPrice: 1,
          _id: 0,
        },
      },
    ]);

    return (result && result[0]) || { minPrice: 0, maxPrice: 0, avgPrice: 0 };
  }

  async getRequestsWithStats(
    query: PaginationQuery
  ): Promise<PaginatedResponse<IPreMarketRequest>> {
    const paginateOptions = PaginationHelper.parsePaginationParams(query);

    const result = await (this.model as any).paginate(
      { status: "active", isDeleted: false },
      paginateOptions
    );

    return PaginationHelper.formatResponse<IPreMarketRequest>(result);
  }

  /**
   * Get all requests available for grant access agents
   * Filter by status = "Match" and exclude requests already viewed by this agent
   */
  async findForGrantAccessAgents(
    agentId: string,
    query: PaginationQuery
  ): Promise<PaginatedResponse<IPreMarketRequest>> {
    const paginateOptions = PaginationHelper.parsePaginationParams(query);

    const result = await (this.model as any).paginate(
      {
        isDeleted: false,
        // isDeleted: false,
        // "viewedBy.grantAccessAgents": { $ne: agentId },
      },
      paginateOptions
    );

    return PaginationHelper.formatResponse(result);
  }

  async findAllForAdmin(
    query: PaginationQuery
  ): Promise<PaginatedResponse<IPreMarketRequest>> {
    const paginateOptions = PaginationHelper.parsePaginationParams(query);

    const result = await (this.model as any).paginate(
      { isDeleted: false },
      paginateOptions
    );

    return PaginationHelper.formatResponse<IPreMarketRequest>(result);
  }

  async findByIdForAdmin(id: string): Promise<IPreMarketRequest | null> {
    return this.model.findById(id).lean<IPreMarketRequest | null>().exec();
  }

  async findAvailableForNormalAgents(
    agentId: string,
    query: PaginationQuery
  ): Promise<PaginatedResponse<IPreMarketRequest>> {
    const paginateOptions = PaginationHelper.parsePaginationParams(query);

    const result = await (this.model as any).paginate(
      {
        status: "Available",
        isDeleted: false,
        "viewedBy.normalAgents": { $ne: agentId },
      },
      paginateOptions
    );

    return PaginationHelper.formatResponse(result);
  }

  async findVisibleForAgent(
    agentId: string,
    query: PaginationQuery,
    hasAdminAccess: boolean
  ): Promise<PaginatedResponse<IPreMarketRequest>> {
    const paginateOptions = PaginationHelper.parsePaginationParams(query);

    // Base query
    let filter: any = {
      isDeleted: false,
    };

    if (hasAdminAccess) {
      // Admin-granted agents see "match" status requests
      filter.status = "match";
      filter["viewedBy.grantAccessAgents"] = { $ne: agentId };
    } else {
      // Normal agents see "Available" status requests
      filter.status = "Available";
      filter["viewedBy.normalAgents"] = { $ne: agentId };
    }

    const result = await (this.model as any).paginate(filter, paginateOptions);

    return PaginationHelper.formatResponse(result);
  }

  async getRequestById(id: string): Promise<IPreMarketRequest | null> {
    return this.model
      .findById(id)
      .lean()
      .exec() as Promise<IPreMarketRequest | null>;
  }

  async toggleListingActive(
    id: string,
    isActive: boolean
  ): Promise<IPreMarketRequest | null> {
    return this.model.findByIdAndUpdate(id, { isActive }, { new: true });
  }

  /**
   * Get all listings for a renter
   * @param renterId - Renter ID
   * @param includeInactive - Include deactivated listings
   */

  async findByRenterIdAll(
    renterId: string,
    includeInactive: boolean = true
  ): Promise<IPreMarketRequest[]> {
    const query: any = {
      renterId,
      isDeleted: false,
    };

    if (!includeInactive) {
      query.isActive = true;
    }

    return this.model
      .find(query)
      .sort({ createdAt: -1 })
      .lean<IPreMarketRequest[]>()
      .exec();
  }

  async isListingActive(id: string): Promise<boolean> {
    const listing = await this.model.findById(id).select("isActive").lean();
    return listing?.isActive ?? false;
  }

  async findByIdWithActivationStatus(
    id: string
  ): Promise<IPreMarketRequest | null> {
    return this.model
      .findById(id)
      .select("isActive status requestId renterId")
      .lean() as Promise<IPreMarketRequest | null>;
  }

  /**
   * Get all active requests (for Excel export)
   * Uses aggregation to reliably join renter data
   * Note: renterId stores User._id, and Renter.userId also stores User._id
   */
  // async findAll(): Promise<IPreMarketRequest[]> {
  //   return (await this.model.aggregate([
  //     { $match: { isDeleted: false } },
  //     {
  //       $lookup: {
  //         from: "renters",  // Renters collection
  //         localField: "renterId",  // PreMarketRequest.renterId = User._id
  //         foreignField: "userId",  // Renter.userId = User._id
  //         as: "renterData",
  //       },
  //     },
  //     {
  //       $addFields: {
  //         renterInfo: { $arrayElemAt: ["$renterData", 0] },
  //       },
  //     },
  //     {
  //       $project: {
  //         renterData: 0,
  //       },
  //     },
  //     { $sort: { createdAt: -1 } },
  //   ])) as any;
  // }

  async findAll(): Promise<any[]> {
    try {
      const result = await this.model.aggregate([
        { $match: { isDeleted: false } },

        {
          $lookup: {
            from: "renters",
            localField: "renterId",
            foreignField: "userId",
            as: "renterData",
          },
        },

        {
          $addFields: {
            renterInfo: {
              $arrayElemAt: ["$renterData", 0],
            },
          },
        },

        {
          $project: {
            renterData: 0,
          },
        },

        { $sort: { createdAt: -1 } },
      ]);

      return result;
    } catch (error) {
      logger.error({ error }, "Error in findAll aggregation");
      throw error;
    }
  }

  /**
   * Count total active requests
   */
  async count(): Promise<number> {
    return await this.model.countDocuments({ isDeleted: false });
  }

  /**
   * Update Excel metadata in separate collection
   */
  async updateExcelMetadata(metadata: any): Promise<void> {
    const db = this.model.db;
    await db
      .collection("excel_metadata")
      .updateOne(
        { type: "pre_market" },
        { $set: { ...metadata, updatedAt: new Date() } },
        { upsert: true }
      );
  }

  /**
   * Get Excel metadata
   */
  async getExcelMetadata(): Promise<any> {
    const db = this.model.db;
    return await db
      .collection("excel_metadata")
      .findOne({ type: "pre_market" });
  }

  async findByIds(ids: string[]): Promise<IPreMarketRequest[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    return this.model
      .find({
        _id: { $in: ids },
        isDeleted: false,
        status: "active",
      })
      .lean()
      .exec() as unknown as Promise<IPreMarketRequest[]>;

    // return PaginationHelper.formatResponse(response) as any;
  }

  findByIdsWithPagination(ids: any[], query: PaginationQuery) {
    const paginationOptions = PaginationHelper.parsePaginationParams(query);
    return (this.model as any).paginate(
      { _id: { $in: ids }, isDeleted: false, status: "active" },
      paginationOptions
    );
  }

  async countActiveByRenterId(renterId: string): Promise<number> {
    return this.model.countDocuments({
      renterId,
      isDeleted: { $ne: true },
      isActive: true,
    });
  }

  async getActiveByRenterId(renterId: string): Promise<IPreMarketRequest[]> {
    return this.model
      .find({
        renterId,
        isDeleted: { $ne: true },
        isActive: true,
      })
      .sort({ createdAt: 1 })
      .exec();
  }

  async getAllActiveAgentIds(): Promise<string[]> {
    try {
      const agents = await this.model.db
        .collection("agentprofiles")
        .find(
          {
            isActive: true,
          },
          {
            projection: { _id: 1 },
          }
        )
        .toArray();

      return agents.map((agent: any) => agent._id.toString());
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        "Failed to get active agent IDs"
      );
      return [];
    }
  }

  async getAdminIdForNotification(): Promise<string | null> {
    try {
      const adminEmail = env.ADMIN_EMAIL;
      if (!adminEmail) {
        logger.warn("ADMIN_EMAIL not configured in environment");
        return null;
      }

      const admin = await this.model.db.collection("users").findOne(
        {
          email: adminEmail,
          role: "Admin",
        },
        {
          projection: { _id: 1 },
        }
      );

      return admin ? admin._id.toString() : null;
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        "Failed to get admin ID"
      );
      return null;
    }
  }
}
