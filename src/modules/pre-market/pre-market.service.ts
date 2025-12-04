// file: src/modules/pre-market/pre-market.service.ts

import type { PaginatedResponse, PaginationQuery } from "@/ts/pagination.types";
import {
  BadRequestException,
  NotFoundException,
} from "@/utils/app-error.utils";

import { logger } from "@/middlewares/pino-logger";
import { GrantAccessRepository } from "../grant-access/grant-access.repository";
import { PreMarketNotifier } from "../notification/pre-market.notifier";
import { PaymentService } from "../payment/payment.service";
import type { IPreMarketRequest } from "./pre-market.model";
import { PreMarketRepository } from "./pre-market.repository";

export class PreMarketService {
  constructor(
    private readonly preMarketRepository: PreMarketRepository,
    private readonly grantAccessRepository: GrantAccessRepository,
    private readonly paymentService: PaymentService,
    private readonly notifier: PreMarketNotifier
  ) {}

  // ============================================
  // CREATE REQUEST
  // ============================================

  async createRequest(
    renterId: string,
    payload: {
      movingDateRange: { earliest: Date; latest: Date };
      priceRange: { min: number; max: number };
      locations: string[];
      bedrooms: string[];
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
    const requestId = `BeforeListed-PM-${timestamp}-${randomStr}`;
    const requestName = requestId;

    // Create request
    const request = await this.preMarketRepository.create({
      requestId,
      requestName,
      renterId,
      movingDateRange: payload.movingDateRange,
      priceRange: payload.priceRange,
      locations: payload.locations,
      bedrooms: payload.bedrooms,
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

    logger.info(`Pre-market request created: ${requestId}`, { renterId });

    // Send notifications
    await this.notifier.notifyAllAgents(request);

    return request;
  }

  // ============================================
  // READ REQUESTS
  // ============================================

  async getAllRequests(
    query: PaginationQuery
  ): Promise<PaginatedResponse<IPreMarketRequest>> {
    return this.preMarketRepository.findAll(query);
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

    return request;
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
    payload: Partial<IPreMarketRequest>
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
      payload
    );

    logger.info(`Pre-market request updated: ${requestId}`, { renterId });

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

    logger.info(`Pre-market request deleted: ${requestId}`, { renterId });
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getLocationStatistics() {
    return this.preMarketRepository.getLocationStatistics();
  }

  async getPriceRangeStatistics() {
    return this.preMarketRepository.getPriceRangeStatistics();
  }
}
