// file: src/modules/pre-market-request/pre-market-request.service.ts

import { logger } from "@/middlewares/pino-logger";
import { NotFoundException } from "@/utils/app-error.utils";
import type { IPreMarketRequest } from "./pre-market-request.interface";
import { PreMarketRequestRepository } from "./pre-market-request.repository";
import type {
  CreatePreMarketRequestPayload,
  PreMarketRequestResponse,
  UpdatePreMarketRequestPayload,
} from "./pre-market-request.type";

/**
 * Pre-Market Request Service
 * Handles pre-market request business logic
 */
export class PreMarketRequestService {
  private repository: PreMarketRequestRepository;

  constructor() {
    this.repository = new PreMarketRequestRepository();
  }

  /**
   * RENTER: Create pre-market request
   */
  async createPreMarketRequest(
    renterId: string,
    payload: CreatePreMarketRequestPayload
  ): Promise<PreMarketRequestResponse> {
    const request = await this.repository.create({
      renterId,
      ...payload,
      isActive: true,
      matchCount: 0,
    });

    logger.info(
      { renterId, requestId: request._id },
      "Pre-market request created"
    );
    return this.toResponse(request);
  }

  /**
   * RENTER: Get own requests
   */
  async getRenterRequests(
    renterId: string
  ): Promise<PreMarketRequestResponse[]> {
    const requests = await this.repository.findByRenterId(renterId);
    return requests.map((req) => this.toResponse(req));
  }

  /**
   * RENTER: Get single own request
   */
  async getRenterRequest(
    renterId: string,
    requestId: string
  ): Promise<PreMarketRequestResponse> {
    const request = await this.repository.findByIdAndRenterId(
      requestId,
      renterId
    );
    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    return this.toResponse(request);
  }

  /**
   * RENTER: Update only request name (title)
   */
  async updateRequestName(
    renterId: string,
    requestId: string,
    payload: UpdatePreMarketRequestPayload
  ): Promise<PreMarketRequestResponse> {
    // Check ownership
    const request = await this.repository.findByIdAndRenterId(
      requestId,
      renterId
    );
    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    const updated = await this.repository.updateById(requestId, payload);
    if (!updated) {
      throw new NotFoundException("Pre-market request not found");
    }

    logger.info({ renterId, requestId }, "Request name updated");
    return this.toResponse(updated);
  }

  /**
   * RENTER: Deactivate own request
   */
  async deactivateRequest(
    renterId: string,
    requestId: string
  ): Promise<PreMarketRequestResponse> {
    // Check ownership
    const request = await this.repository.findByIdAndRenterId(
      requestId,
      renterId
    );
    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    const updated = await this.repository.deactivateRequest(requestId);
    if (!updated) {
      throw new NotFoundException("Pre-market request not found");
    }

    logger.info({ renterId, requestId }, "Request deactivated");
    return this.toResponse(updated);
  }

  /**
   * RENTER: Activate own request
   */
  async activateRequest(
    renterId: string,
    requestId: string
  ): Promise<PreMarketRequestResponse> {
    // Check ownership
    const request = await this.repository.findByIdAndRenterId(
      requestId,
      renterId
    );
    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    const updated = await this.repository.activateRequest(requestId);
    if (!updated) {
      throw new NotFoundException("Pre-market request not found");
    }

    logger.info({ renterId, requestId }, "Request activated");
    return this.toResponse(updated);
  }

  /**
   * AGENT: Get all active requests (without personal info if no grant access)
   */
  async getActiveRequests(
    agentId?: string
  ): Promise<PreMarketRequestResponse[]> {
    const requests = await this.repository.findAllActive();
    return requests.map((req) => this.toResponse(req));
  }

  /**
   * AGENT: Get active requests by location
   */
  async getRequestsByLocations(
    locations: string[]
  ): Promise<PreMarketRequestResponse[]> {
    const requests = await this.repository.findByLocations(locations);
    return requests.map((req) => this.toResponse(req));
  }

  /**
   * AGENT: Get active requests by budget range
   */
  async getRequestsByBudgetRange(
    minBudget: number,
    maxBudget: number
  ): Promise<PreMarketRequestResponse[]> {
    const requests = await this.repository.findByBudgetRange(
      minBudget,
      maxBudget
    );
    return requests.map((req) => this.toResponse(req));
  }

  /**
   * AGENT: Get single request details
   */
  async getRequestDetails(
    requestId: string
  ): Promise<PreMarketRequestResponse> {
    const request = await this.repository.findById(requestId);
    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    return this.toResponse(request);
  }

  /**
   * ADMIN: Get all requests with renter info
   */
  async adminGetAllRequests(): Promise<PreMarketRequestResponse[]> {
    const requests = await this.repository.find({});
    return requests.map((req) => this.toResponse(req));
  }

  /**
   * ADMIN: Get request by ID
   */
  async adminGetRequest(requestId: string): Promise<PreMarketRequestResponse> {
    const request = await this.repository.findById(requestId);
    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    return this.toResponse(request);
  }

  /**
   * ADMIN: Get requests with pagination and filters
   */
  async adminGetRequestsPaginated(
    page: number = 1,
    limit: number = 10,
    filters?: {
      location?: string;
      budgetMin?: number;
      budgetMax?: number;
      bedrooms?: string;
      bathrooms?: string;
      isActive?: boolean;
    }
  ): Promise<{
    data: PreMarketRequestResponse[];
    pagination: any;
  }> {
    const filter: any = {};

    if (filters?.location) {
      filter.preferredLocations = filters.location;
    }

    if (filters?.budgetMin || filters?.budgetMax) {
      filter.budgetMin = {};
      if (filters.budgetMin) {
        filter.budgetMin.$lte = filters.budgetMax;
      }
      if (filters.budgetMax) {
        filter.budgetMax = { $gte: filters.budgetMin };
      }
    }

    if (filters?.bedrooms) {
      filter.bedrooms = filters.bedrooms;
    }

    if (filters?.bathrooms) {
      filter.bathrooms = filters.bathrooms;
    }

    if (filters?.isActive !== undefined) {
      filter.isActive = filters.isActive;
    }

    const result = await this.repository.paginate(filter, {
      page,
      limit,
      sort: { createdAt: -1 },
    });

    return {
      data: result.data.map((req) => this.toResponse(req)),
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.pageCount,
        totalItems: result.totalItems,
        itemsPerPage: result.itemsPerPage,
      },
    };
  }

  /**
   * ADMIN: Update request (can edit any field)
   */
  async adminUpdateRequest(
    requestId: string,
    payload: Partial<CreatePreMarketRequestPayload>
  ): Promise<PreMarketRequestResponse> {
    const request = await this.repository.findById(requestId);
    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    const updated = await this.repository.updateById(requestId, payload);
    if (!updated) {
      throw new NotFoundException("Pre-market request not found");
    }

    logger.info({ requestId, adminAction: true }, "Request updated by admin");
    return this.toResponse(updated);
  }

  /**
   * ADMIN: Deactivate request
   */
  async adminDeactivateRequest(
    requestId: string
  ): Promise<PreMarketRequestResponse> {
    const request = await this.repository.findById(requestId);
    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    const updated = await this.repository.deactivateRequest(requestId);
    if (!updated) {
      throw new NotFoundException("Pre-market request not found");
    }

    logger.info(
      { requestId, adminAction: true },
      "Request deactivated by admin"
    );
    return this.toResponse(updated);
  }

  /**
   * ADMIN: Delete request
   */
  async adminDeleteRequest(requestId: string): Promise<{ message: string }> {
    const request = await this.repository.findById(requestId);
    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    await this.repository.deleteById(requestId);

    logger.info({ requestId, adminAction: true }, "Request deleted by admin");
    return { message: "Pre-market request deleted successfully" };
  }

  /**
   * Internal: Increment match count
   */
  async incrementMatchCount(
    requestId: string
  ): Promise<IPreMarketRequest | null> {
    return this.repository.incrementMatchCount(requestId);
  }

  /**
   * Internal: Decrement match count
   */
  async decrementMatchCount(
    requestId: string
  ): Promise<IPreMarketRequest | null> {
    return this.repository.decrementMatchCount(requestId);
  }

  /**
   * Internal: Get request by ID (for other services)
   */
  async getRequestById(requestId: string): Promise<IPreMarketRequest | null> {
    return this.repository.findById(requestId);
  }

  /**
   * Convert to response (exclude sensitive fields)
   */
  private toResponse(request: IPreMarketRequest): PreMarketRequestResponse {
    return {
      _id: request._id.toString(),
      renterId: request.renterId,
      requestName: request.requestName,
      preferredLocations: request.preferredLocations,
      budgetMin: request.budgetMin,
      budgetMax: request.budgetMax,
      bedrooms: request.bedrooms,
      bathrooms: request.bathrooms,
      unitFeatures: request.unitFeatures,
      buildingFeatures: request.buildingFeatures,
      petPolicy: request.petPolicy,
      acceptGuarantor: request.acceptGuarantor,
      notes: request.notes,
      moveInDateStart: request.moveInDateStart,
      moveInDateEnd: request.moveInDateEnd,
      isActive: request.isActive,
      matchCount: request.matchCount,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }
}
