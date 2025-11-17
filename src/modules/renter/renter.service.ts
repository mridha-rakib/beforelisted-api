// file: src/modules/renter/renter.service.ts

import { logger } from "@/middlewares/pino-logger";
import { ConflictException, NotFoundException } from "@/utils/app-error.utils";
import type { IRenterProfile, IRenterSavedRequest } from "./renter.interface";
import {
  RenterProfileRepository,
  RenterSavedRequestRepository,
} from "./renter.repository";
import type {
  CreateRenterProfilePayload,
  CreateSavedRequestPayload,
  RenterProfileResponse,
  SavedRequestResponse,
  UpdateRenterProfilePayload,
  UpdateSavedRequestPayload,
} from "./renter.type";

/**
 * Renter Service
 * Handles renter profile and saved requests business logic
 */
export class RenterService {
  private profileRepository: RenterProfileRepository;
  private requestRepository: RenterSavedRequestRepository;

  constructor() {
    this.profileRepository = new RenterProfileRepository();
    this.requestRepository = new RenterSavedRequestRepository();
  }

  /**
   * Create renter profile
   */
  async createRenterProfile(
    userId: string,
    payload?: CreateRenterProfilePayload
  ): Promise<IRenterProfile> {
    // Check if profile already exists
    const existingProfile = await this.profileRepository.findByUserId(userId);
    if (existingProfile) {
      throw new ConflictException("Renter profile already exists");
    }

    const profile = await this.profileRepository.create({
      userId,
      preferredLocations: payload?.preferredLocations,
      budgetMin: payload?.budgetMin,
      budgetMax: payload?.budgetMax,
      minBedrooms: payload?.minBedrooms,
      maxBedrooms: payload?.maxBedrooms,
      petPreferences: payload?.petPreferences,
      moveInFlexibilityWeeks: payload?.moveInFlexibilityWeeks || 0,
      activeRequestsCount: 0,
      totalSavedRequests: 0,
    });

    logger.info({ userId }, "Renter profile created");
    return profile;
  }

  /**
   * Get renter profile
   */
  async getRenterProfile(userId: string): Promise<RenterProfileResponse> {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException("Renter profile not found");
    }

    return this.toProfileResponse(profile);
  }

  /**
   * Update renter profile
   */
  async updateRenterProfile(
    userId: string,
    payload: UpdateRenterProfilePayload
  ): Promise<RenterProfileResponse> {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException("Renter profile not found");
    }

    const updated = await this.profileRepository.updateById(userId, payload);
    if (!updated) {
      throw new NotFoundException("Renter profile not found");
    }

    logger.info({ userId }, "Renter profile updated");
    return this.toProfileResponse(updated);
  }

  /**
   * Create saved request
   */
  async createSavedRequest(
    userId: string,
    payload: CreateSavedRequestPayload
  ): Promise<SavedRequestResponse> {
    // Check profile exists
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException("Renter profile not found");
    }

    const savedRequest = await this.requestRepository.create({
      userId,
      ...payload,
      isActive: true,
      matchCount: 0,
    });

    // Update request counts
    const activeCount =
      await this.requestRepository.countActiveByUserId(userId);
    const totalCount = await this.requestRepository.countByUserId(userId);
    await this.profileRepository.updateRequestCounts(
      userId,
      activeCount,
      totalCount
    );

    logger.info(
      { userId, requestId: savedRequest._id },
      "Saved request created"
    );
    return this.toRequestResponse(savedRequest);
  }

  /**
   * Get all saved requests for renter
   */
  async getSavedRequests(userId: string): Promise<SavedRequestResponse[]> {
    const requests = await this.requestRepository.findByUserId(userId);
    return requests.map((req) => this.toRequestResponse(req));
  }

  /**
   * Get active saved requests for renter
   */
  async getActiveSavedRequests(
    userId: string
  ): Promise<SavedRequestResponse[]> {
    const requests = await this.requestRepository.findActiveByUserId(userId);
    return requests.map((req) => this.toRequestResponse(req));
  }

  /**
   * Get single saved request
   */
  async getSavedRequest(
    userId: string,
    requestId: string
  ): Promise<SavedRequestResponse> {
    const request = await this.requestRepository.findByIdAndUserId(
      requestId,
      userId
    );
    if (!request) {
      throw new NotFoundException("Saved request not found");
    }

    return this.toRequestResponse(request);
  }

  /**
   * Update saved request
   */
  async updateSavedRequest(
    userId: string,
    requestId: string,
    payload: UpdateSavedRequestPayload
  ): Promise<SavedRequestResponse> {
    // Check ownership
    const request = await this.requestRepository.findByIdAndUserId(
      requestId,
      userId
    );
    if (!request) {
      throw new NotFoundException("Saved request not found");
    }

    const updated = await this.requestRepository.updateById(requestId, payload);
    if (!updated) {
      throw new NotFoundException("Saved request not found");
    }

    logger.info({ userId, requestId }, "Saved request updated");
    return this.toRequestResponse(updated);
  }

  /**
   * Delete saved request
   */
  async deleteSavedRequest(
    userId: string,
    requestId: string
  ): Promise<{ message: string }> {
    // Check ownership
    const request = await this.requestRepository.findByIdAndUserId(
      requestId,
      userId
    );
    if (!request) {
      throw new NotFoundException("Saved request not found");
    }

    await this.requestRepository.deleteById(requestId);

    // Update request counts
    const activeCount =
      await this.requestRepository.countActiveByUserId(userId);
    const totalCount = await this.requestRepository.countByUserId(userId);
    await this.profileRepository.updateRequestCounts(
      userId,
      activeCount,
      totalCount
    );

    logger.info({ userId, requestId }, "Saved request deleted");
    return { message: "Saved request deleted successfully" };
  }

  /**
   * Deactivate saved request
   */
  async deactivateSavedRequest(
    userId: string,
    requestId: string
  ): Promise<SavedRequestResponse> {
    // Check ownership
    const request = await this.requestRepository.findByIdAndUserId(
      requestId,
      userId
    );
    if (!request) {
      throw new NotFoundException("Saved request not found");
    }

    const updated = await this.requestRepository.deactivateRequest(requestId);
    if (!updated) {
      throw new NotFoundException("Saved request not found");
    }

    // Update request counts
    const activeCount =
      await this.requestRepository.countActiveByUserId(userId);
    const totalCount = await this.requestRepository.countByUserId(userId);
    await this.profileRepository.updateRequestCounts(
      userId,
      activeCount,
      totalCount
    );

    logger.info({ userId, requestId }, "Saved request deactivated");
    return this.toRequestResponse(updated);
  }

  /**
   * Activate saved request
   */
  async activateSavedRequest(
    userId: string,
    requestId: string
  ): Promise<SavedRequestResponse> {
    // Check ownership
    const request = await this.requestRepository.findByIdAndUserId(
      requestId,
      userId
    );
    if (!request) {
      throw new NotFoundException("Saved request not found");
    }

    const updated = await this.requestRepository.activateRequest(requestId);
    if (!updated) {
      throw new NotFoundException("Saved request not found");
    }

    // Update request counts
    const activeCount =
      await this.requestRepository.countActiveByUserId(userId);
    const totalCount = await this.requestRepository.countByUserId(userId);
    await this.profileRepository.updateRequestCounts(
      userId,
      activeCount,
      totalCount
    );

    logger.info({ userId, requestId }, "Saved request activated");
    return this.toRequestResponse(updated);
  }

  /**
   * ADMIN: Get renter profile by user ID
   */
  async adminGetRenterProfile(userId: string): Promise<RenterProfileResponse> {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException("Renter profile not found");
    }

    return this.toProfileResponse(profile);
  }

  /**
   * ADMIN: Get all saved requests for renter
   */
  async adminGetRenterRequests(
    userId: string
  ): Promise<SavedRequestResponse[]> {
    const requests = await this.requestRepository.findByUserId(userId);
    return requests.map((req) => this.toRequestResponse(req));
  }

  /**
   * ADMIN: Update renter profile
   */
  async adminUpdateRenterProfile(
    userId: string,
    payload: UpdateRenterProfilePayload
  ): Promise<RenterProfileResponse> {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException("Renter profile not found");
    }

    const updated = await this.profileRepository.updateById(userId, payload);
    if (!updated) {
      throw new NotFoundException("Renter profile not found");
    }

    logger.info(
      { userId, adminAction: true },
      "Renter profile updated by admin"
    );
    return this.toProfileResponse(updated);
  }

  /**
   * ADMIN: View saved request details
   */
  async adminGetSavedRequest(requestId: string): Promise<SavedRequestResponse> {
    const request = await this.requestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException("Saved request not found");
    }

    return this.toRequestResponse(request);
  }

  /**
   * ADMIN: Deactivate saved request
   */
  async adminDeactivateSavedRequest(
    requestId: string
  ): Promise<SavedRequestResponse> {
    const request = await this.requestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException("Saved request not found");
    }

    const updated = await this.requestRepository.deactivateRequest(requestId);
    if (!updated) {
      throw new NotFoundException("Saved request not found");
    }

    // Update request counts
    const userId = request.userId;
    const activeCount =
      await this.requestRepository.countActiveByUserId(userId);
    const totalCount = await this.requestRepository.countByUserId(userId);
    await this.profileRepository.updateRequestCounts(
      userId,
      activeCount,
      totalCount
    );

    logger.info(
      { requestId, adminAction: true },
      "Saved request deactivated by admin"
    );
    return this.toRequestResponse(updated);
  }

  /**
   * ADMIN: Delete saved request
   */
  async adminDeleteSavedRequest(
    requestId: string
  ): Promise<{ message: string }> {
    const request = await this.requestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException("Saved request not found");
    }

    await this.requestRepository.deleteById(requestId);

    // Update request counts
    const userId = request.userId;
    const activeCount =
      await this.requestRepository.countActiveByUserId(userId);
    const totalCount = await this.requestRepository.countByUserId(userId);
    await this.profileRepository.updateRequestCounts(
      userId,
      activeCount,
      totalCount
    );

    logger.info(
      { requestId, adminAction: true },
      "Saved request deleted by admin"
    );
    return { message: "Saved request deleted successfully" };
  }

  /**
   * Convert profile to response
   */
  private toProfileResponse(profile: IRenterProfile): RenterProfileResponse {
    return {
      _id: profile._id.toString(),
      userId: profile.userId,
      preferredLocations: profile.preferredLocations,
      budgetMin: profile.budgetMin,
      budgetMax: profile.budgetMax,
      minBedrooms: profile.minBedrooms,
      maxBedrooms: profile.maxBedrooms,
      petPreferences: profile.petPreferences,
      moveInFlexibilityWeeks: profile.moveInFlexibilityWeeks,
      activeRequestsCount: profile.activeRequestsCount,
      totalSavedRequests: profile.totalSavedRequests,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  /**
   * Convert request to response
   */
  private toRequestResponse(
    request: IRenterSavedRequest
  ): SavedRequestResponse {
    return {
      _id: request._id.toString(),
      userId: request.userId,
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
