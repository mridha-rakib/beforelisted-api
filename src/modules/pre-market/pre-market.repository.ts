// file: src/modules/pre-market/pre-market.repository.ts

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

  // ============================================
  // CREATE
  // ============================================

  async create(data: Partial<IPreMarketRequest>): Promise<IPreMarketRequest> {
    return this.model.create(data);
  }

  // ============================================
  // READ
  // ============================================

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
}
