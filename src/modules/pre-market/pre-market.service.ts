// file: src/modules/pre-market/pre-market.service.ts

import { env } from "@/env";
import { SYSTEM_DEFAULT_AGENT } from "@/constants/app.constants";
import { logger } from "@/middlewares/pino-logger";
import { NotificationService } from "@/modules/notification/notification.service";
import { randomInt } from "crypto";

import type { NotificationType } from "@/modules/notification/notification.interface";
import { emailService } from "@/services/email.service";
import { ExcelService } from "@/services/excel.service";
import type { PaginatedResponse, PaginationQuery } from "@/ts/pagination.types";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@/utils/app-error.utils";
import { PaginationHelper } from "@/utils/pagination-helper";
import { Types } from "mongoose";
import type { IAgentProfile } from "../agent/agent.interface";
import { AgentProfileRepository } from "../agent/agent.repository";
import type { IGrantAccessRequest } from "../grant-access/grant-access.model";
import { GrantAccessRepository } from "../grant-access/grant-access.repository";
import { PaymentService } from "../payment/payment.service";
import { RenterRepository } from "../renter/renter.repository";
import { UserRepository } from "../user/user.repository";
import { preMarketNotifier, PreMarketNotifier } from "./pre-market-notifier";
import type { IPreMarketRequest } from "./pre-market.model";
import { PreMarketRepository } from "./pre-market.repository";
import {
  AdminAgentRequestSummary,
  AdminPreMarketPaginatedResponse,
  AdminPreMarketRequestItem,
  AdminRenterInfo,
  AgentRequestDetail,
  PreMarketScope,
} from "./pre-market.type";

type NormalAgentListingResponse = Record<string, any> & {
  renterInfo: Record<string, any> | null;
  accessType: string;
  canRequestAccess: boolean;
  requestAccessMessage?: string;
};

type AgentGrantAccessStatus =
  | "Available"
  | "requested"
  | "approved"
  | "pending"
  | "paid"
  | "free"
  | "rejected";

const DEFAULT_REGISTERED_AGENT_EMAIL = SYSTEM_DEFAULT_AGENT.email;
const DEFAULT_REGISTERED_AGENT_NAME = SYSTEM_DEFAULT_AGENT.fullName;
const DEFAULT_REFERRAL_AGENT_NAME = SYSTEM_DEFAULT_AGENT.fullName;

export class PreMarketService {
  private readonly preMarketRepository: PreMarketRepository;
  private readonly grantAccessRepository: GrantAccessRepository;
  private renterRepository: RenterRepository;
  private agentRepository: AgentProfileRepository;
  private userRepository: UserRepository;
  private readonly excelService: ExcelService;

  private readonly paymentService: PaymentService;
  private readonly notifier: PreMarketNotifier;
  private readonly notificationService: NotificationService;
  private defaultReferralAgentCache?: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
    referralCode: string | null;
  };

  constructor() {
    this.preMarketRepository = new PreMarketRepository();
    this.grantAccessRepository = new GrantAccessRepository();
    this.agentRepository = new AgentProfileRepository();
    this.paymentService = new PaymentService();
    this.notifier = new PreMarketNotifier();
    this.notificationService = new NotificationService();
    this.renterRepository = new RenterRepository();
    this.userRepository = new UserRepository();
    this.excelService = new ExcelService();
  }

  private async getDefaultReferralAgent(): Promise<{
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
    referralCode: string | null;
  }> {
    if (this.defaultReferralAgentCache) {
      return this.defaultReferralAgentCache;
    }

    const fallback = {
      id: "",
      fullName: DEFAULT_REFERRAL_AGENT_NAME,
      email: DEFAULT_REGISTERED_AGENT_EMAIL,
      phoneNumber: null,
      referralCode: null,
    };

    const user = await this.userRepository.findByEmail(
      DEFAULT_REGISTERED_AGENT_EMAIL,
    );

    if (!user) {
      this.defaultReferralAgentCache = fallback;
      return fallback;
    }

    const resolved = {
      id: user._id?.toString() || "",
      fullName: user.fullName || DEFAULT_REFERRAL_AGENT_NAME,
      email: user.email || DEFAULT_REGISTERED_AGENT_EMAIL,
      phoneNumber: user.phoneNumber ?? null,
      referralCode: user.referralCode ?? null,
    };

    this.defaultReferralAgentCache = resolved;
    return resolved;
  }

  private resolveGrantAccessStatus(
    grantAccess: IGrantAccessRequest | null,
    hasGrantAccess: boolean,
  ): AgentGrantAccessStatus {
    if (hasGrantAccess) {
      return "free";
    }

    if (!grantAccess) {
      return "Available";
    }

    if (grantAccess.status === "free") {
      return "free";
    }

    if (grantAccess.status === "rejected") {
      return "rejected";
    }

    if (grantAccess.status === "paid") {
      return "paid";
    }

    const chargeAmount =
      grantAccess.payment?.amount ??
      grantAccess.adminDecision?.chargeAmount ??
      0;
    const isChargedDecision =
      chargeAmount > 0 && grantAccess.adminDecision?.isFree !== true;

    if (grantAccess.status === "approved") {
      return isChargedDecision ? "approved" : "requested";
    }

    if (isChargedDecision) {
      return "approved";
    }

    if (grantAccess.status === "pending") {
      return "requested";
    }

    return grantAccess.status as AgentGrantAccessStatus;
  }

  private resolveAccessType(
    grantAccess: IGrantAccessRequest | null,
    hasGrantAccess: boolean,
  ): "admin-granted" | "payment-based" | "none" {
    if (hasGrantAccess) {
      return "admin-granted";
    }

    if (grantAccess?.status === "free" || grantAccess?.status === "paid") {
      return "payment-based";
    }

    return "none";
  }

  private buildAgentAccessSummary(
    grantAccess: IGrantAccessRequest | null,
    hasGrantAccess: boolean,
  ) {
    const grantAccessStatus = this.resolveGrantAccessStatus(
      grantAccess,
      hasGrantAccess,
    );
    const accessType = this.resolveAccessType(grantAccess, hasGrantAccess);
    const chargeAmountValue =
      grantAccess?.payment?.amount ??
      grantAccess?.adminDecision?.chargeAmount ??
      0;
    const hasCharge =
      chargeAmountValue > 0 && grantAccess?.adminDecision?.isFree !== true;
    const showPayment = ["approved", "free", "rejected", "paid"].includes(
      grantAccessStatus,
    );
    let paymentInfo: {
      amount: number;
      currency: string;
      status: string;
    } | null = null;

    if (showPayment && grantAccess) {
      if (grantAccessStatus === "free") {
        paymentInfo = {
          amount: grantAccess.payment?.amount ?? 0,
          currency: grantAccess.payment?.currency ?? "USD",
          status: "free",
        };
      } else if (grantAccessStatus === "rejected") {
        paymentInfo = {
          amount: grantAccess.payment?.amount ?? 0,
          currency: grantAccess.payment?.currency ?? "USD",
          status: "rejected",
        };
      } else if (grantAccessStatus === "approved") {
        paymentInfo = {
          amount: chargeAmountValue,
          currency: grantAccess.payment?.currency ?? "USD",
          status: grantAccess.payment?.paymentStatus ?? "pending",
        };
      } else if (grantAccessStatus === "paid") {
        paymentInfo = {
          amount: grantAccess.payment?.amount ?? chargeAmountValue,
          currency: grantAccess.payment?.currency ?? "USD",
          status: grantAccess.payment?.paymentStatus ?? "succeeded",
        };
      }
    }
    const chargeAmount = hasCharge ? chargeAmountValue : null;

    return {
      grantAccessStatus,
      accessType,
      canRequestAccess: grantAccessStatus === "Available",
      canSeeRenterInfo: accessType !== "none",
      grantAccessId: grantAccess?._id?.toString(),
      chargeAmount,
      payment: paymentInfo,
      showPayment,
    };
  }

  async getAgentAccessSummary(agentId: string, requestId: string) {
    const agent = await this.agentRepository.findByUserId(agentId);
    const hasGrantAccess = agent?.hasGrantAccess === true;
    let grantAccess = await this.grantAccessRepository.findByAgentAndRequest(
      agentId,
      requestId,
    );

    const grantAccessId = grantAccess?._id;
    if (
      grantAccess &&
      grantAccess.payment?.paymentStatus === "pending" &&
      grantAccess.payment.stripePaymentIntentId
    ) {
      try {
        await this.paymentService.reconcilePaymentIntent(
          grantAccess.payment.stripePaymentIntentId,
        );
        grantAccess = await this.grantAccessRepository.findByAgentAndRequest(
          agentId,
          requestId,
        );
      } catch (error) {
        logger.warn(
          { error, grantAccessId },
          "Failed to refresh payment status",
        );
      }
    }

    return this.buildAgentAccessSummary(grantAccess, hasGrantAccess);
  }

  async createRequest(
    renterId: string,
    payload: {
      movingDateRange: { earliest: Date; latest: Date };
      priceRange: { min: number; max: number };
      locations: { borough: string; neighborhoods: string[] }[];
      bedrooms?: string[];
      bathrooms: string[];
      unitFeatures?: any;
      buildingFeatures?: any;
      petPolicy?: any;
      guarantorRequired?: any;
      preferences?: string[];
      shareConsent?: boolean;
      scope?: PreMarketScope;
    },
  ): Promise<IPreMarketRequest> {
    const earliest = new Date(payload.movingDateRange.earliest);
    const latest = new Date(payload.movingDateRange.latest);

    if (earliest >= latest) {
      throw new BadRequestException(
        "Invalid date range: earliest must be before latest",
      );
    }

    if (payload.priceRange.min > payload.priceRange.max) {
      throw new BadRequestException(
        "Invalid price range: min must be less than max",
      );
    }

    const renter = await this.renterRepository.findRenterWithReferrer(renterId);
    if (!renter) {
      throw new NotFoundException("Renter not found");
    }

    if (
      renter.registrationType === "agent_referral" &&
      renter.referredByAgentId
    ) {
      const referredAgent =
        typeof renter.referredByAgentId === "object"
          ? renter.referredByAgentId
          : null;
      const referredAgentId =
        typeof renter.referredByAgentId === "object" &&
        renter.referredByAgentId?._id
          ? renter.referredByAgentId._id.toString()
          : typeof renter.referredByAgentId === "string"
            ? renter.referredByAgentId
            : null;
      const referredAgentName =
        referredAgent?.fullName || DEFAULT_REFERRAL_AGENT_NAME;

      if (referredAgentId) {
        const agentProfile =
          await this.agentRepository.findByUserId(referredAgentId);
        if (agentProfile?.acceptingRequests === false) {
          let blockedAgentName = referredAgentName;
          if (!blockedAgentName || blockedAgentName === DEFAULT_REFERRAL_AGENT_NAME) {
            const referredAgentUser =
              await this.userRepository.findById(referredAgentId);
            if (referredAgentUser?.fullName) {
              blockedAgentName = referredAgentUser.fullName;
            }
          }

          throw new BadRequestException(
            `New renter requests are temporarily unavailable for ${blockedAgentName} due to current capacity. Please check back later and submit your request again.`,
          );
        }
      }
    }

    const activeListingCount =
      await this.preMarketRepository.countActiveByRenterId(renterId);

    if (activeListingCount >= 1) {
      throw new BadRequestException(
        "You can have one active request at a time.",
      );
    }

    const requestNumber = activeListingCount + 1; // will be 1 when single limit enforced
    const requestName = `BeforeListed-${requestNumber}`;
    const requestId = await this.generateUniqueRequestId();
    const shareConsent = payload.shareConsent === true;
    const scope = payload.scope ?? "Upcoming";
    const referralAgentId =
      await this.resolveRegisteredAgentIdFromRenter(renter);
    if (renter.registrationType === "agent_referral" && !referralAgentId) {
      throw new BadRequestException(
        "Referred agent is required to create this request",
      );
    }

    // Create request
    const request = await this.preMarketRepository.create({
      requestId,
      requestName,
      requestNumber,
      renterId,
      movingDateRange: payload.movingDateRange,
      priceRange: payload.priceRange,
      locations: payload.locations,
      bedrooms: payload.bedrooms || [],
      bathrooms: payload.bathrooms,
      unitFeatures: payload.unitFeatures || {},
      buildingFeatures: payload.buildingFeatures || {},
      petPolicy: payload.petPolicy || {},
      preferences: payload.preferences || [],
      guarantorRequired: payload.guarantorRequired || {},
      shareConsent,
      scope,
      visibility: "PRIVATE",
      ...(referralAgentId ? { referralAgentId } : {}),
      isActive: true,
      isDeleted: false,
      status: "Available",
      viewedBy: {
        grantAccessAgents: [],
        normalAgents: [],
      },
    });

    // Send notifications
    this.sendNotifications(request, renterId).catch((error) => {
      logger.error(
        { error, requestId: request._id },
        "Failed to send notifications (non-blocking - request already created)",
      );
    });

    await this.createRenterNotification({
      recipientId: renterId,
      title: "Pre-market request submitted",
      message: `We received your new request "${request.requestName}". We'll follow up if an agent is matched.`,
      type: "success",
      notificationType: "pre_market_request_created",
      relatedEntityId: request._id?.toString(),
      actionUrl: `${env.CLIENT_URL}/pre-market/my-requests`,
      actionData: {
        requestId: request.requestId,
      },
    }).catch((error) => {
      logger.error(
        { error, renterId },
        "Failed to create renter notification for new request",
      );
    });

    this.updateConsolidatedExcel().catch((error) => {
      logger.error({ error }, "Consolidated Excel update failed");
    });

    return request;
  }

  private async sendNotifications(
    request: any,
    renterId: string,
  ): Promise<void> {
    const renter = await this.renterRepository.findRenterWithReferrer(renterId);

    if (!renter) {
      logger.warn(
        { renterId, requestId: request._id },
        "Renter not found for notification",
      );
      return;
    }

    const resolvedRenterId = renter.userId?._id
      ? renter.userId._id.toString()
      : renter.userId.toString();

    let referringAgentEmail: string | undefined;
    let referringAgentName: string | undefined;
    if (renter.registrationType === "agent_referral") {
      const referredAgent = renter.referredByAgentId;
      referringAgentEmail =
        typeof referredAgent === "object" && referredAgent?.email
          ? referredAgent.email
          : undefined;
      referringAgentName =
        typeof referredAgent === "object" && referredAgent?.fullName
          ? referredAgent.fullName
          : undefined;
    }

    const renterData = {
      renterId: resolvedRenterId,
      renterName: renter.fullName,
      renterEmail: renter.email,
      renterPhone: renter.phoneNumber,
      referringAgentEmail,
      referringAgentName,
    };

    await preMarketNotifier.notifyNewRequest(request, renterData);

    logger.info(
      { requestId: request._id },
      "✅ All notifications sent successfully",
    );
  }

  private async generateUniqueRequestId(): Promise<string> {
    const maxAttempts = 50;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const sixDigitNumber = randomInt(100000, 1000000);
      const candidate = `R-${sixDigitNumber}`;

      const exists =
        await this.preMarketRepository.findByRequestIdIncludingDeleted(
          candidate,
        );
      if (!exists) {
        return candidate;
      }
    }

    throw new ConflictException(
      "Failed to generate unique request ID. Please try again.",
    );
  }

  async getAllRequests(
    query: PaginationQuery,
    agentId: string,
  ): Promise<PaginatedResponse<IPreMarketRequest>> {
    const agent = await this.agentRepository.findByUserId(agentId);
    if (!agent) {
      throw new NotFoundException("Agent profile not found");
    }
    const hasGrantAccess = agent?.hasGrantAccess === true;
    const visibilityFilter = await this.buildRequestVisibilityFilterForAgent(
      agentId,
    );
    const cutoffFilter = this.buildAgentVisibilityFilter(agent);
    const combinedFilters = this.mergeFilters([
      visibilityFilter,
      cutoffFilter,
    ]);

    const paginated = await this.preMarketRepository.findAllWithPagination(
      query,
      combinedFilters,
    );

    const requestIds = paginated.data
      .map((request) => request._id?.toString())
      .filter(Boolean);

    const grantAccessRecords =
      await this.grantAccessRepository.findByAgentIdAndRequestIds(
        agentId,
        requestIds as string[],
      );

    const grantAccessByRequestId = new Map(
      grantAccessRecords.map((record) => [
        record.preMarketRequestId.toString(),
        record,
      ]),
    );

    const enrichedData = await Promise.all(
      paginated.data.map(async (request) => {
        const grantAccess = request._id
          ? grantAccessByRequestId.get(request._id.toString()) || null
          : null;
        const accessSummary = this.buildAgentAccessSummary(
          grantAccess,
          hasGrantAccess,
        );
        const isMatched =
          grantAccess &&
          (grantAccess.status === "free" || grantAccess.status === "paid");
        const isRejected =
          !hasGrantAccess && grantAccess?.status === "rejected";
        const hasRequestedAccess =
          !hasGrantAccess &&
          grantAccess &&
          grantAccess.status !== "free" &&
          grantAccess.status !== "paid" &&
          grantAccess.status !== "rejected";
        const listingStatus = isMatched
          ? "matched"
          : isRejected
            ? "rejected"
            : hasRequestedAccess
              ? "requested"
              : request.status;
        const referralInfo = request.renterId
          ? await this.getReferralInfoForRenter(request.renterId.toString())
          : null;

        return {
          ...request,
          referralInfo,
          status: accessSummary.grantAccessStatus,
          listingStatus,
          grantAccessStatus: accessSummary.grantAccessStatus,
          grantAccessId: accessSummary.grantAccessId,
          accessType: accessSummary.accessType,
          canRequestAccess: accessSummary.canRequestAccess,
        };
      }),
    );

    return {
      ...paginated,
      data: enrichedData,
    } as any;
  }

  async getRenterRequests(
    renterId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResponse<IPreMarketRequest>> {
    const result = this.preMarketRepository.findByRenterId(renterId, query);
    return result;
  }

  async getRequestById(requestId: string): Promise<IPreMarketRequest> {
    const request = await this.preMarketRepository.findById(requestId);

    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    return request.toObject ? request.toObject() : request;
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
    payload: any,
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

    const changedFields = this.buildChangedFieldsSummary(request, payload);

    // Update
    const updated = await this.preMarketRepository.updateById(
      requestId,
      payload as Partial<IPreMarketRequest>,
    );

    logger.info({ renterId }, `Pre-market request updated: ${requestId}`);

    const updatedAt = updated?.updatedAt ?? new Date();
    this.notifier
      .notifyAgentsAboutUpdatedRequest(
        updated || request,
        changedFields,
        updatedAt,
      )
      .catch((error) => {
        logger.error(
          { error, requestId: request._id },
          "Failed to send update notifications (non-blocking)",
        );
      });

    return updated!;
  }

  private async notifyRegisteredAgentRequestClosed(
    request: IPreMarketRequest,
    reason: string,
    closedAt: Date,
  ): Promise<void> {
    const renter = await this.renterRepository.findRenterWithReferrer(
      request.renterId.toString(),
    );

    if (!renter) {
      logger.warn(
        { requestId: request._id },
        "Renter not found for request closed alert",
      );
      return;
    }

    let agentEmail = DEFAULT_REGISTERED_AGENT_EMAIL;
    let agentName = DEFAULT_REGISTERED_AGENT_NAME;

    if (
      renter.registrationType === "agent_referral" &&
      renter.referredByAgentId
    ) {
      const referredAgent = renter.referredByAgentId;
      if (typeof referredAgent === "object") {
        if (referredAgent.email) {
          agentEmail = referredAgent.email;
        }
        if (referredAgent.fullName) {
          agentName = referredAgent.fullName;
        }
      }
    }

    const referredAgentId =
      renter.registrationType === "agent_referral" &&
      renter.referredByAgentId &&
      typeof renter.referredByAgentId === "object" &&
      "_id" in renter.referredByAgentId
        ? renter.referredByAgentId._id.toString()
        : undefined;
    const shouldNotify = await this.isAgentEmailSubscriptionEnabled(
      agentEmail,
      referredAgentId,
    );
    if (!shouldNotify) {
      logger.info(
        { email: agentEmail },
        "Agent email subscription disabled; skipping request closed alert",
      );
      return;
    }

    const adminEmail = env.ADMIN_EMAIL;
    const ccEmails = [adminEmail]
      .filter((email): email is string => Boolean(email))
      .map((email) => email.trim())
      .filter(
        (email, index, items) =>
          items.findIndex(
            (item) => item.toLowerCase() === email.toLowerCase(),
          ) === index,
      )
      .filter((email) => email.toLowerCase() !== agentEmail.toLowerCase());

    const requestId = request.requestId || request._id?.toString() || "";

    await emailService.sendRenterRequestClosedAgentAlert({
      to: agentEmail,
      agentName,
      requestId,
      reason,
      closedAt: this.formatEasternTime(closedAt),
      cc: ccEmails.length > 0 ? ccEmails : undefined,
    });
  }

  private async createRenterNotification(payload: {
    recipientId: string | Types.ObjectId;
    title: string;
    message: string;
    notificationType: NotificationType;
    type?: "info" | "warning" | "success" | "alert";
    relatedEntityId?: string;
    actionUrl?: string;
    actionData?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.notificationService.createNotification({
        recipientId: payload.recipientId,
        recipientRole: "Renter",
        title: payload.title,
        message: payload.message,
        type: payload.type ?? "info",
        notificationType: payload.notificationType,
        relatedEntityType: "Request",
        relatedEntityId: payload.relatedEntityId,
        actionUrl: payload.actionUrl,
        actionData: payload.actionData,
      });
    } catch (error) {
      logger.error(
        {
          error,
          renterId: payload.recipientId,
          notificationType: payload.notificationType,
        },
        "Failed to create renter notification",
      );
    }
  }

  private normalizeUserId(
    id?: string | Types.ObjectId | { _id?: string | Types.ObjectId },
  ): string | null {
    if (!id) {
      return null;
    }

    if (typeof id === "string") {
      return id;
    }

    if (id instanceof Types.ObjectId) {
      return id.toString();
    }

    if (typeof id === "object") {
      if ("_id" in id && id._id) {
        return this.normalizeUserId(id._id as any);
      }

      if ("userId" in id && id.userId) {
        return this.normalizeUserId(id.userId as any);
      }
    }

    return null;
  }

  private async resolveRegisteredAgentIdFromRenter(
    renter: any,
  ): Promise<string | null> {
    if (!renter) {
      return null;
    }

    if (renter.registrationType === "agent_referral") {
      return this.normalizeUserId(renter.referredByAgentId);
    }

    const defaultAgent = await this.getDefaultReferralAgent();
    return defaultAgent.id || null;
  }

  private async resolveRegisteredAgentIdForRequest(
    request: IPreMarketRequest,
  ): Promise<string | null> {
    const fromRequest = this.normalizeUserId(
      (request as unknown as { referralAgentId?: string | Types.ObjectId })
        .referralAgentId,
    );
    if (fromRequest) {
      return fromRequest;
    }

    const renter = await this.renterRepository.findRenterWithReferrer(
      request.renterId.toString(),
    );
    if (!renter) {
      return null;
    }

    return this.resolveRegisteredAgentIdFromRenter(renter);
  }

  private mergeFilters(filters: Array<Record<string, any>>): Record<string, any> {
    const active = filters.filter(
      (filter) => filter && Object.keys(filter).length > 0,
    );
    if (active.length === 0) {
      return {};
    }
    if (active.length === 1) {
      return active[0];
    }
    return { $and: active };
  }

  private buildLockVisibilityFilter(agentId: string): Record<string, any> {
    return {
      $or: [
        { lockedByAgentId: { $exists: false } },
        { lockedByAgentId: null },
        { lockedByAgentId: agentId },
      ],
    };
  }

  private isRequestLockedForOtherAgent(
    agentId: string,
    request: IPreMarketRequest,
  ): boolean {
    const lockOwner = this.normalizeUserId(
      (request as unknown as { lockedByAgentId?: string | Types.ObjectId })
        .lockedByAgentId,
    );

    return Boolean(lockOwner && lockOwner !== agentId);
  }

  private async buildRequestVisibilityFilterForAgent(
    agentId: string,
  ): Promise<Record<string, any>> {
    const sharedLockFilter = this.buildLockVisibilityFilter(agentId);

    return {
      $or: [
        {
          $and: [{ visibility: "PRIVATE" }, { referralAgentId: agentId }],
        },
        {
          $and: [{ visibility: "SHARED" }, sharedLockFilter],
        },
      ],
    };
  }

  public async ensureAgentCanViewRequestVisibility(
    agentId: string,
    request: IPreMarketRequest,
  ): Promise<void> {
    const visibility =
      (request as unknown as { visibility?: string }).visibility ?? "PRIVATE";
    if (visibility === "SHARED") {
      if (!this.isRequestLockedForOtherAgent(agentId, request)) {
        return;
      }

      throw new ForbiddenException("This request is not available");
    }

    if (this.isRequestLockedForOtherAgent(agentId, request)) {
      throw new ForbiddenException("This request is not available");
    }

    const registeredAgentId =
      await this.resolveRegisteredAgentIdForRequest(request);
    if (registeredAgentId && registeredAgentId === agentId) {
      return;
    }

    throw new ForbiddenException("This request is not available");
  }

  private async notifyRenterAboutAdminDeletion(
    request: IPreMarketRequest,
  ): Promise<void> {
    const renterIdValue =
      typeof request.renterId === "string"
        ? request.renterId
        : request.renterId?.toString();

    if (!renterIdValue) {
      logger.warn(
        { requestId: request._id },
        "Invalid renter ID for admin deletion notification",
      );
      return;
    }

    const renter =
      await this.renterRepository.findRenterWithReferrer(renterIdValue);
    if (!renter) {
      logger.warn(
        { renterId: renterIdValue },
        "Renter not found for admin deletion notification",
      );
      return;
    }

    const listingTitle =
      request.requestName || request.requestId || "pre-market listing";

    const renterUserId =
      this.normalizeUserId(renter.userId ?? renterIdValue) ?? renterIdValue;

    await this.createRenterNotification({
      recipientId: renterUserId,
      title: "Pre-market listing removed",
      message: `Admin deleted your pre-market listing "${listingTitle}". Contact support if you need help reposting.`,
      type: "warning",
      notificationType: "pre_market_listing_deleted_by_admin",
      relatedEntityId: request._id?.toString(),
      actionUrl: `${env.CLIENT_URL}/pre-market/my-requests`,
      actionData: {
        requestId: request.requestId,
        listingTitle,
      },
    });
  }

  private async notifyRenterRequestExpired(
    request: IPreMarketRequest,
  ): Promise<void> {
    const renter = await this.renterRepository.findRenterWithReferrer(
      request.renterId.toString(),
    );

    if (!renter) {
      logger.warn(
        { requestId: request._id },
        "Renter not found for request expiration notice",
      );
      return;
    }

    if (!renter.email) {
      logger.warn(
        { requestId: request._id },
        "Renter email missing for request expiration notice",
      );
      return;
    }

    await emailService.sendRenterRequestExpiredNotification({
      to: renter.email,
      renterName: renter.fullName,
    });
  }

  private async isAgentEmailSubscriptionEnabled(
    agentEmail: string,
    agentUserId?: string,
  ): Promise<boolean> {
    if (!agentEmail) {
      return false;
    }

    const lookupUserId = agentUserId
      ? agentUserId
      : (await this.userRepository.findByEmail(agentEmail))?._id?.toString();

    if (!lookupUserId) {
      return true;
    }

    const agentProfile = await this.agentRepository.findByUserId(lookupUserId);
    if (!agentProfile) {
      return true;
    }

    return agentProfile.emailSubscriptionEnabled !== false;
  }

  private buildChangedFieldsSummary(
    request: IPreMarketRequest,
    payload: Record<string, unknown>,
  ): string[] {
    const fieldLabels: Record<string, string> = {
      movingDateRange: "Move date range",
      priceRange: "Price range",
      locations: "Locations",
      bedrooms: "Bedrooms",
      bathrooms: "Bathrooms",
      unitFeatures: "Unit features",
      buildingFeatures: "Building features",
      petPolicy: "Pet policy",
      guarantorRequired: "Guarantor requirement",
      preferences: "Preferences",
      description: "Description",
    };

    const changedFields = Object.keys(payload).reduce<string[]>(
      (accumulator, key) => {
        const originalValue = (request as unknown as Record<string, unknown>)[
          key
        ];
        const nextValue = payload[key];
        if (!this.areValuesEqual(originalValue, nextValue)) {
          accumulator.push(fieldLabels[key] || this.humanizeFieldName(key));
        }
        return accumulator;
      },
      [],
    );

    return Array.from(new Set(changedFields));
  }

  private areValuesEqual(valueA: unknown, valueB: unknown): boolean {
    return (
      JSON.stringify(this.normalizeValue(valueA)) ===
      JSON.stringify(this.normalizeValue(valueB))
    );
  }

  private normalizeValue(value: unknown): unknown {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeValue(item));
    }

    if (value && typeof value === "object") {
      return Object.keys(value as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((accumulator, key) => {
          accumulator[key] = this.normalizeValue(
            (value as Record<string, unknown>)[key],
          );
          return accumulator;
        }, {});
    }

    return value;
  }

  private humanizeFieldName(field: string): string {
    return field
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/^./, (match) => match.toUpperCase());
  }

  private formatEasternTime(value: Date): string {
    return value.toLocaleString("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
  }

  private getAgentVisibilityCutoff(agent: IAgentProfile): Date | null {
    if (!agent || agent.acceptingRequests !== false) {
      return null;
    }

    return agent.acceptingRequestsToggledAt || agent.updatedAt || new Date();
  }

  private buildAgentVisibilityFilter(
    agent: IAgentProfile,
  ): Record<string, any> {
    const cutoff = this.getAgentVisibilityCutoff(agent);
    if (!cutoff) {
      return {};
    }

    return {
      createdAt: { $lte: cutoff },
    };
  }

  public ensureAgentCanViewRequest(
    agent: IAgentProfile,
    request: IPreMarketRequest,
  ): void {
    const cutoff = this.getAgentVisibilityCutoff(agent);
    if (!cutoff || !request?.createdAt) {
      return;
    }

    const createdAt = new Date(request.createdAt);
    if (createdAt > cutoff) {
      throw new ForbiddenException("This request is not available");
    }
  }

  private async deleteGrantAccessRecords(requestId: string): Promise<void> {
    try {
      const result =
        await this.grantAccessRepository.deleteByPreMarketRequestId(requestId);
      const deletedCount = (result as any)?.deletedCount ?? 0;
      if (deletedCount > 0) {
        logger.info(
          { requestId, deletedCount },
          "Deleted grant access records for pre-market request",
        );
      }
    } catch (error) {
      logger.error(
        { error, requestId },
        "Failed to delete grant access records for pre-market request",
      );
    }
  }

  // ============================================
  // DELETE REQUEST (RENTER ONLY)
  // ============================================

  async deleteRequest(renterId: string, requestId: string): Promise<void> {
    const request = await this.getRequestById(requestId);

    if (request.renterId.toString() !== renterId) {
      throw new BadRequestException("Cannot delete others' requests");
    }

    const deleted = await this.preMarketRepository.deleteById(requestId);
    if (!deleted) {
      throw new NotFoundException("Pre-market request not found");
    }

    await this.deleteGrantAccessRecords(requestId);

    logger.info({ renterId }, `Pre-market request deleted: ${requestId}`);

    this.notifyRegisteredAgentRequestClosed(
      request,
      "Deleted by Renter",
      new Date(),
    ).catch((error) => {
      logger.error(
        { error, requestId: request._id },
        "Failed to send request closed alert (non-blocking)",
      );
    });

    this.updateConsolidatedExcel().catch((error) => {
      logger.error({ error }, "Consolidated Excel update failed");
    });
  }

  async deleteRequestsByRenterId(renterId: string): Promise<void> {
    const requests = await this.preMarketRepository.findAllByRenterId(renterId);

    if (!requests || requests.length === 0) {
      return;
    }

    const requestIds = requests
      .map((request) => request._id?.toString())
      .filter((id): id is string => Boolean(id));

    if (requestIds.length === 0) {
      return;
    }

    await this.preMarketRepository.deleteManyByIds(requestIds);
    await this.grantAccessRepository.deleteByPreMarketRequestIds(requestIds);

    logger.info(
      { renterId, deletedCount: requestIds.length },
      "Deleted pre-market requests after renter account deletion",
    );

    this.updateConsolidatedExcel().catch((error) => {
      logger.error(
        { error, renterId },
        "Failed to update consolidated Excel after renter cleanup",
      );
    });
  }

  async deleteAgentMatchHistory(agentId: string): Promise<void> {
    try {
      const result = await this.grantAccessRepository.deleteByAgentId(agentId);
      if (result.deletedCount && result.deletedCount > 0) {
        logger.info(
          { agentId, deletedCount: result.deletedCount },
          "Deleted agent match requests during profile removal",
        );
      }
    } catch (error) {
      logger.error(
        { agentId, error },
        "Failed to delete agent match history during profile removal",
      );
    }
  }

  // ============================================
  // VISIBILITY (AGENT-OWNED)
  // ============================================

  async toggleRequestShareVisibility(
    agentId: string,
    requestId: string,
  ): Promise<IPreMarketRequest> {
    const request = await this.getRequestById(requestId);
    const registeredAgentId =
      await this.resolveRegisteredAgentIdForRequest(request);

    if (!registeredAgentId || registeredAgentId !== agentId) {
      throw new ForbiddenException(
        "Only the registered agent can change request visibility",
      );
    }

    if (request.shareConsent !== true) {
      throw new ForbiddenException(
        "Renter consent is required to use share toggle for this request",
      );
    }

    const currentVisibility =
      (request as unknown as { visibility?: "PRIVATE" | "SHARED" }).visibility ??
      "PRIVATE";
    const nextVisibility =
      currentVisibility === "SHARED" ? "PRIVATE" : "SHARED";

    return this.updateRequestVisibility(agentId, requestId, nextVisibility);
  }

  async updateRequestVisibility(
    agentId: string,
    requestId: string,
    visibility: "PRIVATE" | "SHARED",
  ): Promise<IPreMarketRequest> {
    const request = await this.getRequestById(requestId);
    if (this.isRequestLockedForOtherAgent(agentId, request)) {
      throw new ForbiddenException(
        "Visibility cannot be changed while another agent owns this request",
      );
    }

    const registeredAgentId =
      await this.resolveRegisteredAgentIdForRequest(request);

    if (!registeredAgentId || registeredAgentId !== agentId) {
      throw new ForbiddenException(
        "Only the registered agent can change request visibility",
      );
    }

    if (request.shareConsent !== true && visibility === "SHARED") {
      throw new ForbiddenException(
        "Renter consent is required to share this request",
      );
    }

    const nextVisibility =
      visibility === "SHARED" && request.shareConsent === true
        ? "SHARED"
        : "PRIVATE";

    const updated = await this.preMarketRepository.updateById(requestId, {
      visibility: nextVisibility,
    } as Partial<IPreMarketRequest>);

    if (!updated) {
      throw new NotFoundException("Pre-market request not found");
    }

    return updated;
  }

  async expireRequests(): Promise<{
    expiredCount: number;
    deletedCount: number;
    failedCount: number;
  }> {
    const expiredRequests =
      await this.preMarketRepository.findExpiredRequests();

    if (!expiredRequests || expiredRequests.length === 0) {
      return { expiredCount: 0, deletedCount: 0, failedCount: 0 };
    }

    let deletedCount = 0;
    let failedCount = 0;

    for (const request of expiredRequests) {
      const requestId = request._id?.toString();
      if (!requestId) {
        failedCount += 1;
        logger.warn(
          { requestId: request.requestId },
          "Expired request missing id; skipping delete",
        );
        continue;
      }

      try {
        const deleted = await this.preMarketRepository.deleteById(requestId);
        if (!deleted) {
          failedCount += 1;
          logger.warn({ requestId }, "Expired request not found during delete");
          continue;
        }

        await this.deleteGrantAccessRecords(requestId);

        deletedCount += 1;

        const closedAt = new Date();
        this.notifyRenterRequestExpired(request).catch((error) => {
          logger.error(
            { error, requestId },
            "Failed to send renter expiration notice (non-blocking)",
          );
        });

        this.notifyRegisteredAgentRequestClosed(
          request,
          "Request expired.",
          closedAt,
        ).catch((error) => {
          logger.error(
            { error, requestId },
            "Failed to send request closed alert (non-blocking)",
          );
        });
      } catch (error) {
        failedCount += 1;
        logger.error(
          { error, requestId },
          "Failed to delete expired pre-market request",
        );
      }
    }

    if (deletedCount > 0) {
      this.updateConsolidatedExcel().catch((error) => {
        logger.error({ error }, "Consolidated Excel update failed");
      });
    }

    return {
      expiredCount: expiredRequests.length,
      deletedCount,
      failedCount,
    };
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

  // ============================================
  // TASK 1: GET ALL REQUESTS FOR AGENT
  // ============================================

  async getAllRequestsForAgent(
    agentId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResponse<IPreMarketRequest>> {
    const agent = await this.agentRepository.findByUserId(agentId);
    if (!agent) {
      throw new NotFoundException("Agent profile not found");
    }

    // ============================================
    // AGENTS: See ONLY matched (free/paid) listings
    // ============================================
    logger.info(
      { agentId, type: agent.hasGrantAccess ? "grant-access" : "normal" },
      "Agent fetching matched pre-market listings",
    );

    // Step 1: Get all GrantAccess records for this agent with access
    const accessRecords =
      await this.grantAccessRepository.findByAgentIdAndStatuses(agentId, [
        "free",
        "paid",
      ]);

    if (!Array.isArray(accessRecords) || accessRecords.length === 0) {
      logger.info({ agentId }, "Normal agent has no access yet");
      return PaginationHelper.buildResponse(
        [],
        0,
        (query.page as number) || 1,
        (query.limit as number) || 10,
      ) as any;
    }

    const matchTimes = accessRecords
      .map((access) => {
        const timestamp = new Date(
          access.updatedAt || access.createdAt || 0,
        ).getTime();
        return {
          requestId: access.preMarketRequestId.toString(),
          timestamp,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    const preMarketRequestIds = matchTimes.map((access) => access.requestId);
    const matchTimeByRequestId = new Map(
      matchTimes.map((access) => [access.requestId, access.timestamp]),
    );

    const listings =
      await this.preMarketRepository.findByIds(preMarketRequestIds);

    if (!listings || listings.length === 0) {
      return PaginationHelper.buildResponse(
        [],
        0,
        (query.page as number) || 1,
        (query.limit as number) || 10,
      ) as any;
    }

    const sortedListings = listings.sort((a: any, b: any) => {
      const timeA = matchTimeByRequestId.get(a._id?.toString()) ?? -1;
      const timeB = matchTimeByRequestId.get(b._id?.toString()) ?? -1;
      return timeB - timeA;
    });

    const visibleListings: IPreMarketRequest[] = [];
    for (const listing of sortedListings) {
      if (this.isRequestLockedForOtherAgent(agentId, listing)) {
        continue;
      }

      const visibility =
        (listing as unknown as { visibility?: "PRIVATE" | "SHARED" }).visibility ??
        "PRIVATE";

      if (visibility === "SHARED") {
        visibleListings.push(listing);
        continue;
      }

      const registeredAgentId =
        await this.resolveRegisteredAgentIdForRequest(listing);
      if (registeredAgentId && registeredAgentId === agentId) {
        visibleListings.push(listing);
      }
    }

    // Manual pagination - counts ONLY your filtered results
    const page = (query.page as number) || 1;
    const limit = (query.limit as number) || 10;
    const total = visibleListings.length;
    const pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedData = visibleListings.slice(startIndex, startIndex + limit);

    // Enrich with renter info
    const enrichedData = await Promise.all(
      paginatedData.map(async (request: any) => {
        const renterInfo = await this.getRenterInfoForRequest(
          request.renterId?.toString(),
        );
        return {
          ...request,
          renterInfo,
          status: "matched",
          listingStatus: "matched",
        };
      }),
    );

    // Track views
    const viewType = agent.hasGrantAccess
      ? "grantAccessAgents"
      : "normalAgents";
    await Promise.all(
      paginatedData.map((request: any) =>
        this.preMarketRepository.addAgentToViewedBy(
          request._id!.toString(),
          agentId,
          viewType,
        ),
      ),
    );

    // Return with CORRECT pagination count
    const response = PaginationHelper.buildResponse(
      enrichedData,
      total,
      page,
      limit,
    ) as any;

    return response;
  }

  // ============================================
  // TASK 2: GET SPECIFIC REQUEST FOR AGENT
  // ============================================

  async getRequestForAgent(agentId: string, requestId: string): Promise<any> {
    const agent = await this.agentRepository.findByUserId(agentId);
    if (!agent) {
      throw new ForbiddenException("Agent profile not found");
    }

    const request = await this.getRequestById(requestId);
    this.ensureAgentCanViewRequest(agent, request);
    await this.ensureAgentCanViewRequestVisibility(agentId, request);

    const enrichedRequest = await this.enrichRequestWithRenterInfo(
      request,
      agentId,
      agent.hasGrantAccess,
    );

    return enrichedRequest;
  }

  async matchRequestForAgent(
    agentId: string,
    requestId: string,
  ): Promise<IGrantAccessRequest> {
    const agent = await this.agentRepository.findByUserId(agentId);
    if (!agent || !agent.hasGrantAccess) {
      throw new ForbiddenException(
        "You do not have permission to match requests",
      );
    }

    const listingActivationCheck =
      await this.preMarketRepository.findByIdWithActivationStatus(requestId);

    if (!listingActivationCheck) {
      throw new NotFoundException("Pre-market request not found");
    }

    this.ensureAgentCanViewRequest(agent, listingActivationCheck as any);
    await this.ensureAgentCanViewRequestVisibility(
      agentId,
      listingActivationCheck as any,
    );

    if (!listingActivationCheck.isActive) {
      throw new ForbiddenException(
        "This listing is no longer accepting requests",
      );
    }

    const lockClaimed = await this.preMarketRepository.claimRequestLock(
      requestId,
      agentId,
    );
    if (!lockClaimed) {
      throw new ConflictException(
        "Another agent already matched or requested this listing",
      );
    }

    const existing = await this.grantAccessRepository.findByAgentAndRequest(
      agentId,
      requestId,
    );

    const shouldNotify =
      !existing || (existing.status !== "free" && existing.status !== "paid");

    let matchRecord: IGrantAccessRequest;
    try {
      if (existing) {
        if (existing.status === "free" || existing.status === "paid") {
          return existing;
        }

        const updated = await this.grantAccessRepository.updateById(
          existing._id.toString(),
          { status: "free" },
        );

        matchRecord = updated || existing;
      } else {
        matchRecord = await this.grantAccessRepository.create({
          preMarketRequestId: requestId,
          agentId,
          status: "free",
          createdAt: new Date(),
        });
      }
    } catch (error) {
      await this.preMarketRepository
        .releaseRequestLock(requestId, agentId)
        .catch((unlockError) => {
          logger.error(
            { unlockError, requestId, agentId },
            "Failed to release request lock after match failure",
          );
        });
      throw error;
    }

    if (shouldNotify) {
      this.notifyRenterAboutMatchedOpportunity(
        agentId,
        listingActivationCheck,
      ).catch((error) => {
        logger.error(
          { error, requestId, agentId },
          "Failed to send renter match notification (non-blocking)",
        );
      });
    }

    return matchRecord;
  }

  // ============================================
  // HELPER: FILTER VISIBILITY
  // ============================================

  private filterRequestVisibility(
    request: any,
    hasGrantAccess: boolean,
  ): IPreMarketRequest {
    if (hasGrantAccess) {
      return request;
    }

    const filtered = {
      ...request,
      renterName: undefined,
      renterEmail: undefined,
      renterPhone: undefined,
      renterId: undefined,
    };

    Object.keys(filtered).forEach((key) => {
      if (filtered[key] === undefined) {
        delete filtered[key];
      }
    });

    return filtered;
  }

  private async enrichRequestWithRenterInfo(
    request: any,
    agentId: string,
    hasGrantAccess: boolean,
  ): Promise<any> {
    const renter = await this.renterRepository.findById(
      request.renterId.toString(),
    );

    if (!renter) {
      logger.warn(
        { renterId: request.renterId, requestId: request.requestId },
        "Renter not found for request",
      );
      return request;
    }

    let referrerInfo = null;
    if (renter.referredByAgentId) {
      const referrer = await this.userRepository.findById(
        renter.referredByAgentId.toString(),
      );
      if (referrer) {
        referrerInfo = {
          referrerId: referrer._id,
          referrerName: referrer.fullName,
          referrerRole: "Agent",
          referralType: "agent_referral",
        };
      }
    } else if (renter.referredByAdminId) {
      const referrer = await this.userRepository.findById(
        renter.referredByAdminId.toString(),
      );
      if (referrer) {
        referrerInfo = {
          referrerId: referrer._id,
          referrerName: referrer.fullName,
          referrerRole: "Admin",
          referralType: "admin_referral",
        };
      }
    }
    if (!referrerInfo) {
      const defaultAgent = await this.getDefaultReferralAgent();
      referrerInfo = {
        referrerId: defaultAgent.id,
        referrerName: defaultAgent.fullName,
        referrerRole: "Agent",
        referralType: "agent_referral",
      };
    }

    const renterInfo: any = {
      renterId: renter._id,
      registrationType: renter.registrationType,
    };

    if (hasGrantAccess) {
      renterInfo.renterName = renter.fullName;
      renterInfo.renterEmail = renter.email;
      renterInfo.renterPhone = renter.phoneNumber || null;
    }

    if (referrerInfo) {
      renterInfo.referrer = referrerInfo;
    }

    return {
      ...request,
      renterInfo,
    };
  }

  async getAllRequestsForAdmin(
    query: PaginationQuery,
  ): Promise<AdminPreMarketPaginatedResponse> {
    const paginated = await this.preMarketRepository.findAllForAdmin(query);

    const enrichedData = await Promise.all(
      paginated.data.map((request) => this.enrichRequestForAdmin(request)),
    );

    return {
      ...paginated,
      data: enrichedData,
    };
  }

  async getRequestByIdForAdmin(
    requestId: string,
  ): Promise<AdminPreMarketRequestItem> {
    const request = await this.preMarketRepository.findByIdForAdmin(requestId);

    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    const enriched = await this.enrichRequestForAdmin(request);
    return enriched;
  }

  private async enrichRequestForAdmin(
    request: IPreMarketRequest,
  ): Promise<AdminPreMarketRequestItem> {
    const renter = await this.renterRepository.findRenterWithReferrer(
      request.renterId.toString(),
    );

    const renterInfo = await this.buildRenterInfo(renter);

    const agentRequestSummary = await this.getAgentRequestSummary(
      request._id!.toString(),
    );

    const agentRequests = await this.getAgentRequestDetails(
      request._id!.toString(),
    );

    return {
      ...(request.toObject ? request.toObject() : request),
      renterInfo,
      agentRequestSummary,
      agentRequests,
    } as AdminPreMarketRequestItem;
  }

  private async getAgentRequestSummary(
    preMarketRequestId: string | Types.ObjectId,
  ): Promise<AdminAgentRequestSummary> {
    const allRequests =
      await this.grantAccessRepository.findByPreMarketRequestId(
        preMarketRequestId,
      );

    if (!allRequests || allRequests.length === 0) {
      return { total: 0, approve: 0, pending: 0 };
    }

    let approve = 0;
    let pending = 0;

    for (const req of allRequests) {
      if (req.status === "free" || req.status === "paid") {
        approve += 1;
      } else if (req.status === "pending" || req.status === "approved") {
        pending += 1;
      }
    }

    return {
      total: allRequests.length,
      approve,
      pending,
    };
  }

  private async buildRenterInfo(renter: any): Promise<AdminRenterInfo> {
    if (!renter) {
      return {
        renterId: "",
        fullName: "Unknown renter",
        email: "",
        registrationType: "normal",
      };
    }

    const profileImageUrl =
      typeof renter.userId === "object" && renter.userId
        ? renter.userId.profileImageUrl || null
        : null;

    const renterInfo: AdminRenterInfo = {
      renterId: renter._id?.toString() || renter.renterId?.toString() || "",
      fullName: renter.fullName || "",
      email: renter.email || "",
      phoneNumber: renter.phoneNumber,
      profileImageUrl,
      registrationType: renter.registrationType || "normal",
    };

    if (
      renter.registrationType === "agent_referral" &&
      renter.referredByAgentId
    ) {
      const referrer =
        typeof renter.referredByAgentId === "object"
          ? renter.referredByAgentId
          : await this.userRepository.findById(
              renter.referredByAgentId.toString(),
            );

      if (referrer) {
        renterInfo.referralInfo = {
          referrerId: referrer._id?.toString() || "",
          referrerName: referrer.fullName || referrer.name || "Unknown",
          referrerEmail: referrer.email || null,
          referrerPhoneNumber: referrer.phoneNumber || null,
          referralCode: referrer.referralCode || null,
          referrerType: "AGENT",
        };
      }
    } else if (
      renter.registrationType === "admin_referral" &&
      renter.referredByAdminId
    ) {
      const referrer =
        typeof renter.referredByAdminId === "object"
          ? renter.referredByAdminId
          : await this.userRepository.findById(
              renter.referredByAdminId.toString(),
            );

      if (referrer) {
        renterInfo.referralInfo = {
          referrerId: referrer._id?.toString() || "",
          referrerName: referrer.fullName || referrer.name || "Unknown",
          referrerEmail: referrer.email || null,
          referrerPhoneNumber: referrer.phoneNumber || null,
          referralCode: referrer.referralCode || null,
          referrerType: "ADMIN",
        };
      }
    }

    if (!renterInfo.referralInfo) {
      const defaultAgent = await this.getDefaultReferralAgent();
      renterInfo.referralInfo = {
        referrerId: defaultAgent.id,
        referrerName: defaultAgent.fullName,
        referrerEmail: defaultAgent.email,
        referrerPhoneNumber: defaultAgent.phoneNumber,
        referralCode: defaultAgent.referralCode,
        referrerType: "AGENT",
      };
    }

    return renterInfo;
  }

  private async getAgentRequestDetails(
    preMarketRequestId: string,
  ): Promise<AgentRequestDetail[]> {
    const allRequests =
      await this.grantAccessRepository.findByPreMarketRequestId(
        preMarketRequestId,
      );

    if (!allRequests || allRequests.length === 0) {
      return [];
    }

    // Fetch full agent details for each request
    const requestsWithAgents = await Promise.all(
      allRequests.map(async (req: any) => {
        // Get agent user details
        const agent = await this.userRepository.findById(
          req.agentId.toString(),
        );

        // Build agent object with proper types
        const agentInfo = agent
          ? {
              agentId: agent._id?.toString() || "",
              fullName: agent.fullName || "",
              email: agent.email || "",
              phoneNumber: agent.phoneNumber || undefined,
              role: (agent.role as string) || "Agent",
              profileImageUrl: (agent.profileImageUrl || undefined) as
                | string
                | undefined,
            }
          : {
              agentId: req.agentId?.toString() || "",
              fullName: "Unknown Agent",
              email: "",
              phoneNumber: undefined,
              role: "Agent",
              profileImageUrl: undefined,
            };

        const baseStatus =
          (req.status as
            | "pending"
            | "approved"
            | "free"
            | "rejected"
            | "paid") || "pending";

        const isChargePending =
          baseStatus === "pending" &&
          req.adminDecision?.isFree === false &&
          (req.payment?.paymentStatus || (req.payment as any)?.status) ===
            "pending";

        const isChargeApplied =
          baseStatus === "pending" &&
          req.adminDecision?.isFree === false &&
          (req.payment?.amount > 0 || (req.payment as any)?.status) ===
            "pending";

        const normalizedStatus =
          baseStatus === "approved" ? "approved" : baseStatus;

        const displayStatus =
          isChargePending && isChargeApplied ? "approved" : normalizedStatus;

        const paymentInfo =
          baseStatus === "free"
            ? {
                amount: req.payment?.amount || 0,
                currency: req.payment?.currency || "USD",
                status: "free",
              }
            : req.payment
              ? {
                  amount: req.payment.amount || 0,
                  currency: req.payment.currency || "USD",
                  status: req.payment.paymentStatus || "pending",
                }
              : undefined;

        const agentRequestDetail: AgentRequestDetail = {
          _id: req._id?.toString() || "",
          agentId: req.agentId?.toString() || "",
          agent: agentInfo,
          status: displayStatus,
          requestedAt: req.createdAt || new Date(),
          payment: paymentInfo,
        };

        return agentRequestDetail;
      }),
    );

    return requestsWithAgents;
  }

  /**
   * Only shows "Match" status requests with full renter information
   */
  async getRequestsForGrantAccessAgents(
    agentId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResponse<any>> {
    const agent = await this.agentRepository.findByUserId(agentId);
    if (!agent || !agent.hasGrantAccess) {
      throw new ForbiddenException(
        "You do not have grant access to view these requests",
      );
    }

    // Get requests for this agent
    const visibilityFilter = await this.buildRequestVisibilityFilterForAgent(
      agentId,
    );
    const cutoffFilter = this.buildAgentVisibilityFilter(agent);
    const combinedFilters = this.mergeFilters([
      visibilityFilter,
      cutoffFilter,
    ]);
    const paginated = await this.preMarketRepository.findForGrantAccessAgents(
      agentId,
      query,
      combinedFilters,
    );

    // Enrich each request with full renter information
    const enrichedData = await Promise.all(
      paginated.data.map(async (request) => {
        return this.enrichRequestWithFullRenterInfo(request, agentId);
      }),
    );

    // Mark agent as having viewed these requests
    const requestIds = paginated.data.map((r) => r._id?.toString());
    await Promise.all(
      requestIds.map((requestId) =>
        this.preMarketRepository.addAgentToViewedBy(
          requestId!,
          agentId,
          "grantAccessAgents",
        ),
      ),
    );

    return {
      ...paginated,
      data: enrichedData,
    };
  }

  /**
   * Only for grant access agents (full visibility)
   */
  public async enrichRequestWithFullRenterInfo(
    request: IPreMarketRequest,
    agentId: string,
  ) {
    const renter = await this.renterRepository.findRenterWithReferrer(
      request.renterId.toString(),
    );

    if (!renter) {
      logger.warn(
        { renterId: request.renterId, requestId: request.requestId },
        "Renter not found for request",
      );
      return { ...request, renterInfo: null };
    }

    // Get referrer information if applicable
    // Note: findRenterWithReferrer already populates referredByAgentId/referredByAdminId as full User objects
    let referrerInfo = null;

    if (renter.referredByAgentId) {
      // Check if it's a populated object or just an ObjectId
      const referrer =
        typeof renter.referredByAgentId === "object" &&
        renter.referredByAgentId._id
          ? renter.referredByAgentId // Already populated
          : await this.userRepository.findById(
              renter.referredByAgentId.toString(),
            );

      if (referrer) {
        referrerInfo = {
          referrerId: referrer._id?.toString(),
          referrerName: referrer.fullName || referrer.name || "Unknown",
          referrerEmail: referrer.email ?? null,
          referrerPhoneNumber: referrer.phoneNumber ?? null,
          referralCode: referrer.referralCode ?? null,
          referrerRole: "Agent",
          referralType: "agent_referral",
        };
      }
    } else if (renter.referredByAdminId) {
      // Check if it's a populated object or just an ObjectId
      const referrer =
        typeof renter.referredByAdminId === "object" &&
        renter.referredByAdminId._id
          ? renter.referredByAdminId // Already populated
          : await this.userRepository.findById(
              renter.referredByAdminId.toString(),
            );

      if (referrer) {
        referrerInfo = {
          referrerId: referrer._id?.toString(),
          referrerName: referrer.fullName || referrer.name || "Unknown",
          referrerEmail: referrer.email ?? null,
          referrerPhoneNumber: referrer.phoneNumber ?? null,
          referralCode: referrer.referralCode ?? null,
          referrerRole: "Admin",
          referralType: "admin_referral",
        };
      }
    }

    if (!referrerInfo) {
      const defaultAgent = await this.getDefaultReferralAgent();
      referrerInfo = {
        referrerId: defaultAgent.id,
        referrerName: defaultAgent.fullName,
        referrerEmail: defaultAgent.email,
        referrerPhoneNumber: defaultAgent.phoneNumber,
        referralCode: defaultAgent.referralCode,
        referrerRole: "Agent",
        referralType: "agent_referral",
      };
    }

    const profileImageUrl =
      (typeof renter.userId === "object" && renter.userId
        ? renter.userId.profileImageUrl
        : renter.profileImageUrl) || null;

    // Build full renter info
    const renterInfo = {
      renterId: renter._id?.toString(),
      renterName: renter.fullName,
      renterEmail: renter.email,
      renterPhone: renter.phoneNumber,
      profileImage: profileImageUrl,
      registrationType: renter.registrationType,
      referrer: referrerInfo,
    };

    // Return enriched request
    return {
      ...request,
      renterInfo,
    };
  }

  /**
   * Now returns listings WITH or WITHOUT renter info based on access
   */
  async getAvailableRequestsForNormalAgents(
    agentId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResponse<NormalAgentListingResponse>> {
    const agent = await this.agentRepository.findByUserId(agentId);
    if (!agent) {
      throw new ForbiddenException("Agent profile not found");
    }

    // Get all Available status requests
    const visibilityFilter = await this.buildRequestVisibilityFilterForAgent(
      agentId,
    );
    const cutoffFilter = this.buildAgentVisibilityFilter(agent);
    const combinedFilters = this.mergeFilters([
      visibilityFilter,
      cutoffFilter,
    ]);
    const paginated =
      await this.preMarketRepository.findAvailableForNormalAgents(
        agentId,
        query,
        combinedFilters,
      );

    // For each request, conditionally include renter info
    const enrichedData = await Promise.all(
      paginated.data.map(async (request) => {
        const accessCheck = await this.canAgentSeeRenterInfo(
          agentId,
          request._id!.toString(),
        );

        if (accessCheck.canSee) {
          const enriched = await this.enrichRequestWithFullRenterInfo(
            request,
            agentId,
          );
          return {
            ...enriched,
            renterInfo: enriched.renterInfo,
            accessType: accessCheck.accessType,
            canRequestAccess: false,
          };
        } else {
          return {
            ...request,
            renterInfo: null,
            accessType: "none",
            canRequestAccess: true,
            requestAccessMessage:
              "Request grant access to see renter information",
          };
        }
      }),
    );

    // Mark as viewed
    const requestIds = paginated.data.map((r) => r._id?.toString());
    await Promise.all(
      requestIds.map((requestId) =>
        this.preMarketRepository.addAgentToViewedBy(
          requestId!,
          agentId,
          "normalAgents",
        ),
      ),
    );

    return {
      ...paginated,
      data: enrichedData,
    };
  }

  async getRequestDetailsForAgent(
    agentId: string,
    requestId: string,
  ): Promise<any> {
    const request = await this.preMarketRepository.getRequestById(requestId);
    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    // Get agent
    const agent = await this.agentRepository.findByUserId(agentId);
    if (!agent) {
      throw new ForbiddenException("Agent profile not found");
    }

    this.ensureAgentCanViewRequest(agent, request as any);

    // GRANT ACCESS AGENTS - Full info
    if (agent.hasGrantAccess) {
      return this.enrichRequestWithFullRenterInfo(request, agentId);
    }

    // NORMAL AGENTS - Check access status
    const grantAccess = await this.grantAccessRepository.findByAgentAndRequest(
      agentId,
      requestId,
    );

    if (!grantAccess) {
      throw new ForbiddenException(
        "You must request access to view renter information",
      );
    }

    if (grantAccess.status === "rejected") {
      throw new ForbiddenException(
        "Your access request was rejected by the admin",
      );
    }

    if (grantAccess.status === "pending") {
      throw new ForbiddenException(
        "Your access request is pending admin approval",
      );
    }

    if (grantAccess.status === "approved") {
      throw new ForbiddenException(
        "Your access request was approved. Complete payment to proceed",
      );
    }

    // Access free or paid - show full info
    if (grantAccess.status === "free" || grantAccess.status === "paid") {
      return this.enrichRequestWithFullRenterInfo(request, agentId);
    }

    throw new ForbiddenException("You do not have access to this request");
  }

  public async checkAgentAccessToRequest(
    agentId: string,
    requestId: string,
  ): Promise<{
    hasAccess: boolean;
    accessType: "admin-granted" | "payment-based" | "none";
    grantAccessRecord?: any;
  }> {
    // Check if agent has admin-granted access
    const agent = await this.agentRepository.findByUserId(agentId);
    if (agent && agent.hasGrantAccess) {
      return {
        hasAccess: true,
        accessType: "admin-granted",
      };
    }

    // Check if agent paid for this specific request
    let grantAccess = await this.grantAccessRepository.findByAgentAndRequest(
      agentId,
      requestId,
    );

    const grantAccessId = grantAccess?._id;
    if (
      grantAccess &&
      grantAccess.payment?.paymentStatus === "pending" &&
      grantAccess.payment.stripePaymentIntentId
    ) {
      try {
        await this.paymentService.reconcilePaymentIntent(
          grantAccess.payment.stripePaymentIntentId,
        );
        grantAccess = await this.grantAccessRepository.findByAgentAndRequest(
          agentId,
          requestId,
        );
      } catch (error) {
        logger.warn(
          { error, grantAccessId },
          "Failed to refresh payment status",
        );
      }
    }

    if (
      grantAccess &&
      (grantAccess.status === "free" || grantAccess.status === "paid")
    ) {
      return {
        hasAccess: true,
        accessType: "payment-based",
        grantAccessRecord: grantAccess,
      };
    }

    return {
      hasAccess: false,
      accessType: "none",
    };
  }

  async getMatchedAccessRecord(
    agentId: string,
    requestId: string,
  ): Promise<IGrantAccessRequest | null> {
    const grantAccess = await this.grantAccessRepository.findByAgentAndRequest(
      agentId,
      requestId,
    );

    if (
      grantAccess &&
      (grantAccess.status === "free" || grantAccess.status === "paid")
    ) {
      return grantAccess;
    }

    return null;
  }

  private async notifyRenterAboutMatchedOpportunity(
    agentId: string,
    preMarketRequest: IPreMarketRequest,
  ): Promise<void> {
    const renter = await this.renterRepository.findRenterWithReferrer(
      preMarketRequest.renterId.toString(),
    );

    if (!renter?.email || !renter.fullName) {
      logger.warn(
        { requestId: preMarketRequest._id },
        "Renter not found for match notification",
      );
      return;
    }

    const agent = await this.userRepository.findById(agentId);
    if (!agent?.email) {
      logger.warn(
        { agentId, requestId: preMarketRequest._id },
        "Matching agent not found for match notification",
      );
      return;
    }

    const registeredAgentInfo =
      renter.registrationType === "agent_referral" && renter.referredByAgentId
        ? renter.referredByAgentId
        : null;

    const registeredAgentId =
      typeof registeredAgentInfo === "object" && registeredAgentInfo?._id
        ? registeredAgentInfo._id.toString()
        : typeof registeredAgentInfo === "string"
          ? registeredAgentInfo
          : null;

    const registeredAgentEmail =
      typeof registeredAgentInfo === "object" && registeredAgentInfo?.email
        ? registeredAgentInfo.email
        : SYSTEM_DEFAULT_AGENT.email;

    const buildCcList = (
      emails: Array<string | undefined>,
    ): string[] | undefined => {
      const renterEmail = renter.email.toLowerCase();
      const unique: string[] = [];

      for (const email of emails) {
        if (!email) {
          continue;
        }
        const trimmed = email.trim();
        if (!trimmed) {
          continue;
        }
        if (trimmed.toLowerCase() === renterEmail) {
          continue;
        }
        if (
          unique.some((item) => item.toLowerCase() === trimmed.toLowerCase())
        ) {
          continue;
        }
        unique.push(trimmed);
      }

      return unique.length > 0 ? unique : undefined;
    };

    const isRegisteredAgentMatch =
      (registeredAgentId && agent._id?.toString() === registeredAgentId) ||
      (agent.email &&
        registeredAgentEmail &&
        agent.email.toLowerCase() === registeredAgentEmail.toLowerCase());

    if (isRegisteredAgentMatch) {
      const ccEmails = buildCcList([registeredAgentEmail]);
      await emailService.sendRenterOpportunityFoundByRegisteredAgent({
        to: renter.email,
        renterName: renter.fullName,
        cc: ccEmails,
      });
    } else {
      const ccEmails = buildCcList([registeredAgentEmail, agent.email]);
      await emailService.sendRenterOpportunityFoundByOtherAgent({
        to: renter.email,
        renterName: renter.fullName,
        cc: ccEmails,
      });
    }

    const renterUserId =
      this.normalizeUserId(renter.userId) ??
      this.normalizeUserId(preMarketRequest.renterId);

    if (!renterUserId) {
      logger.warn(
        { requestId: preMarketRequest._id },
        "Skipping renter match notification because renter user ID is missing",
      );
      return;
    }

    const agentDisplayName =
      agent.fullName || agent.email || `Agent ${agentId}`;
    const listingTitle =
      preMarketRequest.requestName || "your pre-market request";

    await this.createRenterNotification({
      recipientId: renterUserId,
      title: "Agent matched your listing",
      message: `${agentDisplayName} has been matched to ${listingTitle}. Expect them to reach out soon.`,
      type: "success",
      notificationType: "pre_market_agent_matched",
      relatedEntityId: preMarketRequest._id?.toString(),
      actionUrl: `${env.CLIENT_URL}/listings/${preMarketRequest._id}`,
      actionData: {
        requestId: preMarketRequest.requestId,
        agentId,
        agentName: agentDisplayName,
        agentEmail: agent.email,
      },
    });
  }

  /**
   * Check if agent has access to view RENTER INFO for a request
   * Returns true if:
   * 1. Agent has admin-granted access (hasGrantAccess = true), OR
   * 2. Agent paid for this specific request (status = "free" or "paid")
   */
  async canAgentSeeRenterInfo(
    agentId: string,
    requestId: string | Types.ObjectId,
  ): Promise<{
    canSee: boolean;
    accessType: "admin-granted" | "payment-based" | "none";
  }> {
    // Check 1: Admin-granted access
    const agent = await this.agentRepository.findByUserId(agentId);
    if (agent?.hasGrantAccess) {
      return {
        canSee: true,
        accessType: "admin-granted",
      };
    }

    // Check 2: Payment-based access for THIS specific request
    const grantAccess = await this.grantAccessRepository.findOne({
      agentId,
      preMarketRequestId: requestId,
      status: { $in: ["free", "paid"] },
    });

    if (grantAccess) {
      return {
        canSee: true,
        accessType: "payment-based",
      };
    }

    return {
      canSee: false,
      accessType: "none",
    };
  }

  /**
   * Mark request as viewed by agent
   * Adds agent to viewedBy array to track engagement
   */
  async markRequestAsViewedByAgent(
    requestId: string,
    agentId: string,
    type: "grantAccessAgents" | "normalAgents",
  ): Promise<void> {
    await this.preMarketRepository.addAgentToViewedBy(requestId, agentId, type);
  }

  /**
   * Get renter's specific pre-market request
   * Only the renter who owns it can view
   */
  async getRenterRequestById(
    renterId: string,
    requestId: string,
  ): Promise<IPreMarketRequest> {
    const request = await this.preMarketRepository.findById(requestId);

    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    // Verify ownership
    if (request.renterId.toString() !== renterId) {
      throw new ForbiddenException(
        "You can only view your own pre-market requests",
      );
    }

    logger.info(
      { renterId, requestId: request.requestId },
      "Renter retrieved their request details",
    );

    return request;
  }

  // ============================================
  // ADMIN: DELETE PRE-MARKET REQUEST
  // ============================================

  /**
   * Admin can delete any pre-market request
   * Hard delete - removes from DB
   * Related grant access records are also removed
   */
  async adminDeleteRequest(requestId: string): Promise<void> {
    const request = await this.preMarketRepository.findById(requestId);

    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    // Delete the request (hard delete)
    await this.preMarketRepository.deleteById(requestId);
    await this.deleteGrantAccessRecords(requestId);

    logger.warn(
      { requestId, renterId: request.renterId },
      "Admin deleted pre-market request",
    );

    this.notifyRegisteredAgentRequestClosed(
      request,
      "Deleted by Admin",
      new Date(),
    ).catch((error) => {
      logger.error(
        { error, requestId: request._id },
        "Failed to send request closed alert (non-blocking)",
      );
    });

    this.notifyRenterAboutAdminDeletion(request).catch((error) => {
      logger.error(
        { error, requestId: request._id },
        "Failed to notify renter about admin deletion (non-blocking)",
      );
    });

    this.updateConsolidatedExcel().catch((error) => {
      logger.error({ error }, "Consolidated Excel update failed");
    });
  }

  // ============================================
  // LISTING ACTIVATION/DEACTIVATION
  // ============================================

  /**
   * Toggle listing activation status (Admin or Renter)
   * @param listingId - Pre-market listing ID
   * @param isActive - New activation status
   * @param userId - User performing action
   * @param userRole - User role (Admin or Renter)
   */
  async toggleListingActivation(
    listingId: string,
    isActive: boolean,
    userId: string,
    userRole: string,
  ): Promise<IPreMarketRequest> {
    const listing = await this.getRequestById(listingId);

    // Check authorization
    if (userRole === "Renter") {
      // Renter can only toggle own listings
      if (listing.renterId.toString() !== userId) {
        throw new ForbiddenException("You can only manage your own listings");
      }
    } else if (userRole !== "Admin") {
      // Only Admin or Renter allowed
      throw new ForbiddenException(
        "You don't have permission to manage listings",
      );
    }

    // Update listing
    const updated = await this.preMarketRepository.toggleListingActive(
      listingId,
      isActive,
    );

    if (!updated) {
      throw new NotFoundException("Pre-market request not found");
    }

    logger.info(
      { userId, listingId, isActive, userRole },
      `Listing activation toggled: ${isActive ? "activated" : "deactivated"}`,
    );

    if (!isActive) {
      const reason = userRole === "Admin" ? "Closed by Admin" : "Expired";
      this.notifyRegisteredAgentRequestClosed(
        listing,
        reason,
        new Date(),
      ).catch((error) => {
        logger.error(
          { error, listingId },
          "Failed to send request closed alert (non-blocking)",
        );
      });
    }

    return updated;
  }

  /**
   * Check if agent can access listing (activation guard)
   * @param listingId - Pre-market listing ID
   */
  async canAgentAccessListing(listingId: string): Promise<{
    canAccess: boolean;
    isActive: boolean;
    reason?: string;
  }> {
    const listing =
      await this.preMarketRepository.findByIdWithActivationStatus(listingId);

    if (!listing) {
      return {
        canAccess: false,
        isActive: false,
        reason: "Listing not found",
      };
    }

    if (!listing.isActive) {
      return {
        canAccess: false,
        isActive: false,
        reason: "This listing is no longer accepting requests",
      };
    }

    return {
      canAccess: true,
      isActive: true,
    };
  }

  /**
   * Get all listings for a renter (admin view)
   * @param renterId - Renter ID
   * @param includeInactive - Include deactivated listings
   */
  async getRenterListings(
    renterId: string,
    includeInactive: boolean = true,
  ): Promise<IPreMarketRequest[]> {
    return this.preMarketRepository.findByRenterIdAll(
      renterId,
      includeInactive,
    );
  }

  async getRenterRequestsWithAgents(
    renterId: string,
    query: PaginationQuery,
  ): Promise<{
    data: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    // Step 1: Get ALL requests for this renter
    const requests = await this.preMarketRepository.findByRenterId(
      renterId,
      query,
    );

    if (!requests || requests.data.length === 0) {
      return {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: 10,
          hasNext: false,
          hasPrev: false,
        },
      };
    }

    const requestsWithAgents = await Promise.all(
      requests.data.map(async (request) => {
        try {
          const requestId = request._id!.toString();
          const grantAccessRecords =
            await this.grantAccessRepository.findByPreMarketRequestId(
              requestId,
            );

          const agentMap = new Map<string, { status: string; record: any }>();

          for (const record of grantAccessRecords || []) {
            if (record.status !== "free" && record.status !== "paid") {
              continue;
            }

            const agentId = record.agentId.toString();
            if (!agentMap.has(agentId)) {
              agentMap.set(agentId, {
                status: record.status,
                record,
              });
            }
          }

          const agentIds = Array.from(agentMap.keys());

          const agents = [];

          for (const agentId of agentIds) {
            try {
              // Get agent profile (company, license)
              const agentProfile =
                await this.agentRepository.findByUserId(agentId);

              // Get agent user (name, email, phone, image)
              const agentUser = await this.userRepository.findById(agentId);

              if (agentProfile && agentUser) {
                const accessInfo = agentMap.get(agentId);
                const accessStatus = accessInfo?.status as
                  | "pending"
                  | "free"
                  | "rejected"
                  | "paid"
                  | undefined;
                const hasRequestAccess =
                  accessStatus === "paid" || accessStatus === "free";
                const hasGrantAccess = agentProfile.hasGrantAccess === true;

                if (hasRequestAccess) {
                  agents.push({
                    _id: agentProfile._id?.toString(),
                    userId: agentUser._id?.toString(),
                    fullName: agentUser.fullName,
                    email: agentUser.email,
                    phoneNumber: agentUser.phoneNumber || null,
                    licenseNumber: agentProfile.licenseNumber,
                    title: agentProfile.title || null,
                    profileImageUrl: agentUser.profileImageUrl || null,
                    accessStatus,
                    ...(hasGrantAccess && { hasGrantAccess }),
                  });
                }
              }
            } catch (error) {
              logger.warn(
                { agentId, requestId },
                "Failed to fetch agent details, skipping",
              );
              continue;
            }
          }

          // Sort agents by name for consistent ordering
          agents.sort((a, b) => a.fullName.localeCompare(b.fullName));

          // Return request with agent matches
          const requestObject = request.toObject ? request.toObject() : request;

          return {
            ...requestObject,
            agentMatches: {
              totalCount: agents.length,
              agents: agents,
            },
          };
        } catch (error) {
          logger.warn(
            { requestId: request._id, error },
            "Failed to fetch agents for request, returning without agents",
          );

          // Return request without agents if fetch fails
          const requestObject = request.toObject ? request.toObject() : request;
          return {
            ...requestObject,
            agentMatches: {
              totalCount: 0,
              agents: [],
            },
          };
        }
      }),
    );

    return {
      data: requestsWithAgents,
      pagination: requests.pagination,
    };
  }

  private async getRenterInfoForRequest(renterId: string) {
    const renter = await this.renterRepository.findRenterWithReferrer(renterId);

    if (!renter) {
      return null;
    }

    const resolveReferrerId = (value: any): string | null => {
      if (!value) return null;
      if (typeof value === "string") return value;
      if (typeof value === "object" && value._id) return value._id.toString();
      if (typeof value?.toString === "function") {
        const str = value.toString();
        return str === "[object Object]" ? null : str;
      }
      return null;
    };

    let referrerInfo = null;

    if (renter.referredByAgentId) {
      const referredAgent =
        typeof renter.referredByAgentId === "object" &&
        (renter.referredByAgentId as any)?._id
          ? renter.referredByAgentId
          : null;
      const referrerId = resolveReferrerId(renter.referredByAgentId);
      const referrer =
        referredAgent ||
        (referrerId ? await this.userRepository.findById(referrerId) : null);
      if (referrer) {
        referrerInfo = {
          referrerId: referrer._id?.toString(),
          referrerName: referrer.fullName,
          referrerEmail: referrer.email ?? null,
          referrerPhoneNumber: referrer.phoneNumber ?? null,
          referralCode: referrer.referralCode ?? null,
          referrerType: "AGENT",
        };
      }
    } else if (renter.referredByAdminId) {
      const referredAdmin =
        typeof renter.referredByAdminId === "object" &&
        (renter.referredByAdminId as any)?._id
          ? renter.referredByAdminId
          : null;
      const referrerId = resolveReferrerId(renter.referredByAdminId);
      const referrer =
        referredAdmin ||
        (referrerId ? await this.userRepository.findById(referrerId) : null);
      if (referrer) {
        referrerInfo = {
          referrerId: referrer._id?.toString(),
          referrerName: referrer.fullName,
          referrerEmail: referrer.email ?? null,
          referrerPhoneNumber: referrer.phoneNumber ?? null,
          referralCode: referrer.referralCode ?? null,
          referrerType: "ADMIN",
        };
      }
    }

    if (!referrerInfo) {
      const defaultAgent = await this.getDefaultReferralAgent();
      referrerInfo = {
        referrerId: defaultAgent.id,
        referrerName: defaultAgent.fullName,
        referrerEmail: defaultAgent.email,
        referrerPhoneNumber: defaultAgent.phoneNumber,
        referralCode: defaultAgent.referralCode,
        referrerType: "AGENT",
      };
    }

    const profileImageUrl =
      (typeof renter.userId === "object" && renter.userId
        ? renter.userId.profileImageUrl
        : renter.profileImageUrl) || null;

    return {
      renterId: renter._id?.toString() || renterId,
      fullName: renter.fullName,
      email: renter.email,
      phoneNumber: renter.phoneNumber,
      profileImage: profileImageUrl,
      registrationType: renter.registrationType,
      referralInfo: referrerInfo,
    };
  }

  private async getReferralInfoForRenter(renterId: string) {
    const renter = await this.renterRepository.findRenterWithReferrer(renterId);

    if (!renter) {
      return null;
    }

    const registrationType = renter.registrationType || "normal";
    const referrer =
      registrationType === "agent_referral"
        ? renter.referredByAgentId
        : registrationType === "admin_referral"
          ? renter.referredByAdminId
          : null;

    if (!referrer) {
      const defaultAgent = await this.getDefaultReferralAgent();
      return {
        registrationType,
        referrer: {
          referrerId: defaultAgent.id,
          referrerName: defaultAgent.fullName,
          referrerEmail: defaultAgent.email,
          referrerPhoneNumber: defaultAgent.phoneNumber,
          referralCode: defaultAgent.referralCode,
          referrerType: "Agent",
        },
      };
    }

    const referrerId =
      typeof referrer === "object" && (referrer as any)?._id
        ? (referrer as any)._id.toString()
        : typeof referrer === "string"
          ? referrer
          : "";
    const referrerName =
      typeof referrer === "object"
        ? (referrer as any).fullName || (referrer as any).name || "Unknown"
        : "Unknown";
    const referrerEmail =
      typeof referrer === "object" ? (referrer as any).email || null : null;
    const referrerPhoneNumber =
      typeof referrer === "object"
        ? (referrer as any).phoneNumber || null
        : null;
    const referrerCode =
      typeof referrer === "object"
        ? (referrer as any).referralCode || null
        : null;
    const referrerType =
      registrationType === "agent_referral" ? "Agent" : "Admin";

    return {
      registrationType,
      referrer: {
        referrerId,
        referrerName,
        referrerEmail,
        referrerPhoneNumber,
        referralCode: referrerCode,
        referrerType,
      },
    };
  }

  private async updateConsolidatedExcel(): Promise<void> {
    const buffer = await this.excelService.generateConsolidatedPreMarketExcel();

    const { url, fileName } =
      await this.excelService.uploadConsolidatedExcel(buffer);

    // 3. Get current total count
    const totalRequests = await this.preMarketRepository.count();

    // 4. Get previous version number
    const previousMetadata = await this.preMarketRepository.getExcelMetadata();
    const version = (previousMetadata?.version || 0) + 1;

    // 5. Update metadata in database
    await this.preMarketRepository.updateExcelMetadata({
      type: "pre_market",
      fileName,
      fileUrl: url,
      lastUpdated: new Date(),
      totalRequests,
      version,
      generatedAt: new Date(),
    });

    logger.info(
      { url, fileName, version, totalRequests },
      "Consolidated Excel updated",
    );
  }

  /**
   * Get consolidated Excel file info
   * Can be called by admin to get download link
   */
  async getConsolidatedExcel(): Promise<any> {
    const metadata = await this.preMarketRepository.getExcelMetadata();

    if (!metadata) {
      throw new NotFoundException("No consolidated Excel file found");
    }
    return metadata;
  }

  public async getAllListingsWithAllData(): Promise<any> {
    try {
      const listings =
        await this.preMarketRepository.getAllListingsWithAllData();

      return listings;
    } catch (error) {
      logger.error({ error }, "Failed to get all listings with data");
      throw error;
    }
  }
}
