// file: src/modules/pre-market/pre-market.service.ts

import { env } from "@/env";
import { logger } from "@/middlewares/pino-logger";
import type { PaginatedResponse, PaginationQuery } from "@/ts/pagination.types";
import {
  BadRequestException,
  NotFoundException,
} from "@/utils/app-error.utils";
import { GrantAccessRepository } from "../grant-access/grant-access.repository";
import { PaymentService } from "../payment/payment.service";
import { RenterRepository } from "../renter/renter.repository";
import { preMarketNotifier, PreMarketNotifier } from "./pre-market-notifier";
import type { IPreMarketRequest } from "./pre-market.model";
import { PreMarketRepository } from "./pre-market.repository";

export class PreMarketService {
  private readonly preMarketRepository: PreMarketRepository;
  private readonly grantAccessRepository: GrantAccessRepository;
  private renterRepository: RenterRepository;

  private readonly paymentService: PaymentService;
  private readonly notifier: PreMarketNotifier;

  constructor() {
    this.preMarketRepository = new PreMarketRepository();
    this.grantAccessRepository = new GrantAccessRepository();
    this.paymentService = new PaymentService(
      this.grantAccessRepository,
      this.preMarketRepository
    );
    this.notifier = new PreMarketNotifier();
    this.renterRepository = new RenterRepository();
  }

  // ============================================
  // CREATE REQUEST
  // ============================================

  async createRequest(
    renterId: string,
    payload: {
      movingDateRange: { earliest: Date; latest: Date };
      priceRange: { min: number; max: number };
      locations: string[];
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
    try {
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
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          requestId: request._id,
          renterId,
        },
        "❌ Error in sendNotifications"
      );
      // Continue - don't let notification errors propagate
    }
  }

  // ============================================
  // READ REQUESTS
  // ============================================

  async getAllRequests(
    query: PaginationQuery
  ): Promise<PaginatedResponse<IPreMarketRequest>> {
    return this.preMarketRepository.findAll(query) as any;
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
}
