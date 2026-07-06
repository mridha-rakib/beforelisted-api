// file: src/modules/pre-market/pre-market.service.ts

import { Types } from "mongoose";
import { randomBytes, randomInt } from "node:crypto";

import type { NotificationType } from "@/modules/notification/notification.interface";
import type { IMatchCompatibilitySummary } from "@/services/email-notification.types";
import type { PaginatedResponse, PaginationQuery } from "@/ts/pagination.types";

import { ACCOUNT_STATUS, ROLES, SYSTEM_DEFAULT_AGENT } from "@/constants/app.constants";
import { env } from "@/env";
import { logger } from "@/middlewares/pino-logger";
import { NotificationService } from "@/modules/notification/notification.service";
import { emailService } from "@/services/email.service";
import { ExcelService } from "@/services/excel.service";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@/utils/app-error.utils";
import {
  hasRiskyOpportunityDetailsWording,
  OPPORTUNITY_DETAILS_RISKY_WORDING_MESSAGE,
} from "@/utils/opportunity-details.utils";
import { PaginationHelper } from "@/utils/pagination-helper";
import {
  addPerformanceTiming,
  incrementPerformanceMetric,
  nowMs,
  setPerformanceMetric,
} from "@/utils/performance-observer.utils";

import type { IAgentProfile } from "../agent/agent.interface";
import type { IGrantAccessRequest } from "../grant-access/grant-access.model";
import type { MatchApartmentInput } from "./pre-market-match-scoring.js";
import type { IPreMarketRequest } from "./pre-market.model";
import type {
  AdminAgentRequestSummary,
  AdminPreMarketPaginatedResponse,
  AdminPreMarketRequestItem,
  AdminRenterInfo,
  AgentRequestDetail,
  PreMarketScope,
} from "./pre-market.type";

import { AgentProfileRepository } from "../agent/agent.repository";
import { BlockedEmailService } from "../blocked-email/blocked-email.service";
import { GrantAccessRepository } from "../grant-access/grant-access.repository";
import { PaymentService } from "../payment/payment.service";
import { RenterRepository } from "../renter/renter.repository";
import { UserRepository } from "../user/user.repository";
import { resolveRenterOpportunityEmailScope } from "./pre-market-email-scope.utils";
import {
  scorePreMarketRequest,
} from "./pre-market-match-scoring.js";
import { preMarketNotifier, PreMarketNotifier } from "./pre-market-notifier.js";
import { PreMarketRepository } from "./pre-market.repository";

type NormalAgentListingResponse = Record<string, any> & {
  renterInfo: Record<string, any> | null;
  accessType: string;
  canRequestAccess: boolean;
  requestAccessMessage?: string;
};

type RequestRenterContext = {
  registeredAgentIdByRequestId: Map<string, string | null>;
  referralInfoByRenterId: Map<string, any>;
};

type RegisteredAgentContext = {
  registeredAgentIdByRequestId: Map<string, string | null>;
  renterByUserId: Map<string, any>;
};

type DefaultReferralAgentInfo = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  activationLink: string | null;
  disclosureLink: string | null;
  referralCode: string | null;
};

type AdminListEnrichmentContext = {
  renterByUserId: Map<string, any>;
  grantAccessByRequestId: Map<string, IGrantAccessRequest[]>;
  agentUserById: Map<string, any>;
  agentProfileByUserId: Map<string, any>;
  referrerAgentProfileByUserId: Map<string, any>;
};

type AgentGrantAccessStatus
  = | "Available"
    | "requested"
    | "approved"
    | "pending"
    | "paid"
    | "free"
    | "rejected";

type AgentArchiveReason
  = | "registration_missing"
    | "disclosure_missing"
    | "search_inactive"
    | "search_inactive_automatic"
    | "client_placed";

type AgentArchiveSource = "registered_agent" | "matched_agent" | "system";
type MatchRepresentationType
  = | "owner_representation"
    | "renter_representation";

const REGISTRATION_DISCLOSURE_MATCHED_STATUSES = ["approved", "free", "paid"];

const ARCHIVE_REASON_LABELS: Record<AgentArchiveReason, string> = {
  registration_missing: "Registration Missing",
  disclosure_missing: "Disclosure Missing",
  search_inactive: "Search Inactive",
  search_inactive_automatic: "Search Inactive (E)",
  client_placed: "Client Placed",
};

const SEARCH_CONFIRMATION_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;
const SEARCH_CONFIRMATION_EXPIRY_MS = 3 * 24 * 60 * 60 * 1000;
const DEFAULT_PRODUCTION_API_ORIGIN = "https://api.beforelisted.com";

const DEFAULT_REGISTERED_AGENT_EMAIL = SYSTEM_DEFAULT_AGENT.email;
const _DEFAULT_REGISTERED_AGENT_NAME = SYSTEM_DEFAULT_AGENT.fullName;
const DEFAULT_REFERRAL_AGENT_NAME = SYSTEM_DEFAULT_AGENT.fullName;
const DEFAULT_REFERRAL_AGENT_TITLE = SYSTEM_DEFAULT_AGENT.title;
const DEFAULT_REFERRAL_AGENT_BROKERAGE = SYSTEM_DEFAULT_AGENT.brokerageName;
const DEFAULT_REFERRAL_AGENT_PHONE = SYSTEM_DEFAULT_AGENT.phoneNumber;

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
  private readonly blockedEmailService: BlockedEmailService;
  private defaultReferralAgentCache?: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
    activationLink: string | null;
    disclosureLink: string | null;
    referralCode: string | null;
  };

  constructor() {
    this.preMarketRepository = new PreMarketRepository();
    this.grantAccessRepository = new GrantAccessRepository();
    this.agentRepository = new AgentProfileRepository();
    this.paymentService = new PaymentService();
    this.notifier = new PreMarketNotifier();
    this.notificationService = new NotificationService();
    this.blockedEmailService = new BlockedEmailService();
    this.renterRepository = new RenterRepository();
    this.userRepository = new UserRepository();
    this.excelService = new ExcelService();
  }

  private normalizeOpportunityDetails(value?: string | null): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized.slice(0, 350) : undefined;
  }

  private buildMatchCompatibilitySummary(
    matchContext: MatchApartmentInput | undefined,
    request: IPreMarketRequest,
  ): IMatchCompatibilitySummary | undefined {
    if (!matchContext) {
      return undefined;
    }

    const scoreResult = scorePreMarketRequest(matchContext, request);
    if (scoreResult.disqualified) {
      return undefined;
    }

    const preferences = Array.isArray(request.preferences)
      ? request.preferences.slice(0, 4)
      : [];

    return {
      compatibilityMisses: scoreResult.missingFeatures.map(
        feature => feature.label,
      ),
      preferenceMatches: preferences.filter(
        (_preference, index) => scoreResult.preferenceMatches[index],
      ),
    };
  }

  private async getDefaultReferralAgent(): Promise<DefaultReferralAgentInfo> {
    if (this.defaultReferralAgentCache) {
      return this.defaultReferralAgentCache;
    }

    const fallback = {
      id: "",
      fullName: DEFAULT_REFERRAL_AGENT_NAME,
      email: DEFAULT_REGISTERED_AGENT_EMAIL,
      phoneNumber: null,
      activationLink: null,
      disclosureLink: null,
      referralCode: null,
    };

    const user = await this.userRepository.findByEmail(
      DEFAULT_REGISTERED_AGENT_EMAIL,
    );

    if (!user) {
      this.defaultReferralAgentCache = fallback;
      return fallback;
    }

    const agentProfile = await this.agentRepository.findByUserId(
      user._id.toString(),
    );

    const resolved = {
      id: user._id?.toString() || "",
      fullName: user.fullName || DEFAULT_REFERRAL_AGENT_NAME,
      email: user.email || DEFAULT_REGISTERED_AGENT_EMAIL,
      phoneNumber: user.phoneNumber ?? null,
      activationLink: agentProfile?.activationLink || null,
      disclosureLink: agentProfile?.disclosureLink || null,
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

    if (grantAccess.representation_type === "owner_representation") {
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

    const chargeAmount
      = grantAccess.payment?.amount
        ?? grantAccess.adminDecision?.chargeAmount
        ?? 0;
    const isChargedDecision
      = chargeAmount > 0 && grantAccess.adminDecision?.isFree !== true;

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

    if (grantAccess?.representation_type === "owner_representation") {
      return "none";
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
    const chargeAmountValue
      = grantAccess?.payment?.amount
        ?? grantAccess?.adminDecision?.chargeAmount
        ?? 0;
    const hasCharge
      = chargeAmountValue > 0 && grantAccess?.adminDecision?.isFree !== true;
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
      }
      else if (grantAccessStatus === "rejected") {
        paymentInfo = {
          amount: grantAccess.payment?.amount ?? 0,
          currency: grantAccess.payment?.currency ?? "USD",
          status: "rejected",
        };
      }
      else if (grantAccessStatus === "approved") {
        paymentInfo = {
          amount: chargeAmountValue,
          currency: grantAccess.payment?.currency ?? "USD",
          status: grantAccess.payment?.paymentStatus ?? "pending",
        };
      }
      else if (grantAccessStatus === "paid") {
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
      representation_type: grantAccess?.representation_type,
      representationSelectedAt: grantAccess?.representationSelectedAt,
      chargeAmount,
      payment: paymentInfo,
      showPayment,
    };
  }

  public resolveAgentVisibleScope(
    scope: string | undefined,
    shouldDisplayMatchedScope: boolean,
  ): "Upcoming" | "All Market" | "Upcoming (M)" {
    if (scope === "All Market" && shouldDisplayMatchedScope) {
      return "Upcoming (M)";
    }

    return scope === "All Market" ? "All Market" : "Upcoming";
  }

  public async resolveMatchedAgentForView(
    _viewerAgentId: string | undefined,
    requestId: string,
  ): Promise<{ agentId: string; fullName: string } | null> {
    const records = await this.grantAccessRepository.findByPreMarketRequestId(
      requestId,
    );
    const matchedRecord = records.find(
      record =>
        record.representation_type !== "owner_representation"
        && (record.status === "free"
          || record.status === "paid"
          || record.status === "approved"),
    );
    if (!matchedRecord)
      return null;
    const user = await this.userRepository.findById(
      matchedRecord.agentId.toString(),
    );
    if (!user)
      return null;
    return {
      agentId: matchedRecord.agentId.toString(),
      fullName: user.fullName || user.email || "",
    };
  }

  private async buildMatchedAgentByRequestId(
    requestIds: string[],
  ): Promise<Map<string, { agentId: string; fullName: string } | null>> {
    const matchedAgentByRequestId = new Map<
      string,
      { agentId: string; fullName: string } | null
    >();
    const normalizedRequestIds = Array.from(
      new Set(requestIds.filter(Boolean)),
    );

    if (normalizedRequestIds.length === 0) {
      return matchedAgentByRequestId;
    }

    const records = await this.grantAccessRepository.findByPreMarketRequestIds(
      normalizedRequestIds,
    );
    const matchedRecordByRequestId = new Map<string, IGrantAccessRequest>();

    for (const record of records) {
      const requestId = record.preMarketRequestId?.toString();
      if (
        !requestId
        || matchedRecordByRequestId.has(requestId)
        || record.representation_type === "owner_representation"
        || !["free", "paid", "approved"].includes(String(record.status))
      ) {
        continue;
      }

      matchedRecordByRequestId.set(requestId, record);
    }

    const matchedAgentIds = Array.from(
      new Set(
        Array.from(matchedRecordByRequestId.values())
          .map(record => record.agentId?.toString())
          .filter((agentId): agentId is string => Boolean(agentId)),
      ),
    );
    const matchedAgentUsers = await this.userRepository.findByIds(
      matchedAgentIds,
      "fullName email",
    );
    const userById = new Map(
      matchedAgentUsers.map((user: any) => [user._id?.toString(), user]),
    );

    for (const [requestId, record] of matchedRecordByRequestId.entries()) {
      const agentId = record.agentId?.toString();
      const user = agentId ? userById.get(agentId) : null;

      matchedAgentByRequestId.set(
        requestId,
        user
          ? {
              agentId,
              fullName: user.fullName || user.email || "",
            }
          : null,
      );
    }

    return matchedAgentByRequestId;
  }

  private async buildRequestRenterContext(
    requests: Array<IPreMarketRequest | Record<string, any>>,
  ): Promise<RequestRenterContext> {
    const registeredAgentIdByRequestId = new Map<string, string | null>();
    const referralInfoByRenterId = new Map<string, any>();
    const renterIds = Array.from(
      new Set(
        requests
          .map(request => this.normalizeUserId((request as any).renterId))
          .filter((renterId): renterId is string => Boolean(renterId)),
      ),
    );

    if (renterIds.length === 0) {
      return {
        registeredAgentIdByRequestId,
        referralInfoByRenterId,
      };
    }

    const batchableRenterIds = renterIds.filter(renterId =>
      Types.ObjectId.isValid(renterId),
    );
    const renters = batchableRenterIds.length > 0
      ? await this.renterRepository.findRentersWithReferrersByUserIds(
          batchableRenterIds,
        )
      : [];
    const renterByUserId = new Map(
      renters
        .map((renter: any) => [this.normalizeUserId(renter.userId), renter])
        .filter(([userId]) => Boolean(userId)) as Array<[string, any]>,
    );
    const agentReferrerIds = Array.from(
      new Set(
        renters
          .filter((renter: any) => renter.registrationType === "agent_referral")
          .map((renter: any) => this.normalizeUserId(renter.referredByAgentId))
          .filter((agentId): agentId is string => Boolean(agentId)),
      ),
    );
    const agentProfiles = agentReferrerIds.length > 0
      ? await this.agentRepository.findByUserIds(agentReferrerIds)
      : [];
    const activationLinkByAgentUserId = new Map(
      agentProfiles.map((profile: any) => [
        this.normalizeUserId(profile.userId),
        profile.activationLink || null,
      ]),
    );
    let defaultAgentPromise: ReturnType<
      PreMarketService["getDefaultReferralAgent"]
    > | null = null;
    const getDefaultAgent = () => {
      defaultAgentPromise ??= this.getDefaultReferralAgent();
      return defaultAgentPromise;
    };

    for (const request of requests) {
      const requestId = this.normalizeUserId((request as any)._id);
      const renterId = this.normalizeUserId((request as any).renterId);
      if (!requestId) {
        continue;
      }

      const renter = renterId ? renterByUserId.get(renterId) : null;
      const referredAgentId = renter
        ? this.normalizeUserId(renter.referredByAgentId)
        : null;

      if (referredAgentId) {
        registeredAgentIdByRequestId.set(requestId, referredAgentId);
      }
      else if (renter) {
        const defaultAgent = await getDefaultAgent();
        registeredAgentIdByRequestId.set(requestId, defaultAgent.id || null);
      }
      else {
        registeredAgentIdByRequestId.set(
          requestId,
          this.normalizeUserId((request as any).referralAgentId),
        );
      }
    }

    for (const renterId of renterIds) {
      const renter = renterByUserId.get(renterId);
      if (!renter) {
        continue;
      }

      const registrationType = renter.registrationType || "normal";
      const referrer
        = registrationType === "agent_referral"
          ? renter.referredByAgentId
          : registrationType === "admin_referral"
            ? renter.referredByAdminId
            : null;

      if (!referrer) {
        const defaultAgent = await getDefaultAgent();
        referralInfoByRenterId.set(renterId, {
          registrationType,
          renterName: renter.fullName || renter.email || "Renter",
          referrer: {
            referrerId: defaultAgent.id,
            referrerName: defaultAgent.fullName,
            referrerEmail: defaultAgent.email,
            referrerPhoneNumber: defaultAgent.phoneNumber,
            referralCode: defaultAgent.referralCode,
            activationLink: defaultAgent.activationLink,
            referrerType: "Agent",
          },
        });
        continue;
      }

      const referrerId
        = typeof referrer === "object" && (referrer as any)?._id
          ? (referrer as any)._id.toString()
          : typeof referrer === "string"
            ? referrer
            : "";
      const referrerName
        = typeof referrer === "object"
          ? (referrer as any).fullName || (referrer as any).name || "Unknown"
          : "Unknown";
      const referrerEmail
        = typeof referrer === "object" ? (referrer as any).email || null : null;
      const referrerPhoneNumber
        = typeof referrer === "object"
          ? (referrer as any).phoneNumber || null
          : null;
      const referrerCode
        = typeof referrer === "object"
          ? (referrer as any).referralCode || null
          : null;
      const referrerType
        = registrationType === "agent_referral" ? "Agent" : "Admin";
      const referrerActivationLink
        = referrerType === "Agent" && referrerId
          ? activationLinkByAgentUserId.get(referrerId) || null
          : null;

      referralInfoByRenterId.set(renterId, {
        registrationType,
        renterName: renter.fullName || renter.email || "Renter",
        referrer: {
          referrerId,
          referrerName,
          referrerEmail,
          referrerPhoneNumber,
          referralCode: referrerCode,
          activationLink:
            referrerType === "Agent" ? referrerActivationLink : null,
          referrerType,
        },
      });
    }

    return {
      registeredAgentIdByRequestId,
      referralInfoByRenterId,
    };
  }

  private async buildRegisteredAgentContext(
    requests: Array<IPreMarketRequest | Record<string, any>>,
  ): Promise<RegisteredAgentContext> {
    const registeredAgentIdByRequestId = new Map<string, string | null>();
    const renterIds = Array.from(
      new Set(
        requests
          .map(request => this.normalizeUserId((request as any).renterId))
          .filter((renterId): renterId is string => Boolean(renterId)),
      ),
    );

    if (renterIds.length === 0) {
      return {
        registeredAgentIdByRequestId,
        renterByUserId: new Map<string, any>(),
      };
    }

    const batchableRenterIds = renterIds.filter(renterId =>
      Types.ObjectId.isValid(renterId),
    );
    const renters = batchableRenterIds.length > 0
      ? await this.renterRepository.findRentersWithReferrersByUserIds(
          batchableRenterIds,
        )
      : [];
    const renterByUserId = new Map(
      renters
        .map((renter: any) => [this.normalizeUserId(renter.userId), renter])
        .filter(([userId]) => Boolean(userId)) as Array<[string, any]>,
    );
    let defaultAgentPromise: ReturnType<
      PreMarketService["getDefaultReferralAgent"]
    > | null = null;
    const getDefaultAgent = () => {
      defaultAgentPromise ??= this.getDefaultReferralAgent();
      return defaultAgentPromise;
    };

    for (const request of requests) {
      const requestId = this.normalizeUserId((request as any)._id);
      const renterId = this.normalizeUserId((request as any).renterId);
      if (!requestId) {
        continue;
      }

      const renter = renterId ? renterByUserId.get(renterId) : null;
      const referredAgentId = renter
        ? this.normalizeUserId(renter.referredByAgentId)
        : null;

      if (referredAgentId) {
        registeredAgentIdByRequestId.set(requestId, referredAgentId);
      }
      else if (renter) {
        const defaultAgent = await getDefaultAgent();
        registeredAgentIdByRequestId.set(requestId, defaultAgent.id || null);
      }
      else {
        registeredAgentIdByRequestId.set(
          requestId,
          this.normalizeUserId((request as any).referralAgentId),
        );
      }
    }

    return {
      registeredAgentIdByRequestId,
      renterByUserId,
    };
  }

  private async buildReferralInfoByRenterIdFromContext(
    requests: Array<IPreMarketRequest | Record<string, any>>,
    renterByUserId: Map<string, any>,
  ): Promise<Map<string, any>> {
    const referralInfoByRenterId = new Map<string, any>();
    const renterIds = Array.from(
      new Set(
        requests
          .map(request => this.normalizeUserId((request as any).renterId))
          .filter((renterId): renterId is string => Boolean(renterId)),
      ),
    );
    const selectedRenters = renterIds
      .map(renterId => renterByUserId.get(renterId))
      .filter(Boolean);
    const agentReferrerIds = Array.from(
      new Set(
        selectedRenters
          .filter((renter: any) => renter.registrationType === "agent_referral")
          .map((renter: any) => this.normalizeUserId(renter.referredByAgentId))
          .filter((agentId): agentId is string => Boolean(agentId)),
      ),
    );
    const agentProfiles = agentReferrerIds.length > 0
      ? await this.agentRepository.findByUserIds(agentReferrerIds)
      : [];
    const activationLinkByAgentUserId = new Map(
      agentProfiles.map((profile: any) => [
        this.normalizeUserId(profile.userId),
        profile.activationLink || null,
      ]),
    );
    let defaultAgentPromise: ReturnType<
      PreMarketService["getDefaultReferralAgent"]
    > | null = null;
    const getDefaultAgent = () => {
      defaultAgentPromise ??= this.getDefaultReferralAgent();
      return defaultAgentPromise;
    };

    for (const renterId of renterIds) {
      const renter = renterByUserId.get(renterId);
      if (!renter) {
        continue;
      }

      const registrationType = renter.registrationType || "normal";
      const referrer
        = registrationType === "agent_referral"
          ? renter.referredByAgentId
          : registrationType === "admin_referral"
            ? renter.referredByAdminId
            : null;

      if (!referrer) {
        const defaultAgent = await getDefaultAgent();
        referralInfoByRenterId.set(renterId, {
          registrationType,
          renterName: renter.fullName || renter.email || "Renter",
          referrer: {
            referrerId: defaultAgent.id,
            referrerName: defaultAgent.fullName,
            referrerEmail: defaultAgent.email,
            referrerPhoneNumber: defaultAgent.phoneNumber,
            referralCode: defaultAgent.referralCode,
            activationLink: defaultAgent.activationLink,
            referrerType: "Agent",
          },
        });
        continue;
      }

      const referrerId
        = typeof referrer === "object" && (referrer as any)?._id
          ? (referrer as any)._id.toString()
          : typeof referrer === "string"
            ? referrer
            : "";
      const referrerName
        = typeof referrer === "object"
          ? (referrer as any).fullName || (referrer as any).name || "Unknown"
          : "Unknown";
      const referrerEmail
        = typeof referrer === "object" ? (referrer as any).email || null : null;
      const referrerPhoneNumber
        = typeof referrer === "object"
          ? (referrer as any).phoneNumber || null
          : null;
      const referrerCode
        = typeof referrer === "object"
          ? (referrer as any).referralCode || null
          : null;
      const referrerType
        = registrationType === "agent_referral" ? "Agent" : "Admin";
      const referrerActivationLink
        = referrerType === "Agent" && referrerId
          ? activationLinkByAgentUserId.get(referrerId) || null
          : null;

      referralInfoByRenterId.set(renterId, {
        registrationType,
        renterName: renter.fullName || renter.email || "Renter",
        referrer: {
          referrerId,
          referrerName,
          referrerEmail,
          referrerPhoneNumber,
          referralCode: referrerCode,
          activationLink:
            referrerType === "Agent" ? referrerActivationLink : null,
          referrerType,
        },
      });
    }

    return referralInfoByRenterId;
  }

  private async getGlobalMatchedScopeRequestIdSet(
    requestIds: string[],
  ): Promise<Set<string>> {
    return this.preMarketRepository.getMatchedScopeRequestIdSet(requestIds);
  }

  public async shouldDisplayMatchedScopeForRequest(
    requestId: string | Types.ObjectId,
    options: { excludeGrantAccessId?: string | Types.ObjectId } = {},
  ): Promise<boolean> {
    return this.preMarketRepository.shouldDisplayMatchedScopeForRequest(
      requestId,
      options,
    );
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
      grantAccess
      && grantAccess.payment?.paymentStatus === "pending"
      && grantAccess.payment.stripePaymentIntentId
    ) {
      try {
        await this.paymentService.reconcilePaymentIntent(
          grantAccess.payment.stripePaymentIntentId,
        );
        grantAccess = await this.grantAccessRepository.findByAgentAndRequest(
          agentId,
          requestId,
        );
      }
      catch (error) {
        logger.warn(
          { error, grantAccessId },
          "Failed to refresh payment status",
        );
      }
    }

    return this.buildAgentAccessSummary(grantAccess, hasGrantAccess);
  }

  /**
   * Creates a renter's active pre-market request and initializes ownership, visibility, and search-confirmation state.
   * Expects a renter user ID, valid move dates, valid price range, locations, and referral-backed renter profile.
   * Can fail when the renter is missing/blocked, the referred agent is unavailable, the renter already has an active request, or required referral ownership is missing.
   */
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
    context?: { ipAddress?: string | null },
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

    await this.blockedEmailService.assertEmailNotBlocked(renter.email, {
      action: "submit_request",
      ipAddress: context?.ipAddress,
    });

    if (renter.referredByAgentId) {
      const referredAgent
        = typeof renter.referredByAgentId === "object"
          ? renter.referredByAgentId
          : null;
      const referredAgentId
        = typeof renter.referredByAgentId === "object"
          && renter.referredByAgentId?._id
          ? renter.referredByAgentId._id.toString()
          : typeof renter.referredByAgentId === "string"
            ? renter.referredByAgentId
            : null;
      const referredAgentName
        = referredAgent?.fullName || DEFAULT_REFERRAL_AGENT_NAME;

      if (referredAgentId) {
        const agentProfile
          = await this.agentRepository.findByUserId(referredAgentId);
        if (agentProfile?.acceptingRequests === false) {
          let blockedAgentName = referredAgentName;
          if (!blockedAgentName || blockedAgentName === DEFAULT_REFERRAL_AGENT_NAME) {
            const referredAgentUser
              = await this.userRepository.findById(referredAgentId);
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

    const activeListingCount
      = await this.preMarketRepository.countActiveByRenterId(renterId);

    if (activeListingCount >= 1) {
      throw new BadRequestException(
        "You can have one active request at a time.",
      );
    }

    const requestNumber = activeListingCount + 1; // will be 1 when single limit enforced
    const requestId = await this.generateUniqueRequestId();
    const requestName = requestId;
    const shareConsent = payload.shareConsent === true;
    const scope = payload.scope ?? "Upcoming";
    const referralAgentId
      = await this.resolveRegisteredAgentIdFromRenter(renter);
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
      searchActivity: {
        lastRenterUpdatedAt: new Date(),
        lastConfirmedAt: null,
        lastConfirmationEmailSentAt: null,
        pendingConfirmationToken: null,
        pendingConfirmationSentAt: null,
        pendingConfirmationExpiresAt: null,
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
      title: "Request submitted.",
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

    this.scheduleConsolidatedExcelRefresh(
      {
        renterId,
        requestId: request._id?.toString(),
      },
      "Consolidated Excel update failed after pre-market request creation",
    );

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

    let referringAgentEmail: string = DEFAULT_REGISTERED_AGENT_EMAIL;
    let referringAgentName: string = DEFAULT_REFERRAL_AGENT_NAME;
    let referringAgentTitle: string = DEFAULT_REFERRAL_AGENT_TITLE;
    let referringAgentBrokerage: string = DEFAULT_REFERRAL_AGENT_BROKERAGE;

    const referredAgent = renter.referredByAgentId as any;
    const referredAgentId
      = referredAgent?._id?.toString?.()
        ?? (typeof renter.referredByAgentId === "string"
          ? renter.referredByAgentId
          : null);

    if (typeof referredAgent === "object") {
      if (referredAgent?.email) {
        referringAgentEmail = referredAgent.email;
      }
      if (referredAgent?.fullName) {
        referringAgentName = referredAgent.fullName;
      }
    }

    if (referredAgentId) {
      const agentProfile = await this.agentRepository.findByUserId(referredAgentId);
      if (agentProfile?.title) {
        referringAgentTitle = agentProfile.title;
      }
      if (agentProfile?.brokerageName) {
        referringAgentBrokerage = agentProfile.brokerageName;
      }
    }

    const renterData = {
      renterId: resolvedRenterId,
      renterName: renter.fullName,
      renterEmail: renter.email,
      renterPhone: renter.phoneNumber,
      referringAgentEmail,
      referringAgentName,
      referringAgentTitle,
      referringAgentBrokerage,
      registrationType: renter.registrationType,
      registeredAgentUserId:
        renter.registrationType === "agent_referral" ? referredAgentId : null,
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

      const exists
        = await this.preMarketRepository.findByRequestIdIncludingDeleted(
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
    const archiveFilter = this.buildAgentArchiveExclusionFilter(agentId);
    const requestFilter = this.buildAgentRequestFilter(query);
    const combinedFilters = this.mergeFilters([
      visibilityFilter,
      cutoffFilter,
      archiveFilter,
      requestFilter,
    ]);
    const agentOwnedAccessRecords
      = await this.grantAccessRepository.findByAgentIdAndStatuses(agentId, [
        "free",
        "paid",
      ]);
    const excludedRequestIds = Array.from(
      new Set(
        agentOwnedAccessRecords
          .filter(
            record => record.representation_type !== "owner_representation",
          )
          .map(record => record.preMarketRequestId?.toString())
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const paginated
      = excludedRequestIds.length > 0
        ? await this.preMarketRepository.findAllWithPaginationExcludingIds(
            query,
            excludedRequestIds,
            combinedFilters,
          )
        : await this.preMarketRepository.findAllWithPagination(
            query,
            combinedFilters,
          );

    const requestIds = paginated.data
      .map(request => request._id?.toString())
      .filter(Boolean);

    const [grantAccessRecords, globalMatchedScopeRequestIds]
      = await Promise.all([
        this.grantAccessRepository.findByAgentIdAndRequestIds(
          agentId,
          requestIds as string[],
        ),
        this.getGlobalMatchedScopeRequestIdSet(requestIds as string[]),
      ]);

    const grantAccessByRequestId = new Map(
      grantAccessRecords.map(record => [
        record.preMarketRequestId.toString(),
        record,
      ]),
    );
    const matchedScopeRequestIds = requestIds.filter(requestId =>
      globalMatchedScopeRequestIds.has(requestId as string),
    ) as string[];
    const [renterContext, matchedAgentByRequestId] = await Promise.all([
      this.buildRequestRenterContext(paginated.data),
      this.buildMatchedAgentByRequestId(matchedScopeRequestIds),
    ]);

    const enrichedData = paginated.data.map((request) => {
      const grantAccess = request._id
        ? grantAccessByRequestId.get(request._id.toString()) || null
        : null;
      const requestId = request._id?.toString() || "";
      const renterId = this.normalizeUserId(request.renterId);
      const accessSummary = this.buildAgentAccessSummary(
        grantAccess,
        hasGrantAccess,
      );
      const isOwnerRepresentationAccess
        = grantAccess?.representation_type === "owner_representation";
      const isMatched
        = !isOwnerRepresentationAccess
          && grantAccess
          && (grantAccess.status === "free" || grantAccess.status === "paid");
      const isRejected
        = !hasGrantAccess
          && !isOwnerRepresentationAccess
          && grantAccess?.status === "rejected";
      const hasRequestedAccess
        = !hasGrantAccess
          && !isOwnerRepresentationAccess
          && grantAccess
          && grantAccess.status !== "free"
          && grantAccess.status !== "paid"
          && grantAccess.status !== "rejected";
      const listingStatus = isMatched
        ? "matched"
        : isRejected
          ? "rejected"
          : hasRequestedAccess
            ? "requested"
            : request.status;
      const displayStatus = grantAccess && !isOwnerRepresentationAccess
        ? accessSummary.grantAccessStatus
        : request.status;
      const visibleScope = this.resolveAgentVisibleScope(
        request.scope,
        globalMatchedScopeRequestIds.has(requestId),
      );
      const currentRegisteredAgentId
        = renterContext.registeredAgentIdByRequestId.get(requestId) ?? null;
      const isCurrentRegisteredAgent = currentRegisteredAgentId === agentId;
      const matchedByAgent
        = globalMatchedScopeRequestIds.has(requestId)
          ? matchedAgentByRequestId.get(requestId) ?? null
          : null;
      const referralInfo = renterId
        ? renterContext.referralInfoByRenterId.get(renterId) ?? null
        : null;
      const renterName = referralInfo?.renterName ?? null;
      const registrationDisclosureStatus
        = this.getRegistrationDisclosureStatus(request, agentId);
      const ownerRepresentationStatus = isCurrentRegisteredAgent
        ? this.getOwnerRepresentationStatus(request)
        : {
            ownerRepresentationMatchCount: 0,
            hasOwnerRepresentationMatches: false,
            hasNewOwnerRepresentationMatches: false,
          };
      const visibleRequest
        = this.stripOwnerRepresentationMatchesForNonRegisteredAgent(
          request,
          isCurrentRegisteredAgent,
        );

      return {
        ...visibleRequest,
        scope: visibleScope,
        matchedByAgent,
        referralAgentId:
            currentRegisteredAgentId
            ?? this.normalizeUserId(
              (request as unknown as {
                referralAgentId?: string | Types.ObjectId;
              }).referralAgentId,
            ),
        referralInfo,
        renterName,
        status: displayStatus,
        listingStatus,
        grantAccessStatus: accessSummary.grantAccessStatus,
        grantAccessId: accessSummary.grantAccessId,
        representation_type: accessSummary.representation_type,
        representationSelectedAt: accessSummary.representationSelectedAt,
        accessType: accessSummary.accessType,
        canRequestAccess: accessSummary.canRequestAccess,
        ownerRepresentationSelected: this.hasOwnerRepresentationMatchForAgent(
          request,
          agentId,
        ),
        ...ownerRepresentationStatus,
        ...registrationDisclosureStatus,
      };
    });

    return {
      ...paginated,
      data: enrichedData,
    } as any;
  }

  async searchApartmentMatchesForAgent(
    agentId: string,
    apartment: MatchApartmentInput,
    query: { page: number; limit: number },
  ): Promise<{
    data: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNext: boolean;
      hasPrev: boolean;
      nextPage: number | null;
      prevPage: number | null;
    };
  }> {
    const agent = await this.agentRepository.findByUserId(agentId);
    if (!agent) {
      throw new NotFoundException("Agent profile not found");
    }

    const hasGrantAccess = agent.hasGrantAccess === true;
    const visibilityFilter = await this.buildRequestVisibilityFilterForAgent(
      agentId,
    );
    const cutoffFilter = this.buildAgentVisibilityFilter(agent);
    const archiveFilter = this.buildAgentArchiveExclusionFilter(agentId);
    const combinedFilters = this.mergeFilters([
      visibilityFilter,
      cutoffFilter,
      archiveFilter,
    ]);
    const requests
      = await this.preMarketRepository.findAllForMatchSearch(combinedFilters);
    setPerformanceMetric("matchSearch.totalCandidatesLoaded", requests.length);
    const requestIds = requests
      .map(request => request._id?.toString())
      .filter((requestId): requestId is string => Boolean(requestId));

    const [grantAccessRecords, globalMatchedScopeRequestIds] = await Promise.all([
      this.grantAccessRepository.findByAgentIdAndRequestIds(agentId, requestIds),
      this.getGlobalMatchedScopeRequestIdSet(requestIds),
    ]);
    const matchVisibleRequests: IPreMarketRequest[] = [];
    for (const request of requests) {
      const requestId = request._id?.toString() || "";
      const isMatchVisible
        = request.scope !== "All Market"
          || globalMatchedScopeRequestIds.has(requestId);

      if (!isMatchVisible) {
        continue;
      }

      matchVisibleRequests.push(request);
    }
    const registeredAgentContext = await this.buildRegisteredAgentContext(
      matchVisibleRequests,
    );
    const grantAccessByRequestId = new Map(
      grantAccessRecords.map(record => [
        record.preMarketRequestId.toString(),
        record,
      ]),
    );

    let scoringExecutionTimeMs = 0;
    let disqualifiedCount = 0;
    setPerformanceMetric("matchSearch.candidatesScored", matchVisibleRequests.length);

    const ranked: Array<{
      request: IPreMarketRequest;
      requestId: string;
      renterId: string | null;
      grantAccess: IGrantAccessRequest | null;
      isAlreadyMatchedByAgent: boolean;
      currentRegisteredAgentId: string | null;
      isCurrentRegisteredAgent: boolean;
      registrationDisclosureStatus: Record<string, any>;
      scoreResult: any;
    }> = [];

    for (const request of matchVisibleRequests) {
      const requestId = request._id?.toString() || "";
      const renterId = this.normalizeUserId(request.renterId);
      const grantAccess = grantAccessByRequestId.get(requestId) || null;
      const isOwnerRepresentationAccess
        = grantAccess?.representation_type === "owner_representation";
      const isAlreadyMatchedByAgent = Boolean(
        grantAccess
        && !isOwnerRepresentationAccess
        && ["pending", "approved", "free", "paid"].includes(
          String(grantAccess.status),
        ),
      );
      const currentRegisteredAgentId
        = registeredAgentContext.registeredAgentIdByRequestId.get(requestId)
          ?? null;
      const isCurrentRegisteredAgent = currentRegisteredAgentId === agentId;
      const registrationDisclosureStatus
        = this.getRegistrationDisclosureStatus(request, agentId);
      const scoringStartedAt = nowMs();
      const scoreResult = scorePreMarketRequest(apartment, {
        bedrooms: request.bedrooms,
        bathrooms: request.bathrooms,
        priceRange: request.priceRange,
        locations: request.locations,
        movingDateRange: request.movingDateRange,
        unitFeatures: request.unitFeatures,
        buildingFeatures: request.buildingFeatures,
        petPolicy: request.petPolicy,
        guarantorRequired: request.guarantorRequired,
        preferences: request.preferences,
        registrationDisclosureConfirmed: isCurrentRegisteredAgent
          ? registrationDisclosureStatus.registrationDisclosureConfirmed
          : undefined,
      });
      scoringExecutionTimeMs += nowMs() - scoringStartedAt;

      if (scoreResult.disqualified) {
        disqualifiedCount += 1;
        continue;
      }

      ranked.push({
        request,
        requestId,
        renterId,
        grantAccess,
        isAlreadyMatchedByAgent,
        currentRegisteredAgentId,
        isCurrentRegisteredAgent,
        registrationDisclosureStatus,
        scoreResult,
      });
    }
    addPerformanceTiming("scoringExecutionTimeMs", scoringExecutionTimeMs);
    setPerformanceMetric("matchSearch.disqualified", disqualifiedCount);

    ranked.sort((a, b) => {
      if (b.scoreResult.score !== a.scoreResult.score) {
        return b.scoreResult.score - a.scoreResult.score;
      }

      return (
        new Date(b.request.createdAt ?? 0).getTime()
          - new Date(a.request.createdAt ?? 0).getTime()
      );
    });
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const totalItems = ranked.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const currentPage = Math.min(
      Math.max(1, Number(query.page) || 1),
      totalPages,
    );
    const start = (currentPage - 1) * limit;
    const pagedCandidates = ranked.slice(start, start + limit);
    const pagedRequests = pagedCandidates.map(candidate => candidate.request);
    setPerformanceMetric("matchSearch.returnedAfterPagination", pagedCandidates.length);

    const enrichmentStartedAt = nowMs();
    const pagedMatchedVisibleRequestIds = pagedCandidates
      .map(candidate => candidate.requestId)
      .filter(requestId => globalMatchedScopeRequestIds.has(requestId));
    const [referralInfoByRenterId, matchedAgentByRequestId] = await Promise.all([
      this.buildReferralInfoByRenterIdFromContext(
        pagedRequests,
        registeredAgentContext.renterByUserId,
      ),
      this.buildMatchedAgentByRequestId(pagedMatchedVisibleRequestIds),
    ]);
    const data = pagedCandidates.map((candidate) => {
      const {
        request,
        requestId,
        renterId,
        grantAccess,
        isAlreadyMatchedByAgent,
        currentRegisteredAgentId,
        isCurrentRegisteredAgent,
        registrationDisclosureStatus,
        scoreResult,
      } = candidate;
      const accessSummary = this.buildAgentAccessSummary(
        grantAccess,
        hasGrantAccess,
      );
      const listingStatus = isAlreadyMatchedByAgent
        ? "matched"
        : request.status;
      const displayStatus = isAlreadyMatchedByAgent
        ? accessSummary.grantAccessStatus
        : request.status;
      const visibleScope = this.resolveAgentVisibleScope(
        request.scope,
        globalMatchedScopeRequestIds.has(requestId),
      );
      const matchedByAgent
        = globalMatchedScopeRequestIds.has(requestId)
          ? matchedAgentByRequestId.get(requestId) ?? null
          : null;
      const referralInfo = renterId
        ? referralInfoByRenterId.get(renterId) ?? null
        : null;
      const ownerRepresentationStatus = isCurrentRegisteredAgent
        ? this.getOwnerRepresentationStatus(request)
        : {
            ownerRepresentationMatchCount: 0,
            hasOwnerRepresentationMatches: false,
            hasNewOwnerRepresentationMatches: false,
          };
      const visibleRequest
        = this.stripOwnerRepresentationMatchesForNonRegisteredAgent(
          request,
          isCurrentRegisteredAgent,
        );

      return {
        ...visibleRequest,
        scope: visibleScope,
        matchedByAgent,
        referralAgentId:
            currentRegisteredAgentId
            ?? this.normalizeUserId(
              (request as unknown as {
                referralAgentId?: string | Types.ObjectId;
              }).referralAgentId,
            ),
        referralInfo,
        renterName: referralInfo?.renterName ?? null,
        status: displayStatus,
        listingStatus,
        grantAccessStatus: accessSummary.grantAccessStatus,
        grantAccessId: accessSummary.grantAccessId,
        representation_type: accessSummary.representation_type,
        representationSelectedAt: accessSummary.representationSelectedAt,
        accessType: accessSummary.accessType,
        canRequestAccess: accessSummary.canRequestAccess,
        ownerRepresentationSelected: this.hasOwnerRepresentationMatchForAgent(
          request,
          agentId,
        ),
        alreadyMatchedByAgent: isAlreadyMatchedByAgent,
        matchScore: scoreResult.score,
        matchStarRating: scoreResult.starRating,
        matchMissingFeatures: scoreResult.missingFeatures,
        matchPreferenceMatches: apartment.toggles.priorityBonuses
          ? scoreResult.preferenceMatches
          : null,
        matchPriorityBonus: scoreResult.priorityBonus,
        matchPrimaryDeduction: scoreResult.primaryDeduction,
        matchSecondaryDeduction: scoreResult.secondaryDeduction,
        ...ownerRepresentationStatus,
        ...registrationDisclosureStatus,
      };
    });
    addPerformanceTiming("enrichmentExecutionTimeMs", nowMs() - enrichmentStartedAt);

    return {
      data,
      pagination: {
        currentPage,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1,
        nextPage: currentPage < totalPages ? currentPage + 1 : null,
        prevPage: currentPage > 1 ? currentPage - 1 : null,
      },
    };
  }

  async getRenterRequests(
    renterId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResponse<IPreMarketRequest>> {
    const [result, renter] = await Promise.all([
      this.preMarketRepository.findByRenterId(renterId, query),
      this.renterRepository.findRenterWithReferrer(renterId),
    ]);

    const enrichedData = await Promise.all(
      result.data.map(async (request) => {
        const archiveDisplay = await this.buildRenterArchiveDisplay(
          request,
          renter,
        );

        return {
          ...request,
          archiveDisplay,
        };
      }),
    );

    return {
      ...result,
      data: enrichedData,
    } as any;
  }

  async syncRequestOwnershipForRenter(renterId: string): Promise<void> {
    const renter = await this.renterRepository.findRenterWithReferrer(renterId);
    if (!renter) {
      throw new NotFoundException("Renter not found");
    }

    const registeredAgentId
      = await this.resolveRegisteredAgentIdFromRenter(renter);
    const modifiedCount
      = await this.preMarketRepository.syncRequestOwnershipForRenter(
        renterId,
        registeredAgentId,
      );

    logger.info(
      {
        renterId,
        registeredAgentId,
        modifiedCount,
      },
      "Synchronized pre-market request ownership for renter",
    );
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

  /**
   * Updates a renter-owned pre-market request and resets search-confirmation tracking.
   * Expects the renter user ID, request ID, and partial request payload from the renter dashboard.
   * Can fail when the request is missing, owned by another renter, or date/price updates are invalid.
   */
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

    const changedFieldDetails = this.buildChangedFieldsSummary(request, payload);
    const now = new Date();
    const nextPayload = {
      ...(payload as Partial<IPreMarketRequest>),
      searchActivity: this.resetSearchConfirmationActivity(
        (request as any)?.searchActivity,
        {
          lastRenterUpdatedAt: now,
        },
      ),
    };

    // Update
    const updated = await this.preMarketRepository.updateById(
      requestId,
      nextPayload as Partial<IPreMarketRequest>,
    );

    logger.info({ renterId }, `Pre-market request updated: ${requestId}`);

    const updatedAt = updated?.updatedAt ?? new Date();
    this.notifier
      .notifyAgentsAboutUpdatedRequest(
        updated || request,
        changedFieldDetails.summary,
        changedFieldDetails.newValues,
        updatedAt,
      )
      .catch((error) => {
        logger.error(
          { error, requestId: request._id },
          "Failed to send update notifications (non-blocking)",
        );
      });

    this.scheduleConsolidatedExcelRefresh(
      {
        renterId,
        requestId,
      },
      "Consolidated Excel update failed after pre-market request update",
    );

    return updated!;
  }

  private async notifyAssociatedAgentsRequestClosed(
    request: IPreMarketRequest,
    reason: string,
    closedAt: Date,
    matchedAgentIds?: string[],
  ): Promise<void> {
    const recipients = await this.getRegisteredAndMatchedAgentsForClosedAlert(
      request,
      matchedAgentIds,
    );

    if (recipients.length === 0) {
      logger.info(
        { requestId: request._id, reason },
        "No registered or matched agents to notify about closed request",
      );
      return;
    }

    const requestId = request.requestId || request._id?.toString() || "";
    const formattedClosedAt = this.formatEasternTime(closedAt);
    const renter = await this.renterRepository.findRenterWithReferrer(
      request.renterId.toString(),
    );
    const minPrice = this.formatCurrencyUSD(request.priceRange?.min);
    const maxPrice = this.formatCurrencyUSD(request.priceRange?.max);
    const bedrooms
      = Array.isArray(request.bedrooms) && request.bedrooms.length > 0
        ? request.bedrooms.join(", ")
        : "Any";
    const bathrooms
      = Array.isArray(request.bathrooms) && request.bathrooms.length > 0
        ? request.bathrooms.join(", ")
        : "Any";
    const earliestDate = this.formatDateValue(
      request.movingDateRange?.earliest,
    );
    const latestDate = this.formatDateValue(request.movingDateRange?.latest);
    const location = this.formatRequestLocations(request.locations);
    const features = this.formatSharedRequestFeatures(request);
    const preferencesByOrder
      = Array.isArray(request.preferences) && request.preferences.length > 0
        ? request.preferences.map(value => String(value)).join(", ")
        : "Not specified";
    const submittedAt = this.formatEasternTime(
      request.createdAt ? new Date(request.createdAt) : new Date(),
    );

    for (const recipient of recipients) {
      await emailService.sendRenterRequestClosedAgentAlert({
        to: recipient.email,
        agentName: recipient.name,
        renterFullName: renter?.fullName || "N/A",
        renterEmail: renter?.email || "N/A",
        renterPhoneNumber: renter?.phoneNumber || "N/A",
        requestId,
        reason,
        closedAt: formattedClosedAt,
        marketScope: request.scope || "Upcoming",
        minPrice,
        maxPrice,
        earliestDate,
        latestDate,
        bedrooms,
        bathrooms,
        location,
        features,
        preferencesByOrder,
        submittedAt,
      });
    }
  }

  private async getMatchedAgentIdsForClosedAlert(
    preMarketRequestId: string,
  ): Promise<string[]> {
    try {
      const matchedAccessRecords
        = await this.grantAccessRepository.findByPreMarketRequestId(
          preMarketRequestId,
        );

      return Array.from(
        new Set(
          matchedAccessRecords
            .filter(
              record => record.status === "free" || record.status === "paid",
            )
            .map(record => record.agentId.toString()),
        ),
      );
    }
    catch (error) {
      logger.error(
        { error, preMarketRequestId },
        "Failed to load matched agents for closed request alert",
      );
      return [];
    }
  }

  private async getRegisteredAndMatchedAgentsForClosedAlert(
    request: IPreMarketRequest,
    matchedAgentIds?: string[],
  ): Promise<Array<{ name: string; email: string; userId?: string }>> {
    const recipients = new Map<
      string,
      { name: string; email: string; userId?: string }
    >();

    const renter = await this.renterRepository.findRenterWithReferrer(
      request.renterId.toString(),
    );

    if (renter?.referredByAgentId) {
      const referredAgent = renter.referredByAgentId as any;
      const referredAgentId
        = typeof referredAgent === "object" && referredAgent?._id
          ? referredAgent._id.toString()
          : typeof referredAgent === "string"
            ? referredAgent
            : undefined;

      let referredAgentName
        = typeof referredAgent === "object" ? referredAgent.fullName : undefined;
      let referredAgentEmail
        = typeof referredAgent === "object" ? referredAgent.email : undefined;

      if (referredAgentId && (!referredAgentName || !referredAgentEmail)) {
        const referredAgentUser = await this.userRepository.findById(referredAgentId);
        if (referredAgentUser?.fullName) {
          referredAgentName = referredAgentUser.fullName;
        }
        if (referredAgentUser?.email) {
          referredAgentEmail = referredAgentUser.email;
        }
      }

      const email = referredAgentEmail?.trim();
      if (email) {
        recipients.set(email.toLowerCase(), {
          name: referredAgentName || email,
          email,
          userId: referredAgentId,
        });
      }
    }

    const resolvedRequestId = request._id?.toString();
    const matchedIds
      = matchedAgentIds
        || (resolvedRequestId
          ? await this.getMatchedAgentIdsForClosedAlert(resolvedRequestId)
          : []);
    const matchedAgentUsers = await Promise.all(
      matchedIds.map(agentId => this.userRepository.findById(agentId)),
    );

    for (const matchedAgentUser of matchedAgentUsers) {
      if (!matchedAgentUser?.email) {
        continue;
      }

      const email = matchedAgentUser.email.trim();
      if (!email) {
        continue;
      }

      const key = email.toLowerCase();
      if (!recipients.has(key)) {
        recipients.set(key, {
          name: matchedAgentUser.fullName || email,
          email,
          userId: matchedAgentUser._id?.toString(),
        });
      }
    }

    return Array.from(recipients.values());
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
    }
    catch (error) {
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

  private isTuvalMorAgent(agent: {
    fullName?: string | null;
    email?: string | null;
  }): boolean {
    const normalizedName = agent.fullName?.trim().toLowerCase();
    const normalizedEmail = agent.email?.trim().toLowerCase();

    return (
      normalizedName === SYSTEM_DEFAULT_AGENT.fullName.toLowerCase()
      || normalizedEmail === SYSTEM_DEFAULT_AGENT.email.toLowerCase()
    );
  }

  public getRegistrationDisclosureStatus(
    request: IPreMarketRequest | Record<string, any>,
    agentId: string,
  ): {
    registrationDisclosureConfirmed: boolean;
    registrationDisclosureConfirmedAt: Date | null;
  } {
    const confirmations = Array.isArray(
      (request as any)?.registrationDisclosureConfirmations,
    )
      ? (request as any).registrationDisclosureConfirmations
      : [];

    const confirmation = confirmations.find((item: any) => {
      return this.normalizeUserId(item?.agentId) === agentId;
    });

    return {
      registrationDisclosureConfirmed: Boolean(confirmation),
      registrationDisclosureConfirmedAt: confirmation?.confirmedAt ?? null,
    };
  }

  public async ensureRegisteredAgentCanMatchRequest(
    agentId: string,
    request: IPreMarketRequest,
  ): Promise<void> {
    const registeredAgentId
      = await this.resolveRegisteredAgentIdForRequest(request);
    if (registeredAgentId !== agentId) {
      return;
    }

    const registrationStatus = this.getRegistrationDisclosureStatus(
      request,
      agentId,
    );
    if (!registrationStatus.registrationDisclosureConfirmed) {
      throw new ForbiddenException(
        "Registration / Disclosure confirmation is required before matching this request",
      );
    }
  }

  private async ensureAgentCanConfirmRegistrationDisclosure(
    agentId: string,
    requestId: string,
    request: IPreMarketRequest,
  ): Promise<void> {
    const registeredAgentId
      = await this.resolveRegisteredAgentIdForRequest(request);
    if (registeredAgentId === agentId) {
      return;
    }

    const matchedAccess = await this.grantAccessRepository.findByAgentAndRequest(
      agentId,
      requestId,
    );
    const isMatchedRenterRepresentation = Boolean(
      matchedAccess
      && matchedAccess.representation_type !== "owner_representation"
      && REGISTRATION_DISCLOSURE_MATCHED_STATUSES.includes(
        String(matchedAccess.status),
      ),
    );

    if (!isMatchedRenterRepresentation) {
      throw new ForbiddenException("You have not matched this request yet");
    }
  }

  private getAgentArchiveStatus(
    request: IPreMarketRequest | Record<string, any>,
    agentId: string,
  ): {
    isArchivedForAgent: boolean;
    archiveReason: AgentArchiveReason | null;
    archiveReasonLabel: string | null;
    archiveSource: AgentArchiveSource | null;
    archivedAt: Date | null;
  } {
    const archives = Array.isArray((request as any)?.agentArchives)
      ? (request as any).agentArchives
      : [];
    const archive = archives.find((item: any) => {
      return this.normalizeUserId(item?.agentId) === agentId;
    });
    const reason = (archive?.reason ?? null) as AgentArchiveReason | null;

    return {
      isArchivedForAgent: Boolean(archive),
      archiveReason: reason,
      archiveReasonLabel: reason ? ARCHIVE_REASON_LABELS[reason] : null,
      archiveSource: (archive?.source ?? null) as AgentArchiveSource | null,
      archivedAt: archive?.archivedAt ?? null,
    };
  }

  private getRenterVisibleArchive(
    request: IPreMarketRequest | Record<string, any>,
  ): {
    reason: AgentArchiveReason;
    source: AgentArchiveSource;
    archivedAt: Date | null;
  } | null {
    const archives = Array.isArray((request as any)?.agentArchives)
      ? (request as any).agentArchives
      : [];

    const visibleArchives = archives
      .filter((archive: any) => {
        const reason = archive?.reason as AgentArchiveReason | undefined;
        return reason && reason !== "disclosure_missing";
      })
      .sort((left: any, right: any) => {
        const leftTime = left?.archivedAt
          ? new Date(left.archivedAt).getTime()
          : 0;
        const rightTime = right?.archivedAt
          ? new Date(right.archivedAt).getTime()
          : 0;
        return rightTime - leftTime;
      });

    const latest = visibleArchives[0];
    if (!latest?.reason || !latest?.source) {
      return null;
    }

    return {
      reason: latest.reason as AgentArchiveReason,
      source: latest.source as AgentArchiveSource,
      archivedAt: latest.archivedAt ?? null,
    };
  }

  private buildRenterRegistrationLink(
    activationLink: string | null,
    renter: any,
    agentName: string,
  ): string | null {
    const trimmedLink = activationLink?.trim();
    if (!trimmedLink) {
      return null;
    }

    try {
      const url = new URL(trimmedLink);
      if (!url.searchParams.has("env")) {
        url.searchParams.set("env", "na1");
      }

      const renterUser
        = renter?.userId && typeof renter.userId === "object"
          ? renter.userId
          : null;
      const renterName = (
        renter?.fullName
        || renterUser?.fullName
        || ""
      ).trim();
      const renterEmail = (renter?.email || renterUser?.email || "").trim();
      const renterPhone = (
        renter?.phoneNumber
        || renterUser?.phoneNumber
        || ""
      ).trim();

      if (renterName) {
        url.searchParams.set("renter_name", renterName);
      }
      if (renterEmail) {
        url.searchParams.set("renter_email", renterEmail);
      }
      if (renterPhone) {
        url.searchParams.set("renter_phone", renterPhone);
      }
      if (agentName?.trim()) {
        url.searchParams.set("agent_name", agentName.trim());
      }

      return url.toString();
    }
    catch {
      return null;
    }
  }

  private async buildRenterArchiveDisplay(
    request: IPreMarketRequest | Record<string, any>,
    renter: any,
  ): Promise<
    | {
      reason: AgentArchiveReason;
      source: AgentArchiveSource;
      archivedAt: Date | null;
      statusLabel: string;
      eyebrow: string;
      title: string;
      description: string;
      actionLabel?: string;
      actionType?: "external_link" | "reactivate_search";
      actionHref?: string;
    }
    | null
  > {
    const visibleArchive = this.getRenterVisibleArchive(request);
    if (!visibleArchive) {
      return null;
    }

    if (visibleArchive.reason === "registration_missing") {
      const registeredAgentId
        = await this.resolveRegisteredAgentIdForRequest(request as IPreMarketRequest);
      const registeredAgent = await this.getArchiveAgentInfo(registeredAgentId);
      const actionHref = this.buildRenterRegistrationLink(
        registeredAgent.activationLink,
        renter,
        registeredAgent.fullName,
      );

      return {
        reason: visibleArchive.reason,
        source: visibleArchive.source,
        archivedAt: visibleArchive.archivedAt,
        statusLabel: "Search Paused",
        eyebrow: "SEARCH PAUSED",
        title: "Registration Missing",
        description:
          "To resume your search, please complete your Corcoran Client Registration. Once completed, your agent will review and reactivate your request.",
        ...(actionHref
          ? {
              actionLabel: "Complete Registration",
              actionType: "external_link" as const,
              actionHref,
            }
          : {}),
      };
    }

    if (
      visibleArchive.reason === "search_inactive"
      || visibleArchive.reason === "search_inactive_automatic"
    ) {
      return {
        reason: visibleArchive.reason,
        source: visibleArchive.source,
        archivedAt: visibleArchive.archivedAt,
        statusLabel: "Search Paused",
        eyebrow: "SEARCH PAUSED",
        title: "Search Inactive",
        description:
          "We haven't received a recent confirmation that you're still searching. Confirm below to keep your request active.",
        actionLabel: "Yes, I'm Still Searching",
        actionType: "reactivate_search",
      };
    }

    if (visibleArchive.reason === "client_placed") {
      return {
        reason: visibleArchive.reason,
        source: visibleArchive.source,
        archivedAt: visibleArchive.archivedAt,
        statusLabel: "Request Closed",
        eyebrow: "REQUEST CLOSED",
        title: "Apartment Secured",
        description:
          "Congratulations! Your search has been completed and this request is now closed.",
      };
    }

    return null;
  }

  private buildAgentRequestLink(
    requestId: string,
    isRegisteredAgent: boolean,
  ): string {
    const baseUrl = env.CLIENT_URL || "https://beforelisted.com";
    return isRegisteredAgent
      ? `${baseUrl}/agent/dashboard/${requestId}`
      : `${baseUrl}/agent/matches/${requestId}`;
  }

  private getSearchActivity(
    request: IPreMarketRequest | Record<string, any>,
  ): {
    lastRenterUpdatedAt: Date | null;
    lastConfirmedAt: Date | null;
    lastConfirmationEmailSentAt: Date | null;
    pendingConfirmationToken: string | null;
    pendingConfirmationSentAt: Date | null;
    pendingConfirmationExpiresAt: Date | null;
    lastConfirmedToken: string | null;
    lastConfirmedTokenUsedAt: Date | null;
  } {
    const searchActivity = (request as any)?.searchActivity ?? {};

    return {
      lastRenterUpdatedAt: searchActivity.lastRenterUpdatedAt ?? null,
      lastConfirmedAt: searchActivity.lastConfirmedAt ?? null,
      lastConfirmationEmailSentAt:
        searchActivity.lastConfirmationEmailSentAt ?? null,
      pendingConfirmationToken: searchActivity.pendingConfirmationToken ?? null,
      pendingConfirmationSentAt: searchActivity.pendingConfirmationSentAt ?? null,
      pendingConfirmationExpiresAt:
        searchActivity.pendingConfirmationExpiresAt ?? null,
      lastConfirmedToken: searchActivity.lastConfirmedToken ?? null,
      lastConfirmedTokenUsedAt: searchActivity.lastConfirmedTokenUsedAt ?? null,
    };
  }

  private buildActiveRequestConfirmationLink(token: string): string {
    const baseUrl = this.getPublicApiBaseUrl();
    return `${baseUrl}/pre-market/confirm-active-search?token=${encodeURIComponent(
      token,
    )}`;
  }

  private getPublicApiBaseUrl(): string {
    const basePath = (env.BASE_URL.startsWith("/")
      ? env.BASE_URL
      : `/${env.BASE_URL}`).replace(/\/+$/, "");

    if (env.PUBLIC_API_BASE_URL) {
      return env.PUBLIC_API_BASE_URL.replace(/\/+$/, "");
    }

    const clientUrl = (env.CLIENT_URL || "https://beforelisted.com").replace(
      /\/+$/,
      "",
    );

    try {
      const clientHostname = new URL(clientUrl).hostname.toLowerCase();
      const normalizedClientHostname = clientHostname.replace(/^www\./, "");

      if (normalizedClientHostname === "beforelisted.com") {
        return `${DEFAULT_PRODUCTION_API_ORIGIN}${basePath}`;
      }
    }
    catch {
      // Fall back to the configured client URL below if it is not parseable.
    }

    return `${clientUrl}${basePath}`;
  }

  private getSearchConfirmationAnchor(
    request: IPreMarketRequest | Record<string, any>,
    latestMatchedAt?: Date | null,
  ): Date {
    const searchActivity = this.getSearchActivity(request);
    const anchors = [
      request.createdAt,
      latestMatchedAt ?? null,
      searchActivity.lastRenterUpdatedAt,
      searchActivity.lastConfirmedAt,
    ].filter((value): value is Date => Boolean(value));

    return anchors.reduce((latest, current) =>
      current.getTime() > latest.getTime() ? current : latest,
    );
  }

  private clearPendingSearchConfirmationState(
    searchActivity?: Record<string, any> | null,
  ) {
    return {
      ...(searchActivity ?? {}),
      pendingConfirmationToken: null,
      pendingConfirmationSentAt: null,
      pendingConfirmationExpiresAt: null,
    };
  }

  private resetSearchConfirmationActivity(
    searchActivity: Record<string, any> | null | undefined,
    updates: Partial<{
      lastRenterUpdatedAt: Date;
      lastConfirmedAt: Date;
      lastConfirmedToken: string;
      lastConfirmedTokenUsedAt: Date;
    }> = {},
  ) {
    return {
      ...this.clearPendingSearchConfirmationState(searchActivity),
      ...updates,
    };
  }

  getAgentArchiveStatusForRequest(
    request: IPreMarketRequest | Record<string, any>,
    agentId: string,
  ) {
    return this.getAgentArchiveStatus(request, agentId);
  }

  private getOwnerRepresentationStatus(
    request: IPreMarketRequest | Record<string, any>,
  ): {
    ownerRepresentationMatchCount: number;
    hasOwnerRepresentationMatches: boolean;
    hasNewOwnerRepresentationMatches: boolean;
  } {
    const matches = Array.isArray((request as any)?.ownerRepresentationMatches)
      ? (request as any).ownerRepresentationMatches
      : [];

    return {
      ownerRepresentationMatchCount: matches.length,
      hasOwnerRepresentationMatches: matches.length > 0,
      hasNewOwnerRepresentationMatches: matches.some(
        (match: any) => !match?.viewedAt,
      ),
    };
  }

  private hasOwnerRepresentationMatchForAgent(
    request: IPreMarketRequest | Record<string, any>,
    agentId: string,
  ): boolean {
    const matches = Array.isArray((request as any)?.ownerRepresentationMatches)
      ? (request as any).ownerRepresentationMatches
      : [];

    return matches.some((match: any) => {
      return this.normalizeUserId(match?.agentId) === agentId;
    });
  }

  private stripOwnerRepresentationMatchesForNonRegisteredAgent<
    T extends Record<string, any>,
  >(payload: T,
    isRegisteredAgent: boolean,
  ): T {
    if (isRegisteredAgent) {
      return payload;
    }

    const { ownerRepresentationMatches: _ownerRepresentationMatches, ...rest }
      = payload;
    return rest as T;
  }

  private async buildOwnerRepresentationMatches(
    request: IPreMarketRequest | Record<string, any>,
  ): Promise<
    Array<{
      agentId: string;
      fullName: string;
      title: string;
      brokerage: string;
      email: string;
      phoneNumber: string;
      representation_type: "owner_representation";
      selectedAt: Date | null;
      viewedAt: Date | null;
      isViewed: boolean;
    }>
  > {
    const matches = Array.isArray((request as any)?.ownerRepresentationMatches)
      ? (request as any).ownerRepresentationMatches
      : [];

    const enriched = await Promise.all(
      matches.map(async (match: any) => {
        const agentId = this.normalizeUserId(match?.agentId) || "";
        const agentDetails = await this.resolveOwnerRepresentationAgentDetails(
          agentId,
        );

        return {
          agentId,
          fullName:
            agentDetails.fullName
            || match?.fullName
            || match?.email
            || "Matched Agent",
          title:
            agentDetails.title
            || match?.title
            || "Licensed Real Estate Salesperson",
          brokerage:
            agentDetails.brokerage
            || match?.brokerage
            || "The Corcoran Group",
          email: agentDetails.email || match?.email || "N/A",
          phoneNumber:
            agentDetails.phoneNumber || match?.phoneNumber || "N/A",
          representation_type: "owner_representation" as const,
          selectedAt: match?.selectedAt ?? null,
          viewedAt: match?.viewedAt ?? null,
          isViewed: Boolean(match?.viewedAt),
        };
      }),
    );

    return enriched.sort((a, b) => {
      const timeA = a.selectedAt ? new Date(a.selectedAt).getTime() : 0;
      const timeB = b.selectedAt ? new Date(b.selectedAt).getTime() : 0;
      return timeA - timeB;
    });
  }

  private async resolveOwnerRepresentationAgentDetails(
    agentId: string,
  ): Promise<{
    fullName: string;
    title: string;
    brokerage: string;
    email: string;
    phoneNumber: string;
  }> {
    if (!agentId) {
      return {
        fullName: "",
        title: "",
        brokerage: "",
        email: "",
        phoneNumber: "",
      };
    }

    let agentUser = await this.userRepository.findById(agentId);
    let agentProfile = await this.agentRepository.findByUserId(agentId);

    if (!agentUser) {
      const profileById = await this.agentRepository.findById(agentId);
      const profileUserId = this.normalizeUserId(
        profileById?.userId as any,
      );

      if (profileUserId) {
        agentUser = await this.userRepository.findById(profileUserId);
        agentProfile = profileById || agentProfile;
      }
    }

    return {
      fullName: agentUser?.fullName || agentUser?.email || "",
      title: agentProfile?.title || "",
      brokerage: agentProfile?.brokerageName || "",
      email: agentUser?.email || "",
      phoneNumber: agentUser?.phoneNumber || "",
    };
  }

  private async resolveRegisteredAgentIdFromRenter(
    renter: any,
  ): Promise<string | null> {
    if (!renter) {
      return null;
    }

    const referredAgentId = this.normalizeUserId(renter.referredByAgentId);
    if (referredAgentId) {
      return referredAgentId;
    }

    const defaultAgent = await this.getDefaultReferralAgent();
    return defaultAgent.id || null;
  }

  private async getCurrentAgentReferralRenterUserIds(
    agentId: string,
  ): Promise<string[]> {
    const renters = await this.renterRepository.findRentersByAgent(agentId);

    return Array.from(
      new Set(
        renters
          .filter(renter => renter.registrationType === "agent_referral")
          .map(renter => this.normalizeUserId(renter.userId))
          .filter((userId): userId is string => Boolean(userId)),
      ),
    );
  }

  private async resolveRegisteredAgentIdForRequest(
    request: IPreMarketRequest,
  ): Promise<string | null> {
    const renter = await this.renterRepository.findRenterWithReferrer(
      request.renterId.toString(),
    );
    if (renter) {
      const currentRegisteredAgentId
        = await this.resolveRegisteredAgentIdFromRenter(renter);
      if (currentRegisteredAgentId) {
        return currentRegisteredAgentId;
      }
    }

    return this.normalizeUserId(
      (request as unknown as { referralAgentId?: string | Types.ObjectId })
        .referralAgentId,
    );
  }

  public async isRegisteredAgentForRequest(
    agentId: string,
    request: IPreMarketRequest,
  ): Promise<boolean> {
    const registeredAgentId
      = await this.resolveRegisteredAgentIdForRequest(request);

    return registeredAgentId === agentId;
  }

  private parseCsvQueryValue(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.flatMap(item => this.parseCsvQueryValue(item));
    }

    if (typeof value !== "string") {
      return [];
    }

    return value
      .split(",")
      .map(item => item.trim())
      .filter(Boolean);
  }

  private parseFilterDate(value: unknown, endOfDay = false): Date | null {
    if (typeof value !== "string" || !value.trim()) {
      return null;
    }

    const date = new Date(
      `${value.trim()}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`,
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  private buildAgentRequestFilter(query: PaginationQuery): Record<string, any> {
    const filters: Array<Record<string, any>> = [];
    const borough
      = typeof query.borough === "string" ? query.borough.trim() : "";
    const bedrooms = this.parseCsvQueryValue(query.bedrooms).filter(value =>
      ["Studio", "1BR", "2BR", "3BR", "4BR+"].includes(value),
    );
    const bathrooms = this.parseCsvQueryValue(query.bathrooms).filter(value =>
      ["1", "2", "3", "4+"].includes(value),
    );
    const rent = Number(query.rent);
    const movingDateEarliest = this.parseFilterDate(query.movingDateEarliest);
    const movingDateLatest = this.parseFilterDate(query.movingDateLatest, true);
    const unitFeatureKeys = new Set([
      "laundryInUnit",
      "privateOutdoorSpace",
      "dishwasher",
    ]);
    const buildingFeatureKeys = new Set([
      "doorman",
      "elevator",
      "laundryInBuilding",
    ]);
    const petPolicyKeys = new Set(["catsAllowed", "dogsAllowed"]);
    const guarantorKeys = new Set([
      "personalGuarantor",
      "thirdPartyGuarantor",
    ]);
    const availableFeatureAliases: Record<string, string[]> = {
      lotsOfStorage: ["Lots of Storage"],
      lotsOfLight: ["Lots of Light"],
      gymInBuilding: ["Gym in Building"],
      largeApartment: ["Large Apartment"],
      openViews: ["Open Views"],
      newRenovation: ["New Renovation", "New Ranovation"],
      openKitchen: ["Open Kitchen"],
      highCeilings: ["High Ceilings"],
      ifWalkUpBelow3rdFloor: [
        "If Walk-Up: Below 3rd Floor",
        "If Walk-Up: Prefer Lower Floors",
      ],
      notGroundFloor: [
        "Not Ground Floor",
        "Avoid Ground Floor",
        "Avoid the Ground Floor",
      ],
    };

    if (borough) {
      filters.push({ "locations.borough": borough });
    }

    if (bedrooms.length > 0) {
      filters.push({ bedrooms: { $in: bedrooms } });
    }

    if (bathrooms.length > 0) {
      filters.push({ bathrooms: { $in: bathrooms } });
    }

    if (Number.isFinite(rent) && rent >= 0) {
      filters.push({ "priceRange.max": { $gte: rent } });
    }

    if (movingDateEarliest) {
      filters.push({ "movingDateRange.latest": { $gte: movingDateEarliest } });
    }

    if (movingDateLatest) {
      filters.push({ "movingDateRange.earliest": { $lte: movingDateLatest } });
    }

    this.parseCsvQueryValue(query.unitFeatures)
      .filter(key => unitFeatureKeys.has(key))
      .forEach(key => filters.push({ [`unitFeatures.${key}`]: true }));

    this.parseCsvQueryValue(query.buildingFeatures)
      .filter(key => buildingFeatureKeys.has(key))
      .forEach(key => filters.push({ [`buildingFeatures.${key}`]: true }));

    this.parseCsvQueryValue(query.petPolicy)
      .filter(key => petPolicyKeys.has(key))
      .forEach(key => filters.push({ [`petPolicy.${key}`]: true }));

    this.parseCsvQueryValue(query.guarantorRequired)
      .filter(key => guarantorKeys.has(key))
      .forEach(key => filters.push({ [`guarantorRequired.${key}`]: true }));

    this.parseCsvQueryValue(query.availableFeatures).forEach((key) => {
      const aliases = availableFeatureAliases[key];
      if (aliases?.length) {
        filters.push({ preferences: { $in: aliases } });
      }
    });

    return this.mergeFilters(filters);
  }

  private mergeFilters(filters: Array<Record<string, any>>): Record<string, any> {
    const active = filters.filter(
      filter => filter && Object.keys(filter).length > 0,
    );
    if (active.length === 0) {
      return {};
    }
    if (active.length === 1) {
      return active[0];
    }
    return { $and: active };
  }

  private buildAgentArchiveExclusionFilter(agentId: string): Record<string, any> {
    return {
      "agentArchives.agentId": { $ne: new Types.ObjectId(agentId) },
    };
  }

  private async buildRequestVisibilityFilterForAgent(
    agentId: string,
  ): Promise<Record<string, any>> {
    const currentAgentReferralRenterIds
      = await this.getCurrentAgentReferralRenterUserIds(agentId);

    const privateVisibilityClauses: Record<string, any>[] = [
      {
        $and: [{ visibility: "PRIVATE" }, { referralAgentId: agentId }],
      },
    ];

    if (currentAgentReferralRenterIds.length > 0) {
      privateVisibilityClauses.push({
        $and: [
          { visibility: "PRIVATE" },
          { renterId: { $in: currentAgentReferralRenterIds } },
        ],
      });
    }

    return {
      $or: [
        ...privateVisibilityClauses,
        {
          $and: [{ visibility: "SHARED" }, { shareConsent: true }],
        },
      ],
    };
  }

  public async ensureAgentCanViewRequestVisibility(
    agentId: string,
    request: IPreMarketRequest,
  ): Promise<void> {
    const visibility
      = (request as unknown as { visibility?: string }).visibility ?? "PRIVATE";
    const isSharedWithConsent
      = visibility === "SHARED" && request.shareConsent === true;
    if (isSharedWithConsent) {
      return;
    }

    const registeredAgentId
      = await this.resolveRegisteredAgentIdForRequest(request);
    if (registeredAgentId && registeredAgentId === agentId) {
      return;
    }

    throw new ForbiddenException("This request is not available");
  }

  private async notifyRenterRequestClosed(
    request: IPreMarketRequest,
    reason: string,
    closedAt: Date,
  ): Promise<void> {
    const renterIdValue
      = typeof request.renterId === "string"
        ? request.renterId
        : request.renterId?.toString();

    if (!renterIdValue) {
      logger.warn(
        { requestId: request._id },
        "Invalid renter ID for request closed notification",
      );
      return;
    }

    const renter
      = await this.renterRepository.findRenterWithReferrer(renterIdValue);
    if (!renter) {
      logger.warn(
        { renterId: renterIdValue },
        "Renter not found for request closed notification",
      );
      return;
    }

    if (!renter.email) {
      logger.warn(
        { renterId: renterIdValue, requestId: request._id },
        "Renter email missing for request closed notification",
      );
      return;
    }

    const renterFirstName = renter.fullName?.trim().split(" ")[0] || "Renter";
    const requestIdentifier = request.requestId || request._id?.toString() || "N/A";

    await emailService.sendRenterRequestClosedRenterNotification({
      to: renter.email,
      renterFirstName,
      requestId: requestIdentifier,
      reason,
      closedAt: this.formatEasternTime(closedAt),
    });
  }

  private async notifyRenterAboutAdminDeletion(
    request: IPreMarketRequest,
  ): Promise<void> {
    const renterIdValue
      = typeof request.renterId === "string"
        ? request.renterId
        : request.renterId?.toString();

    if (!renterIdValue) {
      logger.warn(
        { requestId: request._id },
        "Invalid renter ID for admin deletion notification",
      );
      return;
    }

    const renter
      = await this.renterRepository.findRenterWithReferrer(renterIdValue);
    if (!renter) {
      logger.warn(
        { renterId: renterIdValue },
        "Renter not found for admin deletion notification",
      );
      return;
    }

    const listingTitle
      = request.requestName || request.requestId || "pre-market listing";

    const renterUserId
      = this.normalizeUserId(renter.userId ?? renterIdValue) ?? renterIdValue;

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

  private buildChangedFieldsSummary(
    request: IPreMarketRequest,
    payload: Record<string, unknown>,
  ): { summary: string[]; newValues: string[] } {
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

    const summary: string[] = [];
    const newValues: string[] = [];

    Object.keys(payload).forEach((key) => {
      const originalValue = (request as unknown as Record<string, unknown>)[key];
      const nextValue = payload[key];
      if (!this.areValuesEqual(originalValue, nextValue)) {
        summary.push(fieldLabels[key] || this.humanizeFieldName(key));
        newValues.push(this.formatChangedFieldValue(key, nextValue));
      }
    });

    if (summary.length === 0) {
      return {
        summary: ["Request details updated"],
        newValues: ["Not specified"],
      };
    }

    return { summary, newValues };
  }

  private formatChangedFieldValue(key: string, value: unknown): string {
    if (value === null || value === undefined) {
      return "Not specified";
    }

    if (key === "priceRange" && this.isRecord(value)) {
      const min = value.min;
      const max = value.max;
      if (typeof min === "number" && typeof max === "number") {
        return `$${min} - $${max}`;
      }
    }

    if (key === "movingDateRange" && this.isRecord(value)) {
      const earliest = value.earliest;
      const latest = value.latest;
      if (earliest && latest) {
        return `${this.formatDateValue(earliest)} - ${this.formatDateValue(latest)}`;
      }
    }

    if (key === "locations" && Array.isArray(value)) {
      const formattedLocations = value
        .map((location) => {
          if (!this.isRecord(location)) {
            return this.formatSimpleValue(location);
          }

          const borough
            = typeof location.borough === "string"
              ? location.borough
              : "Unknown borough";
          const neighborhoods = Array.isArray(location.neighborhoods)
            ? location.neighborhoods
                .map(neighborhood => this.formatSimpleValue(neighborhood))
                .filter(Boolean)
            : [];

          return neighborhoods.length > 0
            ? `${borough} (${neighborhoods.join(", ")})`
            : borough;
        })
        .filter(Boolean);

      return formattedLocations.length > 0
        ? formattedLocations.join("; ")
        : "Not specified";
    }

    return this.formatSimpleValue(value);
  }

  private formatSimpleValue(value: unknown): string {
    if (value === null || value === undefined) {
      return "Not specified";
    }

    if (value instanceof Date) {
      return this.formatDateValue(value);
    }

    if (typeof value === "string") {
      return value.trim() || "Not specified";
    }

    if (typeof value === "number") {
      return String(value);
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    if (Array.isArray(value)) {
      const normalized = value
        .map(item => this.formatSimpleValue(item))
        .filter(item => item !== "Not specified");
      return normalized.length > 0 ? normalized.join(", ") : "Not specified";
    }

    if (this.isRecord(value)) {
      const entries = Object.entries(value)
        .map(([field, fieldValue]) => {
          const formattedValue = this.formatSimpleValue(fieldValue);
          if (formattedValue === "Not specified") {
            return "";
          }
          return `${this.humanizeFieldName(field)}: ${formattedValue}`;
        })
        .filter(Boolean);

      return entries.length > 0 ? entries.join(", ") : "Not specified";
    }

    return String(value);
  }

  private formatDateValue(value: unknown): string {
    if (value instanceof Date) {
      return value.toLocaleDateString("en-US");
    }

    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString("en-US");
      }
      return String(value);
    }

    return this.formatSimpleValue(value);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private areValuesEqual(valueA: unknown, valueB: unknown): boolean {
    return (
      JSON.stringify(this.normalizeValue(valueA))
      === JSON.stringify(this.normalizeValue(valueB))
    );
  }

  private normalizeValue(value: unknown): unknown {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map(item => this.normalizeValue(item));
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
      .replace(/^./, match => match.toUpperCase());
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
      const result
        = await this.grantAccessRepository.deleteByPreMarketRequestId(requestId);
      const deletedCount = (result as any)?.deletedCount ?? 0;
      if (deletedCount > 0) {
        logger.info(
          { requestId, deletedCount },
          "Deleted grant access records for pre-market request",
        );
      }
    }
    catch (error) {
      logger.error(
        { error, requestId },
        "Failed to delete grant access records for pre-market request",
      );
    }
  }

  // ============================================
  // DELETE REQUEST (RENTER ONLY)
  // ============================================

  /**
   * Soft-deletes a renter-owned request and notifies associated agents/renter about closure.
   * Expects the renter user ID and request ID for an existing request.
   * Can fail when the request is missing, belongs to another renter, or cleanup of related grant-access records fails.
   */
  async deleteRequest(renterId: string, requestId: string): Promise<void> {
    const request = await this.getRequestById(requestId);

    if (request.renterId.toString() !== renterId) {
      throw new BadRequestException("Cannot delete others' requests");
    }

    const preMarketRequestId = request._id?.toString() || requestId;
    const matchedAgentIds
      = await this.getMatchedAgentIdsForClosedAlert(preMarketRequestId);
    const closedAt = new Date();

    const deleted = await this.preMarketRepository.softDelete(requestId);
    if (!deleted) {
      throw new NotFoundException("Pre-market request not found");
    }

    this.notifyAssociatedAgentsRequestClosed(
      request,
      "Deleted by renter",
      closedAt,
      matchedAgentIds,
    ).catch((error) => {
      logger.error(
        { error, requestId: request._id },
        "Failed to send request closed alert (non-blocking)",
      );
    });

    this.notifyRenterRequestClosed(request, "Deleted by renter", closedAt).catch(
      (error) => {
        logger.error(
          { error, requestId: request._id },
          "Failed to send renter request closed notification (non-blocking)",
        );
      },
    );

    await this.deleteGrantAccessRecords(requestId);

    this.scheduleConsolidatedExcelRefresh(
      {
        renterId,
        requestId,
      },
      "Consolidated Excel update failed after pre-market request deletion",
    );

    logger.info({ renterId }, `Pre-market request deleted: ${requestId}`);
  }

  /**
   * Removes all requests for a renter during account deletion.
   * Expects a renter user ID and deletes request records plus related grant-access records.
   * Can fail when repository deletion fails; notification failures before deletion are logged and do not stop cleanup.
   */
  async deleteRequestsByRenterId(renterId: string): Promise<void> {
    const requests = await this.preMarketRepository.findAllByRenterId(
      renterId,
      true,
    );

    if (!requests || requests.length === 0) {
      return;
    }

    const requestIds = requests
      .map(request => request._id?.toString())
      .filter((id): id is string => Boolean(id));
    if (requestIds.length === 0) {
      return;
    }

    const closedAt = new Date();
    const activeRequests = requests.filter(
      request =>
        !request.isDeleted
        && request.isActive !== false
        && request.status !== "deleted",
    );

    for (const request of activeRequests) {
      const preMarketRequestId = request._id?.toString();
      if (!preMarketRequestId) {
        continue;
      }

      try {
        const matchedAgentIds
          = await this.getMatchedAgentIdsForClosedAlert(preMarketRequestId);

        await this.notifyAssociatedAgentsRequestClosed(
          request,
          "Renter deleted account",
          closedAt,
          matchedAgentIds,
        );
      }
      catch (error) {
        logger.error(
          { error, requestId: request._id, renterId },
          "Failed to send request closed alert before renter account deletion",
        );
      }
    }

    await this.preMarketRepository.deleteManyByIds(requestIds);
    await this.grantAccessRepository.deleteByPreMarketRequestIds(requestIds);

    logger.info(
      { renterId, deletedCount: requestIds.length },
      "Deleted pre-market requests after renter account deletion",
    );
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
    }
    catch (error) {
      logger.error(
        { agentId, error },
        "Failed to delete agent match history during profile removal",
      );
    }
  }

  // ============================================
  // VISIBILITY (AGENT-OWNED)
  // ============================================

  /**
   * Toggles a request between private and shared visibility for the registered agent.
   * Expects the registered agent user ID and request ID.
   * Can fail when the agent is not the registered agent or sharing rules block the target visibility.
   */
  async toggleRequestShareVisibility(
    agentId: string,
    requestId: string,
  ): Promise<IPreMarketRequest> {
    const request = await this.getRequestById(requestId);
    const registeredAgentId
      = await this.resolveRegisteredAgentIdForRequest(request);

    if (!registeredAgentId || registeredAgentId !== agentId) {
      throw new ForbiddenException(
        "Only the registered agent can change request visibility",
      );
    }

    const currentVisibility
      = (request as unknown as { visibility?: "PRIVATE" | "SHARED" }).visibility
        ?? "PRIVATE";
    const nextVisibility
      = currentVisibility === "SHARED" ? "PRIVATE" : "SHARED";

    return this.updateRequestVisibility(agentId, requestId, nextVisibility);
  }

  /**
   * Sets explicit request visibility after enforcing renter consent and registration/disclosure confirmation.
   * Expects the registered agent user ID, request ID, and desired visibility state.
   * Can fail when the request is archived, consent is missing, disclosure is unconfirmed, or the request cannot be saved.
   */
  async updateRequestVisibility(
    agentId: string,
    requestId: string,
    visibility: "PRIVATE" | "SHARED",
  ): Promise<IPreMarketRequest> {
    const request = await this.getRequestById(requestId);

    const registeredAgentId
      = await this.resolveRegisteredAgentIdForRequest(request);

    if (!registeredAgentId || registeredAgentId !== agentId) {
      throw new ForbiddenException(
        "Only the registered agent can change request visibility",
      );
    }

    if (this.getAgentArchiveStatus(request, agentId).isArchivedForAgent) {
      throw new ForbiddenException("Archived requests cannot be shared");
    }

    if (request.shareConsent !== true && visibility === "SHARED") {
      throw new ForbiddenException(
        "Renter consent is required to share this request",
      );
    }

    if (
      visibility === "SHARED"
      && !this.getRegistrationDisclosureStatus(request, agentId)
        .registrationDisclosureConfirmed
    ) {
      throw new ForbiddenException(
        "Registration / Disclosure confirmation is required before sharing this request",
      );
    }

    const nextVisibility
      = visibility === "SHARED" && request.shareConsent === true
        ? "SHARED"
        : "PRIVATE";
    const currentVisibility
      = (request as unknown as { visibility?: "PRIVATE" | "SHARED" }).visibility
        ?? "PRIVATE";
    const shouldSendSharedVisibilityNotification
      = currentVisibility === "PRIVATE"
        && nextVisibility === "SHARED"
        && !(
          request as unknown as {
            sharedVisibilityNotificationSentAt?: Date;
          }
        ).sharedVisibilityNotificationSentAt;

    if (nextVisibility === "PRIVATE") {
      await this.preMarketRepository.releaseRequestLock(requestId);
    }

    const updatePayload: Partial<IPreMarketRequest> = {
      visibility: nextVisibility,
      ...(shouldSendSharedVisibilityNotification
        ? { sharedVisibilityNotificationSentAt: new Date() }
        : {}),
    };

    const updated = await this.preMarketRepository.updateById(
      requestId,
      updatePayload,
    );

    if (!updated) {
      throw new NotFoundException("Pre-market request not found");
    }

    if (shouldSendSharedVisibilityNotification) {
      this.notifyNonRegisteredAgentsAboutSharedRequest(
        updated,
        registeredAgentId,
      ).catch((error) => {
        logger.error(
          { error, requestId: updated._id?.toString() },
          "Failed to send shared visibility notification to non-registered agents",
        );
      });
    }

    return updated;
  }

  /**
   * Records that an agent confirmed registration/disclosure requirements for a request.
   * Expects an agent user ID and request ID that the agent is allowed to view.
   * Can fail when the agent/request is missing, access rules deny the action, or the confirmation update cannot be read back.
   */
  async confirmRegistrationDisclosure(
    agentId: string,
    requestId: string,
  ): Promise<{
    requestId: string;
    registrationDisclosureConfirmed: boolean;
    registrationDisclosureConfirmedAt: Date | null;
  }> {
    const agent = await this.agentRepository.findByUserId(agentId);
    if (!agent) {
      throw new ForbiddenException("Agent profile not found");
    }

    const request = await this.getRequestById(requestId);
    this.ensureAgentCanViewRequest(agent, request as any);
    await this.ensureAgentCanConfirmRegistrationDisclosure(
      agentId,
      requestId,
      request as any,
    );

    const existingStatus = this.getRegistrationDisclosureStatus(
      request,
      agentId,
    );

    if (existingStatus.registrationDisclosureConfirmed) {
      return {
        requestId,
        ...existingStatus,
      };
    }

    const updated
      = await this.preMarketRepository.confirmRegistrationDisclosure(
        requestId,
        agentId,
      );
    const latest = updated || (await this.getRequestById(requestId));

    if (!latest) {
      throw new NotFoundException("Pre-market request not found");
    }

    const confirmedStatus = this.getRegistrationDisclosureStatus(
      latest,
      agentId,
    );

    return {
      requestId,
      ...confirmedStatus,
    };
  }

  /**
   * Archives a request from an agent's workflow for a specific business reason.
   * Expects an agent user ID, request ID, and reason allowed for that agent's relationship to the request.
   * Can fail when the agent cannot view/archive the request, the reason is invalid, or registration/disclosure prerequisites conflict with the reason.
   */
  async archiveRequestForAgent(
    agentId: string,
    requestId: string,
    reason: AgentArchiveReason,
  ): Promise<{
    requestId: string;
    archivedAgents: number;
    archiveReason: AgentArchiveReason;
    archiveReasonLabel: string;
  }> {
    const agent = await this.agentRepository.findByUserId(agentId);
    if (!agent) {
      throw new ForbiddenException("Agent profile not found");
    }

    const request = await this.getRequestById(requestId);
    this.ensureAgentCanViewRequest(agent, request as any);

    const registeredAgentId
      = await this.resolveRegisteredAgentIdForRequest(request);
    const isRegisteredAgent = registeredAgentId === agentId;
    const matchedAccess = await this.grantAccessRepository.findByAgentAndRequest(
      agentId,
      requestId,
    );
    const isMatchedAgent = Boolean(
      matchedAccess
      && ["approved", "free", "paid"].includes(String(matchedAccess.status)),
    );

    if (!isRegisteredAgent && !isMatchedAgent) {
      throw new ForbiddenException("You cannot archive this request");
    }

    if (
      isRegisteredAgent
      && !["registration_missing", "search_inactive", "client_placed"].includes(
        reason,
      )
    ) {
      throw new BadRequestException("Invalid archive reason");
    }

    if (
      !isRegisteredAgent
      && !["disclosure_missing", "search_inactive", "client_placed"].includes(
        reason,
      )
    ) {
      throw new BadRequestException("Invalid archive reason");
    }

    const source: AgentArchiveSource = isRegisteredAgent
      ? "registered_agent"
      : "matched_agent";
    const matchedAgentIds = await this.getMatchedAgentIdsForArchive(requestId);

    if (
      reason === "registration_missing"
      && (request.visibility === "SHARED" || matchedAgentIds.length > 0)
    ) {
      throw new BadRequestException(
        "Registration Missing can only be used before the request is shared or matched.",
      );
    }

    if (reason === "registration_missing") {
      const registrationStatus = this.getRegistrationDisclosureStatus(
        request,
        agentId,
      );
      if (registrationStatus.registrationDisclosureConfirmed) {
        throw new BadRequestException(
          "Registration Missing cannot be used after registration / disclosure has been confirmed.",
        );
      }

      const registeredAgent = await this.getArchiveAgentInfo(registeredAgentId);
      if (!registeredAgent.activationLink?.trim()) {
        throw new BadRequestException(
          "A client registration link is required before archiving this request for registration missing.",
        );
      }
    }

    if (reason === "disclosure_missing") {
      const matchedAgent = await this.getArchiveAgentInfo(agentId);
      if (!matchedAgent.disclosureLink?.trim()) {
        throw new BadRequestException(
          "An agent disclosure link is required before archiving this request for disclosure missing.",
        );
      }
    }

    const affectsEveryone
      = reason === "search_inactive" || reason === "client_placed";
    const affectedAgentIds = affectsEveryone
      ? Array.from(
          new Set(
            [registeredAgentId, ...matchedAgentIds].filter(
              (id): id is string => Boolean(id),
            ),
          ),
        )
      : [agentId];
    const archivedAt = new Date();

    const archivedAgents = await this.preMarketRepository.addAgentArchiveRecords(
      requestId,
      affectedAgentIds.map(affectedAgentId => ({
        agentId: affectedAgentId,
        archivedByAgentId: agentId,
        reason,
        source,
        archivedAt,
      })),
    );

    if (isRegisteredAgent || affectsEveryone) {
      await this.preMarketRepository.releaseRequestLock(requestId);
      await this.preMarketRepository.updateById(requestId, {
        visibility: "PRIVATE",
        searchActivity: this.clearPendingSearchConfirmationState(
          (request as any)?.searchActivity,
        ),
      });
    }

    if (archivedAgents > 0) {
      this.sendArchiveNotification({
        request,
        actorAgentId: agentId,
        registeredAgentId,
        matchedAgentIds,
        reason,
        source,
      }).catch((error) => {
        logger.error(
          { error, requestId, agentId, reason },
          "Failed to send archive notification",
        );
      });
    }

    return {
      requestId,
      archivedAgents,
      archiveReason: reason,
      archiveReasonLabel: ARCHIVE_REASON_LABELS[reason],
    };
  }

  /**
   * Restores an archived request back into an agent's active workflow.
   * Expects an agent user ID and request ID for a request archived by/for that agent.
   * Can fail when the agent cannot view the request, the request is not archived for them, or required registration/disclosure links are still missing.
   */
  async unarchiveRequestForAgent(
    agentId: string,
    requestId: string,
  ): Promise<{
    requestId: string;
    archiveReason: AgentArchiveReason | null;
    archiveReasonLabel: string | null;
    isArchivedForAgent: boolean;
  }> {
    const agent = await this.agentRepository.findByUserId(agentId);
    if (!agent) {
      throw new ForbiddenException("Agent profile not found");
    }

    const request = await this.getRequestById(requestId);
    const archiveStatus = this.getAgentArchiveStatus(request, agentId);

    if (!archiveStatus.isArchivedForAgent) {
      return {
        requestId,
        archiveReason: null,
        archiveReasonLabel: null,
        isArchivedForAgent: false,
      };
    }

    if (
      archiveStatus.archiveReason === "search_inactive"
      || archiveStatus.archiveReason === "search_inactive_automatic"
      || archiveStatus.archiveReason === "client_placed"
    ) {
      await this.preMarketRepository.removeAgentArchiveRecordsByReason(
        requestId,
        archiveStatus.archiveReason,
      );
    }
    else {
      await this.preMarketRepository.removeAgentArchiveRecord(requestId, agentId);
    }

    await this.preMarketRepository.updateById(requestId, {
      searchActivity: this.resetSearchConfirmationActivity(
        (request as any)?.searchActivity,
        {
          lastConfirmedAt: new Date(),
        },
      ),
    } as Partial<IPreMarketRequest>);

    const unarchivingAgent = await this.getArchiveAgentInfo(agentId);
    this.sendUnarchiveNotification({
      request,
      archiveReason: archiveStatus.archiveReason,
      unarchivingAgent,
    }).catch((error) => {
      logger.error(
        { error, requestId, agentId, archiveReason: archiveStatus.archiveReason },
        "Failed to send renter unarchive notification",
      );
    });

    return {
      requestId,
      archiveReason: archiveStatus.archiveReason,
      archiveReasonLabel: archiveStatus.archiveReasonLabel,
      isArchivedForAgent: false,
    };
  }

  /**
   * Lets a renter reactivate a search after search-inactive archival.
   * Expects the renter user ID and their request ID.
   * Can fail when the request belongs to another renter, there are no inactive archives to restore, or notifications fail non-blockingly.
   */
  async reactivateSearchForRenter(
    renterId: string,
    requestId: string,
  ): Promise<{
    requestId: string;
    reactivatedAgents: number;
  }> {
    const request = await this.getRequestById(requestId);

    if (request.renterId.toString() !== renterId) {
      throw new ForbiddenException("You cannot reactivate another renter's request");
    }

    const searchInactiveArchives = Array.isArray((request as any)?.agentArchives)
      ? (request as any).agentArchives.filter(
          (archive: any) =>
            archive?.reason === "search_inactive"
            || archive?.reason === "search_inactive_automatic",
        )
      : [];

    if (searchInactiveArchives.length === 0) {
      throw new BadRequestException(
        "This request is not currently paused for search inactivity.",
      );
    }

    const renter = await this.renterRepository.findRenterWithReferrer(renterId);
    const registeredAgentId
      = await this.resolveRegisteredAgentIdForRequest(request);
    const matchedAgentIds = await this.getMatchedAgentIdsForArchive(requestId);
    const recipientAgentIds = Array.from(
      new Set(
        [registeredAgentId, ...matchedAgentIds].filter(
          (id): id is string => Boolean(id),
        ),
      ),
    );

    await this.preMarketRepository.removeAgentArchiveRecordsByReason(
      requestId,
      "search_inactive",
    );
    await this.preMarketRepository.removeAgentArchiveRecordsByReason(
      requestId,
      "search_inactive_automatic",
    );
    await this.preMarketRepository.updateById(requestId, {
      searchActivity: this.resetSearchConfirmationActivity(
        (request as any)?.searchActivity,
        {
          lastConfirmedAt: new Date(),
        },
      ),
    } as Partial<IPreMarketRequest>);

    const requestLabel
      = request.requestId || request.requestName || request._id?.toString() || "N/A";

    await Promise.allSettled(
      recipientAgentIds.map(async (agentId) => {
        const agent = await this.getArchiveAgentInfo(agentId);
        if (!agent.email) {
          return;
        }

        const requestLink = this.buildAgentRequestLink(
          requestId,
          agentId === registeredAgentId,
        );

        await emailService.sendRenterSearchReactivatedAgentNotification({
          to: agent.email,
          agentName: agent.fullName,
          clientFullName: renter?.fullName || "Client",
          requestId: requestLabel,
          requestLink,
        });
      }),
    );

    return {
      requestId,
      reactivatedAgents: recipientAgentIds.length,
    };
  }

  /**
   * Confirms that a renter's search is still active from an emailed confirmation token.
   * Expects a valid pending confirmation token.
   * Can fail when the token is invalid, expired, already used, or tied to a deleted/inactive request.
   */
  async confirmActiveSearchRequest(token: string): Promise<{
    requestId: string;
    confirmedAt: Date;
    renterFullName: string;
  }> {
    const request
      = await this.preMarketRepository.findByPendingSearchConfirmationToken(token);

    if (!request) {
      const confirmedRequest
        = await this.preMarketRepository.findByConfirmedSearchConfirmationToken(
          token,
        );

      if (!confirmedRequest) {
        throw new BadRequestException("This confirmation link is invalid.");
      }

      const confirmedSearchActivity = this.getSearchActivity(confirmedRequest);
      if (!confirmedSearchActivity.lastConfirmedAt) {
        throw new BadRequestException("This confirmation link is invalid.");
      }

      if (
        confirmedRequest.isDeleted
        || confirmedRequest.status === "deleted"
        || confirmedRequest.isActive === false
      ) {
        throw new BadRequestException("This request is no longer active.");
      }

      if (
        Array.isArray((confirmedRequest as any)?.agentArchives)
        && (confirmedRequest as any).agentArchives.length > 0
      ) {
        throw new BadRequestException("This request has already been archived.");
      }

      if (confirmedSearchActivity.pendingConfirmationToken) {
        throw new BadRequestException(
          "A newer confirmation email was sent. Please use the latest Confirm My Search link.",
        );
      }

      const renter = await this.renterRepository.findRenterWithReferrer(
        confirmedRequest.renterId.toString(),
      );
      const renterUser
        = renter?.userId && typeof renter.userId === "object"
          ? renter.userId
          : null;

      return {
        requestId:
          confirmedRequest.requestId
          || confirmedRequest.requestName
          || confirmedRequest._id.toString(),
        confirmedAt: confirmedSearchActivity.lastConfirmedAt,
        renterFullName: renter?.fullName || renterUser?.fullName || "there",
      };
    }

    if (request.isDeleted || request.status === "deleted" || request.isActive === false) {
      throw new BadRequestException("This request is no longer active.");
    }

    if (Array.isArray((request as any)?.agentArchives) && (request as any).agentArchives.length > 0) {
      throw new BadRequestException("This request has already been archived.");
    }

    const searchActivity = this.getSearchActivity(request);
    const now = new Date();

    if (
      !searchActivity.pendingConfirmationToken
      || searchActivity.pendingConfirmationToken !== token
    ) {
      throw new BadRequestException("This confirmation link is invalid.");
    }

    if (
      !searchActivity.pendingConfirmationExpiresAt
      || searchActivity.pendingConfirmationExpiresAt.getTime() < now.getTime()
    ) {
      throw new BadRequestException("This confirmation link has expired.");
    }

    const renter = await this.renterRepository.findRenterWithReferrer(
      request.renterId.toString(),
    );
    const renterUser
      = renter?.userId && typeof renter.userId === "object"
        ? renter.userId
        : null;
    const renterFullName
      = renter?.fullName || renterUser?.fullName || "there";

    await this.preMarketRepository.updateById(request._id.toString(), {
      searchActivity: this.resetSearchConfirmationActivity(
        (request as any).searchActivity,
        {
          lastConfirmedAt: now,
          lastConfirmedToken: token,
          lastConfirmedTokenUsedAt: now,
        },
      ),
    } as Partial<IPreMarketRequest>);

    return {
      requestId: request.requestId || request.requestName || request._id.toString(),
      confirmedAt: now,
      renterFullName,
    };
  }

  /**
   * Runs the scheduled sweep that archives stale searches or sends confirmation reminders.
   * Expects no direct input and processes requests due for search-activity checks.
   * Can fail per request while continuing the sweep; individual reminder/archive errors are counted and logged.
   */
  async processAutomaticSearchConfirmationSweep(): Promise<{
    remindersSent: number;
    archivedRequests: number;
    failedCount: number;
  }> {
    const now = new Date();
    const requests
      = await this.preMarketRepository.findActiveRequestsForSearchConfirmationSweep();

    if (requests.length === 0) {
      return {
        remindersSent: 0,
        archivedRequests: 0,
        failedCount: 0,
      };
    }

    const requestIds = requests
      .map(request => request._id?.toString())
      .filter((id): id is string => Boolean(id));
    const latestMatchedAtByRequestId
      = await this.grantAccessRepository.findLatestMatchedAtByRequestIds(requestIds);

    let remindersSent = 0;
    let archivedRequests = 0;
    let failedCount = 0;

    for (const request of requests) {
      try {
        if (
          request.isDeleted
          || request.status === "deleted"
          || request.isActive === false
        ) {
          continue;
        }

        if (Array.isArray((request as any)?.agentArchives) && (request as any).agentArchives.length > 0) {
          continue;
        }

        const searchActivity = this.getSearchActivity(request);
        if (
          searchActivity.pendingConfirmationToken
          && searchActivity.pendingConfirmationExpiresAt
        ) {
          if (
            searchActivity.pendingConfirmationExpiresAt.getTime() <= now.getTime()
          ) {
            const archived = await this.archiveForMissingSearchConfirmation(
              request,
              now,
            );
            if (archived) {
              archivedRequests += 1;
            }
          }
          continue;
        }

        const latestMatchedAt
          = latestMatchedAtByRequestId.get(request._id.toString()) ?? null;
        const anchor = this.getSearchConfirmationAnchor(request, latestMatchedAt);
        if (
          anchor.getTime() + SEARCH_CONFIRMATION_INTERVAL_MS
          > now.getTime()
        ) {
          continue;
        }

        const reminderSent = await this.sendActiveSearchConfirmationReminder(
          request,
          now,
        );
        if (reminderSent) {
          remindersSent += 1;
        }
      }
      catch (error) {
        failedCount += 1;
        logger.error(
          { error, requestId: request._id?.toString() },
          "Failed to process automatic search confirmation sweep item",
        );
      }
    }

    return {
      remindersSent,
      archivedRequests,
      failedCount,
    };
  }

  async getArchivedRequestsForAgent(
    agentId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResponse<IPreMarketRequest>> {
    const agent = await this.agentRepository.findByUserId(agentId);
    if (!agent) {
      throw new NotFoundException("Agent profile not found");
    }

    const paginated = await this.preMarketRepository.findArchivedForAgent(
      agentId,
      query,
    );
    const requestIds = paginated.data
      .map(request => request._id?.toString())
      .filter((id): id is string => Boolean(id));
    const [grantAccessRecords, globalMatchedScopeRequestIds]
      = await Promise.all([
        this.grantAccessRepository.findByAgentIdAndRequestIds(
          agentId,
          requestIds,
        ),
        this.getGlobalMatchedScopeRequestIdSet(requestIds),
      ]);
    const grantAccessByRequestId = new Map(
      grantAccessRecords.map(record => [
        record.preMarketRequestId.toString(),
        record,
      ]),
    );

    const enrichedData = await Promise.all(
      paginated.data.map(async (request) => {
        const requestIdValue = request._id?.toString() || "";
        const registeredAgentId
          = await this.resolveRegisteredAgentIdForRequest(request);
        const isRegisteredAgent = registeredAgentId === agentId;
        const grantAccess = grantAccessByRequestId.get(requestIdValue) || null;
        const accessSummary = this.buildAgentAccessSummary(
          grantAccess,
          agent.hasGrantAccess === true,
        );
        const referralInfo = request.renterId
          ? await this.getReferralInfoForRenter(request.renterId.toString())
          : null;
        const archiveStatus = this.getAgentArchiveStatus(request, agentId);
        const registrationDisclosureStatus
          = this.getRegistrationDisclosureStatus(request, agentId);
        const visibleRequest
          = this.stripOwnerRepresentationMatchesForNonRegisteredAgent(
            request,
            isRegisteredAgent,
          );

        return {
          ...visibleRequest,
          scope: this.resolveAgentVisibleScope(
            request.scope,
            globalMatchedScopeRequestIds.has(requestIdValue),
          ),
          matchedByAgent:
            globalMatchedScopeRequestIds.has(requestIdValue)
              ? await this.resolveMatchedAgentForView(agentId, requestIdValue)
              : null,
          visibility: isRegisteredAgent ? "PRIVATE" : request.visibility,
          referralAgentId:
            registeredAgentId
            ?? this.normalizeUserId(
              (request as unknown as {
                referralAgentId?: string | Types.ObjectId;
              }).referralAgentId,
            ),
          referralInfo,
          status: accessSummary.grantAccessStatus || request.status,
          listingStatus: grantAccess ? "matched" : request.status,
          grantAccessStatus: accessSummary.grantAccessStatus,
          grantAccessId: accessSummary.grantAccessId,
          representation_type: accessSummary.representation_type,
          representationSelectedAt: accessSummary.representationSelectedAt,
          accessType: grantAccess ? accessSummary.accessType : "none",
          canRequestAccess: false,
          isArchivedForAgent: archiveStatus.isArchivedForAgent,
          archiveReason: archiveStatus.archiveReason,
          archiveReasonLabel: archiveStatus.archiveReasonLabel,
          archiveSource: archiveStatus.archiveSource,
          archivedAt: archiveStatus.archivedAt,
          ...registrationDisclosureStatus,
        };
      }),
    );

    return {
      ...paginated,
      data: enrichedData,
    } as any;
  }

  private async getMatchedAgentIdsForArchive(
    preMarketRequestId: string,
  ): Promise<string[]> {
    const records
      = await this.grantAccessRepository.findByPreMarketRequestId(
        preMarketRequestId,
      );

    return Array.from(
      new Set(
        records
          .filter(record =>
            ["approved", "free", "paid"].includes(String(record.status))
            && record.representation_type !== "owner_representation",
          )
          .map(record => record.agentId.toString())
          .filter((id): id is string => Boolean(id)),
      ),
    );
  }

  private async getArchiveAgentInfo(agentId?: string | null): Promise<{
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    title: string;
    brokerage: string;
    activationLink: string | null;
    disclosureLink: string | null;
  }> {
    if (!agentId) {
      const defaultAgent = await this.getDefaultReferralAgent();
      return {
        id: defaultAgent.id,
        fullName: defaultAgent.fullName,
        email: defaultAgent.email,
        phoneNumber: defaultAgent.phoneNumber || "N/A",
        title: DEFAULT_REFERRAL_AGENT_TITLE,
        brokerage: DEFAULT_REFERRAL_AGENT_BROKERAGE,
        activationLink: defaultAgent.activationLink,
        disclosureLink: defaultAgent.disclosureLink,
      };
    }

    const [user, profile] = await Promise.all([
      this.userRepository.findById(agentId),
      this.agentRepository.findByUserId(agentId),
    ]);

    return {
      id: agentId,
      fullName: user?.fullName || user?.email || "Agent",
      email: user?.email || "",
      phoneNumber: user?.phoneNumber || "N/A",
      title: profile?.title || DEFAULT_REFERRAL_AGENT_TITLE,
      brokerage: profile?.brokerageName || DEFAULT_REFERRAL_AGENT_BROKERAGE,
      activationLink: profile?.activationLink || null,
      disclosureLink: profile?.disclosureLink || null,
    };
  }

  private buildUniqueEmailList(
    emails: Array<string | undefined | null>,
    excludedEmails: Array<string | undefined | null> = [],
  ): string[] | undefined {
    const excluded = new Set(
      excludedEmails
        .filter((email): email is string => Boolean(email?.trim()))
        .map(email => email.trim().toLowerCase()),
    );
    const unique: string[] = [];

    for (const email of emails) {
      const trimmed = email?.trim();
      if (!trimmed || excluded.has(trimmed.toLowerCase())) {
        continue;
      }
      if (unique.some(item => item.toLowerCase() === trimmed.toLowerCase())) {
        continue;
      }
      unique.push(trimmed);
    }

    return unique.length > 0 ? unique : undefined;
  }

  private async sendActiveSearchConfirmationReminder(
    request: IPreMarketRequest,
    now: Date,
  ): Promise<boolean> {
    const renter = await this.renterRepository.findRenterWithReferrer(
      request.renterId.toString(),
    );
    if (!renter?.email) {
      logger.warn(
        { requestId: request._id?.toString() },
        "Skipping active search confirmation reminder because renter email is missing",
      );
      return false;
    }

    const registeredAgentId
      = await this.resolveRegisteredAgentIdForRequest(request);
    const matchedAgentIds = await this.getMatchedAgentIdsForArchive(
      request._id.toString(),
    );
    const [registeredAgent, matchedAgents] = await Promise.all([
      this.getArchiveAgentInfo(registeredAgentId),
      Promise.all(matchedAgentIds.map(id => this.getArchiveAgentInfo(id))),
    ]);

    const confirmationToken = randomBytes(24).toString("hex");
    const confirmationLink
      = this.buildActiveRequestConfirmationLink(confirmationToken);
    const expiresAt = new Date(now.getTime() + SEARCH_CONFIRMATION_EXPIRY_MS);
    const firstName
      = renter.fullName?.trim().split(/\s+/)[0] || renter.fullName || "there";
    const cc = this.buildUniqueEmailList(
      matchedAgents.map(agent => agent.email),
      [renter.email],
    );
    const bodyHtml = `
      <p>Hi ${this.escapeEmailHtml(firstName)},</p>
      <p>We are currently working on your behalf to identify apartments that match your request, including opportunities that may not yet be publicly advertised.</p>
      <p>To continue your search, please confirm that you are still actively looking by clicking below:</p>
      <p><a href="${this.escapeEmailHtml(confirmationLink)}"><strong style="color: #000000;">Confirm My Search</strong></a></p>
      <p>Once confirmed, your request will remain active and your next confirmation cycle will reset.</p>
      <p><strong style="color: #000000;">Important:</strong> If no action is taken, your request on BeforeListed&trade; will be automatically archived within 3 days.</p>
      <p>If you have any questions, you may reply directly to this email.</p>
      <p>Thank you,<br>BeforeListed&trade; Support</p>`;

    const result = await emailService.sendActiveSearchConfirmationReminder({
      to: renter.email,
      renterName: renter.fullName,
      subject:
        "Action Required: Confirm Your Search to Keep Your Request Active (3 days) \u2013 BeforeListed",
      headerTitle: "Confirm Your Search to Keep Your Request Active",
      bodyHtml,
      cc,
      replyTo: registeredAgent.email || "support@beforelisted.com",
      templateType: "ACTIVE_SEARCH_CONFIRMATION_REMINDER",
    });

    if (!result.success) {
      throw new Error(
        typeof result.error === "string"
          ? result.error
          : "Failed to send confirmation reminder",
      );
    }

    await this.preMarketRepository.updateById(request._id.toString(), {
      searchActivity: {
        ...((request as any)?.searchActivity ?? {}),
        lastConfirmationEmailSentAt: now,
        pendingConfirmationToken: confirmationToken,
        pendingConfirmationSentAt: now,
        pendingConfirmationExpiresAt: expiresAt,
      },
    } as Partial<IPreMarketRequest>);

    return true;
  }

  private async archiveForMissingSearchConfirmation(
    request: IPreMarketRequest,
    now: Date,
  ): Promise<boolean> {
    const requestId = request._id.toString();
    const latestRequest = await this.preMarketRepository.getRequestById(
      requestId,
    );

    if (
      !latestRequest
      || latestRequest.isDeleted
      || latestRequest.status === "deleted"
      || latestRequest.isActive === false
    ) {
      return false;
    }

    const latestSearchActivity = this.getSearchActivity(latestRequest);
    if (
      !latestSearchActivity.pendingConfirmationToken
      || !latestSearchActivity.pendingConfirmationExpiresAt
      || latestSearchActivity.pendingConfirmationExpiresAt.getTime() > now.getTime()
      || (
        Array.isArray((latestRequest as any)?.agentArchives)
        && (latestRequest as any).agentArchives.length > 0
      )
    ) {
      return false;
    }

    const registeredAgentId
      = await this.resolveRegisteredAgentIdForRequest(latestRequest);
    const matchedAgentIds = await this.getMatchedAgentIdsForArchive(
      requestId,
    );
    const affectedAgentIds = Array.from(
      new Set(
        [registeredAgentId, ...matchedAgentIds].filter(
          (id): id is string => Boolean(id),
        ),
      ),
    );

    if (affectedAgentIds.length === 0) {
      return false;
    }

    const archiveActorId = registeredAgentId || affectedAgentIds[0];
    const archivedRequest
      = await this.preMarketRepository.archiveExpiredSearchConfirmation(
        requestId,
        latestSearchActivity.pendingConfirmationToken,
        now,
        affectedAgentIds.map(affectedAgentId => ({
          agentId: affectedAgentId,
          archivedByAgentId: archiveActorId,
          reason: "search_inactive_automatic",
          source: "system" as const,
          archivedAt: now,
        })),
      );

    if (!archivedRequest) {
      return false;
    }

    const currentRequest = await this.preMarketRepository.getRequestById(requestId);
    const isStillSystemArchived = affectedAgentIds.every(affectedAgentId =>
      Array.isArray((currentRequest as any)?.agentArchives)
      && (currentRequest as any).agentArchives.some(
        (archive: any) =>
          archive?.agentId?.toString() === affectedAgentId
          && archive?.reason === "search_inactive_automatic"
          && archive?.source === "system",
      ),
    );

    if (!currentRequest || !isStillSystemArchived) {
      return false;
    }

    const renter = await this.renterRepository.findRenterWithReferrer(
      currentRequest.renterId.toString(),
    );
    if (renter?.email) {
      const [registeredAgent, matchedAgents] = await Promise.all([
        this.getArchiveAgentInfo(registeredAgentId),
        Promise.all(matchedAgentIds.map(id => this.getArchiveAgentInfo(id))),
      ]);
      const firstName
        = renter.fullName?.trim().split(/\s+/)[0] || renter.fullName || "there";
      const cc = this.buildUniqueEmailList(
        [registeredAgent.email, ...matchedAgents.map(agent => agent.email)],
        [renter.email],
      );
      const bodyHtml = `
        <p>Hi ${this.escapeEmailHtml(firstName)},</p>
        <p>We didn&rsquo;t receive your search confirmation after our last email, so your request on BeforeListed&trade; has been <strong>paused and moved to our archive</strong>.</p>
        <p>If you&rsquo;re still searching, you can log in to your BeforeListed&trade; dashboard and unarchive your request directly, or simply reply to this email and we&rsquo;ll reactivate it right away.</p>
        <p>Active requests allow agents to continue reaching out to owners on your behalf for upcoming apartments that may not yet be advertised.</p>
        <p>If your plans have changed, no action is needed.</p>
        <p>If you&rsquo;d like to continue your search, we&rsquo;re here to help.</p>
        <p>Thank you,<br>BeforeListed&trade; Support</p>`;

      await emailService.sendRenterArchiveNotification({
        to: renter.email,
        renterName: renter.fullName,
        subject:
          "Still Searching? Your Request Was Archived & Search Paused | BeforeListed\u2122",
        headerTitle: "Your Request Was Paused",
        bodyHtml,
        cc,
        replyTo: registeredAgent.email || "support@beforelisted.com",
        templateType: "SYSTEM_ARCHIVED_SEARCH_CONFIRMATION_MISSING",
      });
    }

    return true;
  }

  private async sendUnarchiveNotification({
    request,
    archiveReason,
    unarchivingAgent,
  }: {
    request: IPreMarketRequest;
    archiveReason: AgentArchiveReason | null;
    unarchivingAgent: Awaited<ReturnType<PreMarketService["getArchiveAgentInfo"]>>;
  }): Promise<void> {
    const renter = await this.renterRepository.findRenterWithReferrer(
      request.renterId.toString(),
    );
    if (!renter?.email) {
      return;
    }

    const registeredAgentId
      = await this.resolveRegisteredAgentIdForRequest(request);
    const matchedAgentIds = await this.getMatchedAgentIdsForArchive(
      request._id.toString(),
    );
    const [registeredAgent, matchedAgents] = await Promise.all([
      this.getArchiveAgentInfo(registeredAgentId),
      Promise.all(matchedAgentIds.map(id => this.getArchiveAgentInfo(id))),
    ]);
    const firstName
      = renter.fullName?.trim().split(/\s+/)[0] || renter.fullName || "there";
    const cc = this.buildUniqueEmailList(
      [registeredAgent.email, ...matchedAgents.map(agent => agent.email)],
      [renter.email],
    );
    const bodyHtml = `
      <p>Hi ${this.escapeEmailHtml(firstName)},</p>
      <p>Your agent ${this.escapeEmailHtml(unarchivingAgent.fullName)} ${this.escapeEmailHtml(unarchivingAgent.title)} with ${this.escapeEmailHtml(unarchivingAgent.brokerage)}, has reactivated your request.</p>
      <p>Your request was previously archived for the following reason:<br>${this.escapeEmailHtml(archiveReason ? ARCHIVE_REASON_LABELS[archiveReason] : "Not specified")}</p>
      <p><strong style="color: #000000;">Your request is now active.</strong></p>
      <p>If you have any questions, you may reply directly to this email.</p>
      <p>Thank you,<br>BeforeListed&trade; Support</p>`;

    await emailService.sendRenterUnarchiveNotification({
      to: renter.email,
      renterName: renter.fullName,
      subject: "Your request is now active \u2013 BeforeListed\u2122",
      headerTitle: "Your request is now active",
      bodyHtml,
      cc,
      replyTo: registeredAgent.email || "support@beforelisted.com",
      templateType: "RENTER_UNARCHIVED_REQUEST_NOTIFICATION",
    });
  }

  private escapeEmailHtml(value: string | undefined | null): string {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private async sendArchiveNotification({
    request,
    actorAgentId,
    registeredAgentId,
    matchedAgentIds,
    reason,
    source,
  }: {
    request: IPreMarketRequest;
    actorAgentId: string;
    registeredAgentId: string | null;
    matchedAgentIds: string[];
    reason: AgentArchiveReason;
    source: AgentArchiveSource;
  }): Promise<void> {
    const renter = await this.renterRepository.findRenterWithReferrer(
      request.renterId.toString(),
    );

    if (!renter?.email) {
      logger.warn(
        { requestId: request._id?.toString() },
        "Skipping archive email because renter email is missing",
      );
      return;
    }

    const [registeredAgent, actorAgent, matchedAgents] = await Promise.all([
      this.getArchiveAgentInfo(registeredAgentId),
      this.getArchiveAgentInfo(actorAgentId),
      Promise.all(matchedAgentIds.map(id => this.getArchiveAgentInfo(id))),
    ]);
    const firstName = this.escapeEmailHtml(
      renter.fullName?.trim().split(/\s+/)[0] || renter.fullName || "there",
    );
    const registeredName = this.escapeEmailHtml(registeredAgent.fullName);
    const registeredTitle = this.escapeEmailHtml(registeredAgent.title);
    const registeredBrokerage = this.escapeEmailHtml(registeredAgent.brokerage);
    const actorName = this.escapeEmailHtml(actorAgent.fullName);
    const actorTitle = this.escapeEmailHtml(actorAgent.title);
    const actorBrokerage = this.escapeEmailHtml(actorAgent.brokerage);
    const registrationLink = this.buildRenterRegistrationLink(
      registeredAgent.activationLink,
      renter,
      registeredAgent.fullName,
    );
    const matchedDisclosureLink
      = actorAgent.disclosureLink || "Link unavailable";
    const registrationLinkMarkup = registrationLink
      ? `<a href="${this.escapeEmailHtml(registrationLink)}">Client Registration and Disclosure</a>`
      : this.escapeEmailHtml("Link unavailable");
    const disclosureLinkMarkup = actorAgent.disclosureLink
      ? `<a href="${this.escapeEmailHtml(matchedDisclosureLink)}">Agent Disclosure</a>`
      : this.escapeEmailHtml(matchedDisclosureLink);
    const matchedAgentEmails = matchedAgents.map(agent => agent.email);
    const registeredAgentEmail = registeredAgent.email;
    const actorAgentEmail = actorAgent.email;
    let subject = "";
    let headerTitle = "";
    let bodyHtml = "";
    let cc: string[] | undefined;
    let replyTo = "support@beforelisted.com";
    let templateType = "RENTER_ARCHIVE_NOTIFICATION";

    if (source === "registered_agent" && reason === "registration_missing") {
      subject
        = "Action Required: Complete Your Registration to Activate Your Request \u2013 BeforeListed";
      headerTitle = "Complete Your Registration to Activate Your Request";
      replyTo = registeredAgentEmail || replyTo;
      templateType = "ARCHIVE_REGISTERED_REGISTRATION_MISSING";
      bodyHtml = `
        <p>Hi ${firstName},</p>
        <p>Thank you for submitting your request on BeforeListed&trade;.</p>
        <p>To activate your request, you&rsquo;ll need to complete the required client registration and disclosure form.</p>
        <p><strong>Your request is currently inactive until this step is completed.</strong></p>
        <p>This step can take less than a minute.</p>
        <p>Please complete your registration using the link below:</p>
        <p>${registrationLinkMarkup}</p>
        <p>Once completed, your request may be activated and ${registeredName} will be able to begin assisting you immediately.</p>
        <p>If you have any questions, feel free to reply to this email.</p>
        <p>Thank you,<br>BeforeListed&trade; Support</p>`;
    }
    else if (source === "matched_agent" && reason === "disclosure_missing") {
      subject
        = "Action Required: Please Confirm Disclosure to Proceed \u2013 BeforeListed";
      headerTitle = "Please Confirm Disclosure to Proceed";
      replyTo = actorAgentEmail || replyTo;
      cc = this.buildUniqueEmailList([registeredAgentEmail], [renter.email]);
      templateType = "ARCHIVE_MATCHED_DISCLOSURE_MISSING";
      bodyHtml = `
        <p>Hi ${firstName},</p>
        <p>Our system shows that the required agent disclosure document for your assisting agent ${actorName}, ${actorTitle} with ${actorBrokerage}, has not yet been signed.</p>
        <p>Please sign the document using the link below:</p>
        <p>${disclosureLinkMarkup}</p>
        <p>In the meantime, <strong>you may just email reply all and confirm you received the disclosure</strong>, and the assisting agent will reach out to you.</p>
        <p>If you have any questions, you may reply directly to this email.</p>
        <p>Thank you,<br>BeforeListed&trade; Support</p>`;
    }
    else if (reason === "search_inactive") {
      subject = "Your request is no longer active \u2013 BeforeListed";
      headerTitle = "Your Request Is No Longer Active";
      replyTo = registeredAgentEmail || replyTo;
      cc = this.buildUniqueEmailList(
        source === "registered_agent"
          ? matchedAgentEmails
          : [registeredAgentEmail, ...matchedAgentEmails],
        [renter.email],
      );
      templateType
        = source === "registered_agent"
          ? "ARCHIVE_REGISTERED_SEARCH_INACTIVE"
          : "ARCHIVE_MATCHED_SEARCH_INACTIVE";
      const indicatedTo
        = source === "registered_agent"
          ? `${registeredName}, ${registeredTitle} with ${registeredBrokerage}`
          : `${actorName}, ${actorTitle} with ${actorBrokerage}`;
      const closingWish
        = source === "matched_agent"
          ? "<p>We wish you the best of luck in your new home.</p>"
          : "";
      bodyHtml = `
        <p>Hi ${firstName},</p>
        <p>We understand that you informed ${indicatedTo}, that you are no longer actively searching for an apartment.</p>
        <p><strong>Your BeforeListed&trade; request has been archived.</strong></p>
        <p>If this is not correct, please reply to this email and we&rsquo;ll update it right away.</p>
        <p>If you begin your search again in the future, you&rsquo;re always welcome to use BeforeListed&trade; to explore new opportunities.</p>
        ${closingWish}
        <p>Thank you,<br>BeforeListed&trade; Support</p>`;
    }
    else if (reason === "client_placed") {
      subject
        = source === "matched_agent"
          ? "Congratulations on your new home! \u{1F389} \u2014 BeforeListed"
          : "Congratulations on your new home! \u{1F389} \u2014 BeforeListed\u2122";
      headerTitle = "Congratulations on Your New Home \u{1F389}";
      replyTo = registeredAgentEmail || replyTo;
      cc = this.buildUniqueEmailList(
        source === "registered_agent"
          ? matchedAgentEmails
          : [registeredAgentEmail, ...matchedAgentEmails],
        [renter.email],
      );
      templateType
        = source === "registered_agent"
          ? "ARCHIVE_REGISTERED_CLIENT_PLACED"
          : "ARCHIVE_MATCHED_CLIENT_PLACED";
      const placedBy
        = source === "registered_agent"
          ? `${registeredName}, ${registeredTitle} with ${registeredBrokerage}`
          : `${actorName}, ${actorTitle} with ${actorBrokerage}`;
      bodyHtml = `
        <p>Hi ${firstName},</p>
        <p><strong>Congratulations on your new home!</strong></p>
        <p>We understand that ${placedBy}, was able to assist you in securing your apartment.</p>
        <p>Wishing you many happy years in your new home.</p>
        <p>If you begin your search again in the future, you&rsquo;re always welcome to use BeforeListed&trade; to explore new opportunities.</p>
        <p>If you have any questions, feel free to reply directly to this email.</p>
        <p>Thank you,<br>BeforeListed&trade; Support</p>`;
    }

    await emailService.sendRenterArchiveNotification({
      to: renter.email,
      renterName: renter.fullName,
      subject,
      headerTitle,
      bodyHtml,
      cc,
      replyTo,
      templateType,
    });
  }

  private async notifyNonRegisteredAgentsAboutSharedRequest(
    request: IPreMarketRequest,
    registeredAgentId: string,
  ): Promise<void> {
    const recipients
      = await this.getNonRegisteredAgentRecipientsForSharedRequestNotification(
        registeredAgentId,
      );

    if (recipients.length === 0) {
      logger.info(
        { requestId: request._id?.toString() },
        "No non-registered agents eligible for shared request notification",
      );
      return;
    }

    const renter = request.renterId
      ? await this.renterRepository.findRenterWithReferrer(
          request.renterId.toString(),
        )
      : null;
    const requestId = request.requestId || request._id?.toString() || "N/A";
    const renterFirstName = renter?.fullName?.trim().split(/\s+/)[0] || "Renter";
    const minPrice = this.formatCurrencyUSD(request.priceRange?.min);
    const maxPrice = this.formatCurrencyUSD(request.priceRange?.max);
    const bedrooms
      = Array.isArray(request.bedrooms) && request.bedrooms.length > 0
        ? request.bedrooms.join(", ")
        : "Any";
    const bathrooms
      = Array.isArray(request.bathrooms) && request.bathrooms.length > 0
        ? request.bathrooms.join(", ")
        : "Any";
    const earliestDate = this.formatDateValue(
      request.movingDateRange?.earliest,
    );
    const latestDate = this.formatDateValue(request.movingDateRange?.latest);
    const location = this.formatRequestLocations(request.locations);
    const marketScope = request.scope || "Upcoming";
    const features = this.formatSharedRequestFeatures(request);
    const preferencesByOrder
      = Array.isArray(request.preferences) && request.preferences.length > 0
        ? request.preferences.map(value => String(value)).join(", ")
        : "Not specified";
    const submittedAt = this.formatEasternTime(
      request.createdAt ? new Date(request.createdAt) : new Date(),
    );

    const sendResults = await Promise.allSettled(
      recipients.map(recipient =>
        emailService.sendNonRegisteredAgentSharedRequestNotification({
          to: recipient.email,
          agentName: recipient.name,
          renterFirstName,
          requestId,
          marketScope,
          minPrice,
          maxPrice,
          earliestDate,
          latestDate,
          bedrooms,
          bathrooms,
          location,
          features,
          preferencesByOrder,
          submittedAt,
        }),
      ),
    );

    let sentCount = 0;
    let failedCount = 0;

    sendResults.forEach((result, index) => {
      const recipient = recipients[index];

      if (result.status === "rejected") {
        failedCount += 1;
        logger.warn(
          {
            email: recipient.email,
            requestId,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
          },
          "Failed to send shared request notification to non-registered agent",
        );
        return;
      }

      if (result.value.success) {
        sentCount += 1;
      }
      else {
        failedCount += 1;
        logger.warn(
          {
            email: recipient.email,
            requestId,
            error: result.value.error,
          },
          "Shared request notification returned unsuccessful result",
        );
      }
    });

    logger.info(
      { requestId, sentCount, failedCount, recipientCount: recipients.length },
      "Shared request notification dispatch completed",
    );
  }

  private async getNonRegisteredAgentRecipientsForSharedRequestNotification(
    registeredAgentId: string,
  ): Promise<Array<{ userId: string; name: string; email: string }>> {
    const profiles = await this.agentRepository.find({
      isActive: true,
    } as any);

    const candidateAgentIds = Array.from(
      new Set(
        profiles
          .filter(profile => profile.emailSubscriptionEnabled !== false)
          .map(profile => this.normalizeUserId(profile.userId))
          .filter(
            (agentId): agentId is string =>
              Boolean(agentId) && agentId !== registeredAgentId,
          ),
      ),
    );

    if (candidateAgentIds.length === 0) {
      return [];
    }

    const agentUsers = await Promise.all(
      candidateAgentIds.map(agentId => this.userRepository.findById(agentId)),
    );

    const recipients = new Map<string, { userId: string; name: string; email: string }>();
    for (const user of agentUsers) {
      if (!user?._id || !user.email) {
        continue;
      }
      if (user.role !== ROLES.AGENT) {
        continue;
      }
      if (user.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
        continue;
      }
      if (user.isDeleted) {
        continue;
      }

      const email = user.email.trim();
      if (!email) {
        continue;
      }

      const key = email.toLowerCase();
      if (!recipients.has(key)) {
        recipients.set(key, {
          userId: user._id.toString(),
          name: user.fullName || email,
          email,
        });
      }
    }

    return Array.from(recipients.values());
  }

  private formatCurrencyUSD(value: number | undefined): string {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "N/A";
    }

    return `$${value.toLocaleString("en-US")}`;
  }

  private formatRequestLocations(
    locations: Array<{ borough: string; neighborhoods: string[] }> | undefined,
  ): string {
    if (!Array.isArray(locations) || locations.length === 0) {
      return "N/A";
    }

    const formatted = locations
      .map((location) => {
        if (!location) {
          return "";
        }
        const borough = location.borough || "N/A";
        const neighborhoods
          = Array.isArray(location.neighborhoods) && location.neighborhoods.length > 0
            ? ` (${location.neighborhoods.join(", ")})`
            : "";
        return `${borough}${neighborhoods}`;
      })
      .filter(Boolean);

    return formatted.length > 0 ? formatted.join("; ") : "N/A";
  }

  private formatSharedRequestFeatures(request: IPreMarketRequest): string {
    const features: string[] = [];

    if (request.unitFeatures?.laundryInUnit) {
      features.push("Laundry in Unit");
    }
    if (request.unitFeatures?.privateOutdoorSpace) {
      features.push("Private Outdoor Space");
    }
    if (request.unitFeatures?.dishwasher) {
      features.push("Dishwasher");
    }
    if (request.buildingFeatures?.doorman) {
      features.push("Doorman");
    }
    if (request.buildingFeatures?.elevator) {
      features.push("Elevator");
    }
    if (request.buildingFeatures?.laundryInBuilding) {
      features.push("Laundry in Building");
    }
    if (request.petPolicy?.catsAllowed) {
      features.push("Cats Allowed");
    }
    if (request.petPolicy?.dogsAllowed) {
      features.push("Dogs Allowed");
    }
    if (request.guarantorRequired?.personalGuarantor) {
      features.push("Personal Guarantor");
    }
    if (request.guarantorRequired?.thirdPartyGuarantor) {
      features.push("Third-Party Guarantor");
    }

    return features.length > 0 ? features.join(", ") : "Not specified";
  }

  async expireRequests(): Promise<{
    expiredCount: number;
    deletedCount: number;
    failedCount: number;
  }> {
    const expiredRequests
      = await this.preMarketRepository.findExpiredRequests();

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
        const matchedAgentIds
          = await this.getMatchedAgentIdsForClosedAlert(requestId);
        const deleted = await this.preMarketRepository.softDelete(requestId);
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

        this.notifyAssociatedAgentsRequestClosed(
          request,
          "Expired",
          closedAt,
          matchedAgentIds,
        ).catch((error) => {
          logger.error(
            { error, requestId },
            "Failed to send request closed alert (non-blocking)",
          );
        });
      }
      catch (error) {
        failedCount += 1;
        logger.error(
          { error, requestId },
          "Failed to delete expired pre-market request",
        );
      }
    }

    if (deletedCount > 0) {
      try {
        await this.refreshConsolidatedExcel();
      }
      catch (error) {
        logger.error(
          { error, expiredRequestCount: deletedCount },
          "Consolidated Excel update failed after expiring pre-market requests",
        );
      }
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
    // AGENTS: See agent-specific approved/matched listings
    // ============================================
    logger.info(
      { agentId, type: agent.hasGrantAccess ? "grant-access" : "normal" },
      "Agent fetching approved and matched pre-market listings",
    );

    // Step 1: Get agent-specific records that should live outside /pre-market/all
    const accessRecords
      = await this.grantAccessRepository.findByAgentIdAndStatuses(agentId, [
        "approved",
        "free",
        "paid",
      ]);
    const renterRepresentationAccessRecords = accessRecords.filter(
      record => record.representation_type !== "owner_representation",
    );

    if (
      !Array.isArray(renterRepresentationAccessRecords)
      || renterRepresentationAccessRecords.length === 0
    ) {
      logger.info({ agentId }, "Normal agent has no access yet");
      return PaginationHelper.buildResponse(
        [],
        0,
        (query.page as number) || 1,
        (query.limit as number) || 10,
      ) as any;
    }

    const matchTimes = renterRepresentationAccessRecords
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

    const preMarketRequestIds = matchTimes.map(access => access.requestId);
    const matchTimeByRequestId = new Map(
      matchTimes.map(access => [access.requestId, access.timestamp]),
    );

    const listings
      = await this.preMarketRepository.findByIds(preMarketRequestIds);

    if (!listings || listings.length === 0) {
      return PaginationHelper.buildResponse(
        [],
        0,
        (query.page as number) || 1,
        (query.limit as number) || 10,
      ) as any;
    }

    const activeListings = listings.filter(
      (request: any) => !this.getAgentArchiveStatus(request, agentId).isArchivedForAgent,
    );

    const sortedListings = activeListings.sort((a: any, b: any) => {
      const timeA = matchTimeByRequestId.get(a._id?.toString()) ?? -1;
      const timeB = matchTimeByRequestId.get(b._id?.toString()) ?? -1;
      return timeB - timeA;
    });

    // Manual pagination - counts ONLY your filtered results
    const page = (query.page as number) || 1;
    const limit = (query.limit as number) || 10;
    const total = sortedListings.length;
    const startIndex = (page - 1) * limit;
    const paginatedData = sortedListings.slice(startIndex, startIndex + limit);
    const paginatedRequestIds = paginatedData
      .map((request: any) => request._id?.toString())
      .filter((id: string | undefined): id is string => Boolean(id));
    const globalMatchedScopeRequestIds
      = await this.getGlobalMatchedScopeRequestIdSet(paginatedRequestIds);
    const accessRecordByRequestId = new Map(
      renterRepresentationAccessRecords.map(access => [
        access.preMarketRequestId.toString(),
        access,
      ]),
    );

    // Enrich with agent-specific access state
    const enrichedData = await Promise.all(
      paginatedData.map(async (request: any) => {
        const requestId = request._id?.toString() || "";
        const accessRecord = accessRecordByRequestId.get(requestId);
        const accessSummary = this.buildAgentAccessSummary(
          accessRecord || null,
          agent.hasGrantAccess === true,
        );
        const renterInfo = accessSummary.canSeeRenterInfo
          ? await this.getRenterInfoForRequest(request.renterId?.toString())
          : null;
        const listingStatus
          = accessSummary.grantAccessStatus === "approved"
            ? "approved"
            : "matched";
        const shouldDisplayMatchedScope = globalMatchedScopeRequestIds.has(
          requestId,
        );
        const responseScope = this.resolveAgentVisibleScope(
          request.scope,
          shouldDisplayMatchedScope,
        );
        const registeredAgentId
          = await this.resolveRegisteredAgentIdForRequest(request);
        const isRegisteredAgent = registeredAgentId === agentId;
        const matchedByAgent = shouldDisplayMatchedScope
          ? await this.resolveMatchedAgentForView(agentId, requestId)
          : null;
        const visibleRequest
          = this.stripOwnerRepresentationMatchesForNonRegisteredAgent(
            request,
            isRegisteredAgent,
          );
        const archiveStatus = this.getAgentArchiveStatus(request, agentId);
        const registrationDisclosureStatus
          = this.getRegistrationDisclosureStatus(request, agentId);

        return {
          ...visibleRequest,
          scope: responseScope,
          matchedByAgent,
          renterInfo,
          status: accessSummary.grantAccessStatus,
          listingStatus,
          grantAccessStatus: accessSummary.grantAccessStatus,
          grantAccessId: accessSummary.grantAccessId,
          representation_type: accessSummary.representation_type,
          representationSelectedAt: accessSummary.representationSelectedAt,
          accessType: accessSummary.accessType,
          canRequestAccess: false,
          chargeAmount: accessSummary.chargeAmount ?? null,
          ...registrationDisclosureStatus,
          ...archiveStatus,
          ...(accessSummary.showPayment && accessSummary.payment
            ? { payment: accessSummary.payment }
            : {}),
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

    return this.enrichOwnerRepresentationDetailsForAgent(
      agentId,
      requestId,
      request,
      enrichedRequest,
    );
  }

  async enrichOwnerRepresentationDetailsForAgent(
    agentId: string,
    requestId: string,
    request: IPreMarketRequest | Record<string, any>,
    response: Record<string, any>,
  ): Promise<Record<string, any>> {
    const registeredAgentId = await this.resolveRegisteredAgentIdForRequest(
      request as IPreMarketRequest,
    );
    const isRegisteredAgent = registeredAgentId === agentId;
    const isOwnerRepresentationAgent
      = this.hasOwnerRepresentationMatchForAgent(request, agentId);

    const ownerRepresentationPayload: Record<string, any> = {};

    if (isRegisteredAgent) {
      ownerRepresentationPayload.ownerRepresentationMatches
        = await this.buildOwnerRepresentationMatches(request);
      ownerRepresentationPayload.ownerRepresentationStatus
        = this.getOwnerRepresentationStatus(request);

      this.preMarketRepository
        .markOwnerRepresentationMatchesViewed(requestId)
        .catch((error) => {
          logger.error(
            { error, requestId, agentId },
            "Failed to mark owner representation matches viewed",
          );
        });
    }

    if (isOwnerRepresentationAgent) {
      const registeredAgent = await this.getArchiveAgentInfo(registeredAgentId);
      ownerRepresentationPayload.ownerRepresentationRegisteredAgent = {
        id: registeredAgent.id,
        fullName: registeredAgent.fullName,
        title: registeredAgent.title,
        brokerage: registeredAgent.brokerage,
        email: registeredAgent.email,
        phoneNumber: registeredAgent.phoneNumber,
      };
      ownerRepresentationPayload.ownerRepresentationSelected = true;
    }

    const visibleResponse
      = this.stripOwnerRepresentationMatchesForNonRegisteredAgent(
        response,
        isRegisteredAgent,
      );

    return {
      ...visibleResponse,
      ...ownerRepresentationPayload,
    };
  }

  /**
   * Converts an agent's selection into either an owner-representation match or a free renter-representation grant-access record.
   * Expects an agent user ID, active request ID, and representation type selected from the agent UI.
   * Can fail when the agent lacks permission, the listing is inactive, visibility rules block matching, or notification side effects fail non-blockingly.
   */
  async matchRequestForAgent(
    agentId: string,
    requestId: string,
    representationType: MatchRepresentationType = "renter_representation",
    opportunityDetails?: string,
    additionalOpportunity: boolean = false,
    matchContext?: MatchApartmentInput,
  ): Promise<any> {
    const normalizedOpportunityDetails
      = this.normalizeOpportunityDetails(opportunityDetails);
    if (hasRiskyOpportunityDetailsWording(normalizedOpportunityDetails)) {
      throw new BadRequestException(OPPORTUNITY_DETAILS_RISKY_WORDING_MESSAGE);
    }

    const agent = await this.agentRepository.findByUserId(agentId);
    if (!agent) {
      throw new ForbiddenException(
        "You do not have permission to match requests",
      );
    }

    const listingActivationCheck
      = await this.preMarketRepository.findByIdWithActivationStatus(requestId);

    if (!listingActivationCheck) {
      throw new NotFoundException("Pre-market request not found");
    }
    const matchSummary = this.buildMatchCompatibilitySummary(
      matchContext,
      listingActivationCheck as IPreMarketRequest,
    );

    const isRegisteredAgent = await this.isRegisteredAgentForRequest(
      agentId,
      listingActivationCheck as any,
    );
    if (
      !agent.hasGrantAccess
      && representationType !== "owner_representation"
      && !isRegisteredAgent
    ) {
      throw new ForbiddenException(
        "You do not have permission to match requests",
      );
    }

    this.ensureAgentCanViewRequest(agent, listingActivationCheck as any);
    await this.ensureAgentCanViewRequestVisibility(
      agentId,
      listingActivationCheck as any,
    );
    await this.ensureRegisteredAgentCanMatchRequest(
      agentId,
      listingActivationCheck as any,
    );

    if (!listingActivationCheck.isActive) {
      throw new ForbiddenException(
        "This listing is no longer accepting requests",
      );
    }

    if (representationType === "owner_representation") {
      const alreadySelected = this.hasOwnerRepresentationMatchForAgent(
        listingActivationCheck as any,
        agentId,
      );
      const agentSnapshot
        = await this.resolveOwnerRepresentationAgentDetails(agentId);
      const updatedRequest = alreadySelected
        ? null
        : await this.preMarketRepository.addOwnerRepresentationMatch(
            requestId,
            agentId,
            agentSnapshot,
            normalizedOpportunityDetails,
          );
      const currentRequest = updatedRequest || listingActivationCheck;
      const registeredAgentId
        = await this.resolveRegisteredAgentIdForRequest(currentRequest as any);
      const registeredAgent = await this.getArchiveAgentInfo(registeredAgentId);
      const ownerMatches = Array.isArray(
        (currentRequest as any)?.ownerRepresentationMatches,
      )
        ? (currentRequest as any).ownerRepresentationMatches
        : [];
      const selectedMatch = ownerMatches.find((match: any) => {
        return this.normalizeUserId(match?.agentId) === agentId;
      });

      if (!alreadySelected && updatedRequest) {
        this.notifyRegisteredAgentAboutOwnerRepresentationMatch(
          agentId,
          currentRequest as any,
          normalizedOpportunityDetails,
          matchSummary,
        ).catch((error) => {
          logger.error(
            { error, requestId, agentId },
            "Failed to send owner representation match acknowledgment (non-blocking)",
          );
        });
      }

      return {
        requestId,
        matchedAgentId: agentId,
        representation_type: "owner_representation",
        representationSelectedAt: selectedMatch?.selectedAt ?? new Date(),
        ownerRepresentationSelected: true,
        registeredAgentInfo: {
          id: registeredAgent.id,
          fullName: registeredAgent.fullName,
          title: registeredAgent.title,
          brokerage: registeredAgent.brokerage,
          email: registeredAgent.email,
          phoneNumber: registeredAgent.phoneNumber,
        },
      };
    }

    const existing = await this.grantAccessRepository.findByAgentAndRequest(
      agentId,
      requestId,
    );

    const shouldNotify
      = !existing || (existing.status !== "free" && existing.status !== "paid");
    const shouldSendAdditionalOpportunity
      = additionalOpportunity
        && representationType === "renter_representation"
        && Boolean(existing && (existing.status === "free" || existing.status === "paid"));

    let matchRecord: IGrantAccessRequest;
    const representationPayload = {
      representation_type: representationType,
      representationSelectedAt: new Date(),
      ...(normalizedOpportunityDetails
        ? { opportunityDetails: normalizedOpportunityDetails }
        : {}),
    };

    try {
      if (existing) {
        if (existing.status === "free" || existing.status === "paid") {
          if (shouldSendAdditionalOpportunity) {
            this.notifyRenterAboutMatchedOpportunity(
              agentId,
              listingActivationCheck,
              existing._id,
              normalizedOpportunityDetails,
              { additionalOpportunity: true, matchSummary },
            ).catch((error) => {
              logger.error(
                { error, requestId, agentId },
                "Failed to send additional renter opportunity notification (non-blocking)",
              );
            });

            const existingObject = typeof (existing as any).toObject === "function"
              ? (existing as any).toObject()
              : existing;

            return {
              ...existingObject,
              additionalOpportunity: true,
            };
          }

          return existing;
        }

        const updated = await this.grantAccessRepository.updateById(
          existing._id.toString(),
          { status: "free", ...representationPayload },
        );

        matchRecord = updated || existing;
      }
      else {
        matchRecord = await this.grantAccessRepository.create({
          preMarketRequestId: requestId,
          agentId,
          status: "free",
          ...representationPayload,
          createdAt: new Date(),
        });
      }
    }
    catch (error) {
      throw error;
    }

    await this.preMarketRepository.setAllMarketRequestPrivateAfterMatch(
      requestId,
    );

    if (shouldNotify) {
      this.notifyRenterAboutMatchedOpportunity(
        agentId,
        listingActivationCheck,
        matchRecord._id,
        normalizedOpportunityDetails,
        { matchSummary },
      ).catch((error) => {
        logger.error(
          { error, requestId, agentId },
          "Failed to send renter match notification (non-blocking)",
        );
      });
    }

    return matchRecord;
  }

  async matchRequestsForAgent(
    agentId: string,
    requestIds: string[],
    representationType: MatchRepresentationType = "renter_representation",
    opportunityDetails?: string,
    additionalOpportunity: boolean = false,
    matchContext?: MatchApartmentInput,
  ): Promise<{
    matched: Array<{ requestId: string; result: any }>;
    failed: Array<{ requestId: string; message: string }>;
  }> {
    const uniqueRequestIds = Array.from(new Set(requestIds.filter(Boolean)));
    const matched: Array<{ requestId: string; result: any }> = [];
    const failed: Array<{ requestId: string; message: string }> = [];

    for (const requestId of uniqueRequestIds) {
      try {
        const result = await this.matchRequestForAgent(
          agentId,
          requestId,
          representationType,
          opportunityDetails,
          additionalOpportunity,
          matchContext,
        );
        matched.push({ requestId, result });
      }
      catch (error) {
        failed.push({
          requestId,
          message:
            error instanceof Error
              ? error.message
              : "Unable to match this request",
        });
      }
    }

    return { matched, failed };
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
        const referrerId = referrer._id?.toString();
        const referrerAgentProfile = referrerId
          ? await this.agentRepository.findByUserId(referrerId)
          : null;
        referrerInfo = {
          referrerId: referrer._id,
          referrerName: referrer.fullName,
          activationLink: referrerAgentProfile?.activationLink || null,
          referrerRole: "Agent",
          referralType: "agent_referral",
        };
      }
    }
    else if (renter.referredByAdminId) {
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
        activationLink: defaultAgent.activationLink,
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
    setPerformanceMetric("admin.requestsOnPage", paginated.data.length);

    const enrichmentStartedAt = nowMs();
    const enrichmentContext = await this.buildAdminListEnrichmentContext(
      paginated.data,
    );
    const enrichedData = await Promise.all(
      paginated.data.map(request =>
        this.enrichRequestForAdminFromContext(request, enrichmentContext),
      ),
    );
    addPerformanceTiming("enrichmentExecutionTimeMs", nowMs() - enrichmentStartedAt);

    return {
      ...paginated,
      data: enrichedData,
    };
  }

  private async buildAdminListEnrichmentContext(
    requests: IPreMarketRequest[],
  ): Promise<AdminListEnrichmentContext> {
    const requestIds = requests
      .map(request => request._id?.toString())
      .filter((requestId): requestId is string => Boolean(requestId));
    const renterUserIds = Array.from(
      new Set(
        requests
          .map(request => this.normalizeUserId(request.renterId))
          .filter((renterId): renterId is string => Boolean(renterId)),
      ),
    );

    incrementPerformanceMetric(
      "admin.renterReferrerLookups",
      renterUserIds.length > 0 ? 1 : 0,
    );
    incrementPerformanceMetric(
      "admin.grantAccessLookups",
      requestIds.length > 0 ? 1 : 0,
    );

    const [renters, grantAccessRecords] = await Promise.all([
      this.renterRepository.findRentersWithReferrersByUserIds(renterUserIds),
      this.grantAccessRepository.findByPreMarketRequestIds(requestIds),
    ]);
    const renterByUserId = new Map(
      renters
        .map((renter: any) => [this.normalizeUserId(renter.userId), renter])
        .filter(([userId]) => Boolean(userId)) as Array<[string, any]>,
    );
    const grantAccessByRequestId = new Map<string, IGrantAccessRequest[]>();

    for (const record of grantAccessRecords) {
      const requestId = record.preMarketRequestId?.toString();
      if (!requestId) {
        continue;
      }

      const recordsForRequest = grantAccessByRequestId.get(requestId) || [];
      recordsForRequest.push(record);
      grantAccessByRequestId.set(requestId, recordsForRequest);
    }

    const agentUserIds = Array.from(
      new Set(
        grantAccessRecords
          .map(record => record.agentId?.toString())
          .filter((agentId): agentId is string => Boolean(agentId)),
      ),
    );
    const referrerAgentUserIds = Array.from(
      new Set(
        renters
          .filter((renter: any) => renter.registrationType === "agent_referral")
          .map((renter: any) => this.normalizeUserId(renter.referredByAgentId))
          .filter((agentId): agentId is string => Boolean(agentId)),
      ),
    );
    const agentProfileUserIds = Array.from(
      new Set([...agentUserIds, ...referrerAgentUserIds]),
    );
    incrementPerformanceMetric(
      "admin.agentUserLookups",
      agentUserIds.length > 0 ? 1 : 0,
    );
    incrementPerformanceMetric(
      "admin.agentProfileLookups",
      agentProfileUserIds.length > 0 ? 1 : 0,
    );
    setPerformanceMetric("admin.agentUserIdsLoaded", agentUserIds.length);
    setPerformanceMetric(
      "admin.agentProfileIdsLoaded",
      agentProfileUserIds.length,
    );
    const [agentUsers, agentProfiles] = await Promise.all([
      this.userRepository.findByIdsIncludingDeleted(
        agentUserIds,
        "fullName email phoneNumber role profileImageUrl",
      ),
      this.agentRepository.findByUserIds(agentProfileUserIds),
    ]);
    const agentUserById = new Map(
      agentUsers.map((user: any) => [user._id?.toString(), user]),
    );
    const agentProfileByUserId = new Map(
      agentProfiles
        .map((profile: any) => [this.normalizeUserId(profile.userId), profile])
        .filter(([userId]) => Boolean(userId)) as Array<[string, any]>,
    );
    const referrerAgentProfileByUserId = new Map(
      referrerAgentUserIds
        .map(agentId => [agentId, agentProfileByUserId.get(agentId)])
        .filter(([, profile]) => Boolean(profile)) as Array<[string, any]>,
    );

    return {
      renterByUserId,
      grantAccessByRequestId,
      agentUserById,
      agentProfileByUserId,
      referrerAgentProfileByUserId,
    };
  }

  private async enrichRequestForAdminFromContext(
    request: IPreMarketRequest,
    context: AdminListEnrichmentContext,
  ): Promise<AdminPreMarketRequestItem> {
    const requestId = request._id!.toString();
    const renterId = this.normalizeUserId(request.renterId);
    const renter = renterId ? context.renterByUserId.get(renterId) : null;
    const allRequests = context.grantAccessByRequestId.get(requestId) || [];
    const renterInfo = await this.buildRenterInfoFromAdminContext(
      renter,
      context.referrerAgentProfileByUserId,
    );
    const agentRequestSummary
      = this.buildAgentRequestSummaryFromRecords(allRequests);
    const agentRequests = this.buildAgentRequestDetailsFromRecords(
      allRequests,
      context.agentUserById,
      context.agentProfileByUserId,
    );

    return {
      ...(request.toObject ? request.toObject() : request),
      renterInfo,
      agentRequestSummary,
      agentRequests,
    } as AdminPreMarketRequestItem;
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
    incrementPerformanceMetric("admin.renterReferrerLookups", 1);
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
    incrementPerformanceMetric("admin.grantAccessLookups", 1);
    const allRequests
      = await this.grantAccessRepository.findByPreMarketRequestId(
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
      }
      else if (req.status === "pending" || req.status === "approved") {
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

    const profileImageUrl
      = typeof renter.userId === "object" && renter.userId
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
      renter.registrationType === "agent_referral"
      && renter.referredByAgentId
    ) {
      const referrer
        = typeof renter.referredByAgentId === "object"
          ? renter.referredByAgentId
          : await this.userRepository.findById(
              renter.referredByAgentId.toString(),
            );

      if (referrer) {
        const referrerId = referrer._id?.toString() || "";
        const referrerAgentProfile = referrerId
          ? await this.agentRepository.findByUserId(referrerId)
          : null;
        renterInfo.referralInfo = {
          referrerId,
          referrerName: referrer.fullName || referrer.name || "Unknown",
          activationLink: referrerAgentProfile?.activationLink || null,
          referrerEmail: referrer.email || null,
          referrerPhoneNumber: referrer.phoneNumber || null,
          referralCode: referrer.referralCode || null,
          referrerType: "AGENT",
        };
      }
    }
    else if (
      renter.registrationType === "admin_referral"
      && renter.referredByAdminId
    ) {
      const referrer
        = typeof renter.referredByAdminId === "object"
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
        activationLink: defaultAgent.activationLink,
        referrerEmail: defaultAgent.email,
        referrerPhoneNumber: defaultAgent.phoneNumber,
        referralCode: defaultAgent.referralCode,
        referrerType: "AGENT",
      };
    }

    return renterInfo;
  }

  private async buildRenterInfoFromAdminContext(
    renter: any,
    referrerAgentProfileByUserId: Map<string, any>,
  ): Promise<AdminRenterInfo> {
    if (!renter) {
      return {
        renterId: "",
        fullName: "Unknown renter",
        email: "",
        registrationType: "normal",
      };
    }

    const profileImageUrl
      = typeof renter.userId === "object" && renter.userId
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
      renter.registrationType === "agent_referral"
      && renter.referredByAgentId
    ) {
      const referrer = renter.referredByAgentId;

      if (referrer) {
        const referrerId = this.normalizeUserId(referrer) || "";
        const referrerAgentProfile = referrerId
          ? referrerAgentProfileByUserId.get(referrerId) || null
          : null;
        renterInfo.referralInfo = {
          referrerId,
          referrerName: referrer.fullName || referrer.name || "Unknown",
          activationLink: referrerAgentProfile?.activationLink || null,
          referrerEmail: referrer.email || null,
          referrerPhoneNumber: referrer.phoneNumber || null,
          referralCode: referrer.referralCode || null,
          referrerType: "AGENT",
        };
      }
    }
    else if (
      renter.registrationType === "admin_referral"
      && renter.referredByAdminId
    ) {
      const referrer = renter.referredByAdminId;

      if (referrer) {
        renterInfo.referralInfo = {
          referrerId: this.normalizeUserId(referrer) || "",
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
        activationLink: defaultAgent.activationLink,
        referrerEmail: defaultAgent.email,
        referrerPhoneNumber: defaultAgent.phoneNumber,
        referralCode: defaultAgent.referralCode,
        referrerType: "AGENT",
      };
    }

    return renterInfo;
  }

  private buildAgentRequestSummaryFromRecords(
    allRequests: IGrantAccessRequest[],
  ): AdminAgentRequestSummary {
    if (!allRequests || allRequests.length === 0) {
      return { total: 0, approve: 0, pending: 0 };
    }

    let approve = 0;
    let pending = 0;

    for (const req of allRequests) {
      if (req.status === "free" || req.status === "paid") {
        approve += 1;
      }
      else if (req.status === "pending" || req.status === "approved") {
        pending += 1;
      }
    }

    return {
      total: allRequests.length,
      approve,
      pending,
    };
  }

  private buildAgentRequestDetailsFromRecords(
    allRequests: IGrantAccessRequest[],
    agentUserById: Map<string, any>,
    agentProfileByUserId: Map<string, any>,
  ): AgentRequestDetail[] {
    if (!allRequests || allRequests.length === 0) {
      return [];
    }

    return allRequests.map((req: any) => {
      const agentUserId = req.agentId?.toString() || "";
      const agent = agentUserId ? agentUserById.get(agentUserId) : null;
      const agentProfile = agentUserId
        ? agentProfileByUserId.get(agentUserId) || null
        : null;
      const agentInfo = agent
        ? {
            agentId: agent._id?.toString() || "",
            fullName: agent.fullName || "",
            email: agent.email || "",
            phoneNumber: agent.phoneNumber || undefined,
            role: (agent.role as string) || "Agent",
            activationLink: agentProfile?.activationLink || null,
            profileImageUrl: (agent.profileImageUrl || undefined) as
            | string
            | undefined,
          }
        : {
            agentId: agentUserId,
            fullName: "Unknown Agent",
            email: "",
            phoneNumber: undefined,
            role: "Agent",
            activationLink: agentProfile?.activationLink || null,
            profileImageUrl: undefined,
          };
      const baseStatus
        = (req.status as
        | "pending"
        | "approved"
        | "free"
        | "rejected"
        | "paid") || "pending";
      const isChargePending
        = baseStatus === "pending"
          && req.adminDecision?.isFree === false
          && (req.payment?.paymentStatus || (req.payment as any)?.status)
          === "pending";
      const isChargeApplied
        = baseStatus === "pending"
          && req.adminDecision?.isFree === false
          && (req.payment?.amount > 0 || (req.payment as any)?.status)
          === "pending";
      const normalizedStatus
        = baseStatus === "approved" ? "approved" : baseStatus;
      const displayStatus
        = isChargePending && isChargeApplied ? "approved" : normalizedStatus;
      const paymentInfo
        = baseStatus === "free"
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

      return {
        _id: req._id?.toString() || "",
        agentId: req.agentId?.toString() || "",
        agent: agentInfo,
        status: displayStatus,
        requestedAt: req.createdAt || new Date(),
        payment: paymentInfo,
      };
    });
  }

  private async getAgentRequestDetails(
    preMarketRequestId: string,
  ): Promise<AgentRequestDetail[]> {
    incrementPerformanceMetric("admin.grantAccessLookups", 1);
    const allRequests
      = await this.grantAccessRepository.findByPreMarketRequestId(
        preMarketRequestId,
      );

    if (!allRequests || allRequests.length === 0) {
      return [];
    }

    // Fetch full agent details for each request
    const requestsWithAgents = await Promise.all(
      allRequests.map(async (req: any) => {
        // Get agent user details
        const agentUserId = req.agentId?.toString() || "";
        const [agent, agentProfile] = await Promise.all([
          this.userRepository.findById(agentUserId),
          agentUserId ? this.agentRepository.findByUserId(agentUserId) : null,
        ]);

        // Build agent object with proper types
        const agentInfo = agent
          ? {
              agentId: agent._id?.toString() || "",
              fullName: agent.fullName || "",
              email: agent.email || "",
              phoneNumber: agent.phoneNumber || undefined,
              role: (agent.role as string) || "Agent",
              activationLink: agentProfile?.activationLink || null,
              profileImageUrl: (agent.profileImageUrl || undefined) as
              | string
              | undefined,
            }
          : {
              agentId: agentUserId,
              fullName: "Unknown Agent",
              email: "",
              phoneNumber: undefined,
              role: "Agent",
              activationLink: agentProfile?.activationLink || null,
              profileImageUrl: undefined,
            };

        const baseStatus
          = (req.status as
          | "pending"
          | "approved"
          | "free"
          | "rejected"
          | "paid") || "pending";

        const isChargePending
          = baseStatus === "pending"
            && req.adminDecision?.isFree === false
            && (req.payment?.paymentStatus || (req.payment as any)?.status)
            === "pending";

        const isChargeApplied
          = baseStatus === "pending"
            && req.adminDecision?.isFree === false
            && (req.payment?.amount > 0 || (req.payment as any)?.status)
            === "pending";

        const normalizedStatus
          = baseStatus === "approved" ? "approved" : baseStatus;

        const displayStatus
          = isChargePending && isChargeApplied ? "approved" : normalizedStatus;

        const paymentInfo
          = baseStatus === "free"
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
        const registeredAgentId
          = await this.resolveRegisteredAgentIdForRequest(request);
        const enriched = await this.enrichRequestWithFullRenterInfo(
          request,
          agentId,
        );
        return this.stripOwnerRepresentationMatchesForNonRegisteredAgent(
          enriched,
          registeredAgentId === agentId,
        );
      }),
    );

    // Mark agent as having viewed these requests
    const requestIds = paginated.data.map(r => r._id?.toString());
    await Promise.all(
      requestIds.map(requestId =>
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
    _agentId: string,
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
      const referrer
        = typeof renter.referredByAgentId === "object"
          && renter.referredByAgentId._id
          ? renter.referredByAgentId // Already populated
          : await this.userRepository.findById(
              renter.referredByAgentId.toString(),
            );

      if (referrer) {
        const referrerId = referrer._id?.toString();
        const referrerAgentProfile = referrerId
          ? await this.agentRepository.findByUserId(referrerId)
          : null;
        referrerInfo = {
          referrerId: referrer._id?.toString(),
          referrerName: referrer.fullName || referrer.name || "Unknown",
          referrerEmail: referrer.email ?? null,
          referrerPhoneNumber: referrer.phoneNumber ?? null,
          referralCode: referrer.referralCode ?? null,
          activationLink: referrerAgentProfile?.activationLink || null,
          referrerRole: "Agent",
          referralType: "agent_referral",
        };
      }
    }
    else if (renter.referredByAdminId) {
      // Check if it's a populated object or just an ObjectId
      const referrer
        = typeof renter.referredByAdminId === "object"
          && renter.referredByAdminId._id
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
        activationLink: defaultAgent.activationLink,
        referrerRole: "Agent",
        referralType: "agent_referral",
      };
    }

    const profileImageUrl
      = (typeof renter.userId === "object" && renter.userId
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
  /**
   * Lists requests visible to a normal agent, hiding renter info until access is approved.
   * Expects an agent user ID and pagination/filter query.
   * Can fail when the agent profile is missing or visibility/access enrichment lookups fail.
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
    const paginated
      = await this.preMarketRepository.findAvailableForNormalAgents(
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
        }
        else {
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
    const requestIds = paginated.data.map(r => r._id?.toString());
    await Promise.all(
      requestIds.map(requestId =>
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

  /**
   * Returns full request details for an agent only after grant-access rules allow it.
   * Expects an agent user ID and request ID.
   * Can fail when the request/agent is missing, access is pending/rejected/unpaid, or the agent is not allowed to view the request.
   */
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

  /**
   * Determines whether an agent can see renter info for a specific request.
   * Expects an agent user ID and request ID; reconciles pending Stripe payment status when needed.
   * Can return no access when payment is unpaid/rejected or log a warning if payment reconciliation fails.
   */
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
      grantAccess
      && grantAccess.payment?.paymentStatus === "pending"
      && grantAccess.payment.stripePaymentIntentId
    ) {
      try {
        await this.paymentService.reconcilePaymentIntent(
          grantAccess.payment.stripePaymentIntentId,
        );
        grantAccess = await this.grantAccessRepository.findByAgentAndRequest(
          agentId,
          requestId,
        );
      }
      catch (error) {
        logger.warn(
          { error, grantAccessId },
          "Failed to refresh payment status",
        );
      }
    }

    if (
      grantAccess
      && (grantAccess.status === "free" || grantAccess.status === "paid")
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

  /**
   * Finds the paid/free grant-access record that proves an agent is matched to a request.
   * Expects an agent user ID and request ID.
   * Can return null when no active free or paid match exists.
   */
  async getMatchedAccessRecord(
    agentId: string,
    requestId: string,
  ): Promise<IGrantAccessRequest | null> {
    const grantAccess = await this.grantAccessRepository.findByAgentAndRequest(
      agentId,
      requestId,
    );

    if (
      grantAccess
      && (grantAccess.status === "free" || grantAccess.status === "paid")
    ) {
      return grantAccess;
    }

    return null;
  }

  private async notifyRegisteredAgentAboutOwnerRepresentationMatch(
    agentId: string,
    preMarketRequest: IPreMarketRequest,
    opportunityDetails?: string,
    matchSummary?: IMatchCompatibilitySummary,
  ): Promise<void> {
    const renter = await this.renterRepository.findRenterWithReferrer(
      preMarketRequest.renterId.toString(),
    );

    if (!renter?.fullName) {
      logger.warn(
        { requestId: preMarketRequest._id },
        "Renter not found for owner representation match acknowledgment",
      );
      return;
    }

    const matchedAgent = await this.userRepository.findById(agentId);
    if (!matchedAgent?.email) {
      logger.warn(
        { agentId, requestId: preMarketRequest._id },
        "Matched agent not found for owner representation match acknowledgment",
      );
      return;
    }

    const registeredAgentId
      = await this.resolveRegisteredAgentIdForRequest(preMarketRequest);
    const registeredAgent
      = await this.getArchiveAgentInfo(registeredAgentId);
    const matchedAgentProfile = await this.agentRepository.findByUserId(agentId);

    if (!registeredAgent.email) {
      logger.warn(
        { requestId: preMarketRequest._id, registeredAgentId },
        "Registered agent email missing for owner representation match acknowledgment",
      );
      return;
    }

    const registeredAgentFirstName
      = registeredAgent.fullName?.trim().split(/\s+/)[0]
        || registeredAgent.fullName
        || "Agent";
    const cc = this.buildUniqueEmailList(
      [env.ADMIN_EMAIL, matchedAgent.email],
      [registeredAgent.email],
    );
    const requestRepresentedByTuvalMor = this.isTuvalMorAgent({
      fullName: registeredAgent.fullName,
      email: registeredAgent.email,
    });

    await emailService.sendOwnerRepresentationMatchReferralAcknowledgment({
      to: registeredAgent.email,
      registeredAgentFirstName,
      renterFullName: renter.fullName,
      requestId:
        preMarketRequest.requestId
        || preMarketRequest.requestName
        || preMarketRequest._id?.toString()
        || "N/A",
      registeredAgentFullName: registeredAgent.fullName,
      registeredAgentTitle: registeredAgent.title,
      registeredAgentBrokerage: registeredAgent.brokerage,
      matchedAgentFullName:
        matchedAgent.fullName || matchedAgent.email || "Matched Agent",
      matchedAgentTitle:
        matchedAgentProfile?.title || "Licensed Real Estate Salesperson",
      matchedAgentBrokerage:
        matchedAgentProfile?.brokerageName || "The Corcoran Group",
      matchedAgentEmail: matchedAgent.email,
      matchedAgentPhoneNumber: matchedAgent.phoneNumber || "N/A",
      opportunityDetails,
      requestRepresentedByTuvalMor,
      matchSummary,
      cc,
    });
  }

  private async notifyRenterAboutMatchedOpportunity(
    agentId: string,
    preMarketRequest: IPreMarketRequest,
    currentGrantAccessId?: string | Types.ObjectId,
    opportunityDetails?: string,
    options: {
      additionalOpportunity?: boolean;
      matchSummary?: IMatchCompatibilitySummary;
    } = {},
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

    const registeredAgentInfo
      = renter.registrationType === "agent_referral" && renter.referredByAgentId
        ? renter.referredByAgentId
        : null;

    const registeredAgentId
      = typeof registeredAgentInfo === "object" && registeredAgentInfo?._id
        ? registeredAgentInfo._id.toString()
        : typeof registeredAgentInfo === "string"
          ? registeredAgentInfo
          : null;

    let registeredAgentEmail
      = typeof registeredAgentInfo === "object" && registeredAgentInfo?.email
        ? registeredAgentInfo.email
        : SYSTEM_DEFAULT_AGENT.email;
    let registeredAgentFullName: string = DEFAULT_REFERRAL_AGENT_NAME;
    let registeredAgentTitle: string = DEFAULT_REFERRAL_AGENT_TITLE;
    let registeredAgentBrokerage: string = DEFAULT_REFERRAL_AGENT_BROKERAGE;
    let registeredAgentPhone: string = DEFAULT_REFERRAL_AGENT_PHONE || "N/A";

    if (
      typeof registeredAgentInfo === "object"
      && registeredAgentInfo?.fullName
    ) {
      registeredAgentFullName = registeredAgentInfo.fullName;
    }

    if (
      typeof registeredAgentInfo === "object"
      && registeredAgentInfo?.phoneNumber
    ) {
      registeredAgentPhone = registeredAgentInfo.phoneNumber;
    }

    if (registeredAgentId) {
      const [registeredAgentUser, registeredAgentProfile] = await Promise.all([
        this.userRepository.findById(registeredAgentId),
        this.agentRepository.findByUserId(registeredAgentId),
      ]);

      if (registeredAgentUser?.fullName) {
        registeredAgentFullName = registeredAgentUser.fullName;
      }

      if (registeredAgentUser?.email) {
        registeredAgentEmail = registeredAgentUser.email;
      }

      if (registeredAgentUser?.phoneNumber) {
        registeredAgentPhone = registeredAgentUser.phoneNumber;
      }

      registeredAgentTitle
        = registeredAgentProfile?.title || DEFAULT_REFERRAL_AGENT_TITLE;
      registeredAgentBrokerage
        = registeredAgentProfile?.brokerageName
          || DEFAULT_REFERRAL_AGENT_BROKERAGE;
    }

    const buildCcList = (
      emails: Array<string | undefined>,
      excludedEmails: Array<string | undefined> = [renter.email],
    ): string[] | undefined => {
      const excluded = excludedEmails
        .filter((email): email is string => Boolean(email && email.trim()))
        .map(email => email.trim().toLowerCase());
      const unique: string[] = [];

      for (const email of emails) {
        if (!email) {
          continue;
        }
        const trimmed = email.trim();
        if (!trimmed) {
          continue;
        }
        if (excluded.includes(trimmed.toLowerCase())) {
          continue;
        }
        if (
          unique.some(item => item.toLowerCase() === trimmed.toLowerCase())
        ) {
          continue;
        }
        unique.push(trimmed);
      }

      return unique.length > 0 ? unique : undefined;
    };

    const isRegisteredAgentMatch
      = (registeredAgentId && agent._id?.toString() === registeredAgentId)
        || (agent.email
          && registeredAgentEmail
          && agent.email.toLowerCase() === registeredAgentEmail.toLowerCase());
    const requestRepresentedByTuvalMor = this.isTuvalMorAgent({
      fullName: registeredAgentFullName,
      email: registeredAgentEmail,
    });
    const matchedAgentIsTuvalMor = this.isTuvalMorAgent({
      fullName: agent.fullName,
      email: agent.email,
    });

    if (isRegisteredAgentMatch) {
      await emailService.sendRenterOpportunityFoundByRegisteredAgent({
        to: renter.email,
        renterName: renter.fullName,
        registeredAgentFullName,
        registeredAgentTitle,
        registeredAgentBrokerage,
        registeredAgentEmail,
        registeredAgentPhone,
        opportunityDetails,
        additionalOpportunity: options.additionalOpportunity,
        matchSummary: options.matchSummary,
      });
    }
    else {
      const matchedAgentProfile = await this.agentRepository.findByUserId(agentId);
      const ccEmails = buildCcList([registeredAgentEmail, agent.email]);
      const requestScope = options.additionalOpportunity
        ? "Upcoming"
        : resolveRenterOpportunityEmailScope(
            preMarketRequest.scope,
            await this.shouldDisplayMatchedScopeForRequest(
              preMarketRequest._id?.toString() || "",
              currentGrantAccessId
                ? { excludeGrantAccessId: currentGrantAccessId }
                : undefined,
            ),
          );
      await emailService.sendRenterOpportunityFoundByOtherAgent({
        to: renter.email,
        renterName: renter.fullName,
        cc: ccEmails,
        replyTo: options.additionalOpportunity ? agent.email : registeredAgentEmail,
        requestScope,
        matchedAgentFullName: agent.fullName || agent.email || "N/A",
        matchedAgentTitle:
          matchedAgentProfile?.title || "Licensed Real Estate Agent",
        matchedAgentBrokerageName: matchedAgentProfile?.brokerageName || "N/A",
        matchedAgentEmail: agent.email,
        matchedAgentPhone: agent.phoneNumber || "N/A",
        matchedAgentDisclosureLink: matchedAgentProfile?.disclosureLink || null,
        opportunityDetails,
        additionalOpportunity: options.additionalOpportunity,
        matchSummary: options.matchSummary,
      });

      const agentAckCcEmails = buildCcList(
        [registeredAgentEmail, env.ADMIN_EMAIL],
        [agent.email],
      );
      await emailService.sendMatchReferralAcknowledgmentToMatchingAgent({
        to: agent.email,
        matchedAgentName: agent.fullName || agent.email || "Agent",
        renterFullName: renter.fullName,
        registeredAgentFullName,
        registeredAgentTitle,
        registeredAgentBrokerage,
        requestRepresentedByTuvalMor,
        matchedAgentIsTuvalMor,
        cc: agentAckCcEmails,
      });

      if (options.additionalOpportunity) {
        return;
      }
    }

    const renterUserId
      = this.normalizeUserId(renter.userId)
        ?? this.normalizeUserId(preMarketRequest.renterId);

    if (!renterUserId) {
      logger.warn(
        { requestId: preMarketRequest._id },
        "Skipping renter match notification because renter user ID is missing",
      );
      return;
    }

    const agentDisplayName
      = agent.fullName || agent.email || `Agent ${agentId}`;
    const listingTitle
      = preMarketRequest.requestName || "your pre-market request";

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
  /**
   * Returns one request to the renter who owns it.
   * Expects a renter user ID and request ID.
   * Can fail when the request is missing or belongs to another renter.
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
   * Soft-deletes any request from the admin dashboard and removes related grant-access records.
   * Expects a request ID selected by an admin.
   * Can fail when the request is missing or cleanup persistence fails; notifications run non-blockingly.
   */
  async adminDeleteRequest(requestId: string): Promise<void> {
    const request = await this.preMarketRepository.findById(requestId);

    if (!request) {
      throw new NotFoundException("Pre-market request not found");
    }

    const preMarketRequestId = request._id?.toString() || requestId;
    const matchedAgentIds
      = await this.getMatchedAgentIdsForClosedAlert(preMarketRequestId);
    const closedAt = new Date();

    // Archive the request so the admin Excel can still reflect the latest state.
    const deleted = await this.preMarketRepository.softDelete(requestId);
    if (!deleted) {
      throw new NotFoundException("Pre-market request not found");
    }
    await this.deleteGrantAccessRecords(requestId);

    this.scheduleConsolidatedExcelRefresh(
      {
        requestId,
        renterId: request.renterId?.toString(),
      },
      "Consolidated Excel update failed after admin deleted pre-market request",
    );

    logger.warn(
      { requestId, renterId: request.renterId },
      "Admin deleted pre-market request",
    );

    this.notifyAssociatedAgentsRequestClosed(
      request,
      "Deleted by admin",
      closedAt,
      matchedAgentIds,
    ).catch((error) => {
      logger.error(
        { error, requestId: request._id },
        "Failed to send request closed alert (non-blocking)",
      );
    });

    this.notifyRenterRequestClosed(request, "Deleted by admin", closedAt).catch(
      (error) => {
        logger.error(
          { error, requestId: request._id },
          "Failed to send renter request closed notification (non-blocking)",
        );
      },
    );

    this.notifyRenterAboutAdminDeletion(request).catch((error) => {
      logger.error(
        { error, requestId: request._id },
        "Failed to notify renter about admin deletion (non-blocking)",
      );
    });
  }

  // ============================================
  // LISTING ACTIVATION/DEACTIVATION
  // ============================================

  /**
   * Activates or deactivates a listing from the admin or owning renter flow.
   * Expects a listing ID, target active state, acting user ID, and role.
   * Can fail when the listing is missing, a renter does not own it, or the actor is not an admin/renter.
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
    }
    else if (userRole !== "Admin") {
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
      this.notifyAssociatedAgentsRequestClosed(
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

    this.scheduleConsolidatedExcelRefresh(
      {
        listingId,
        userId,
        userRole,
        isActive,
      },
      "Consolidated Excel update failed after listing activation change",
    );

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
    const listing
      = await this.preMarketRepository.findByIdWithActivationStatus(listingId);

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
  /**
   * Lists all pre-market requests owned by a renter.
   * Expects a renter user ID and pagination query from the renter dashboard.
   * Can fail when repository pagination or request lookup fails.
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

  /**
   * Lists renter requests with their visible matched/grant-access agent details.
   * Expects a renter user ID and pagination query from the renter dashboard.
   * Can fail when request lookup, grant-access lookup, or agent enrichment fails.
   */
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

    const requestIds = requests.data
      .map(request => request._id?.toString())
      .filter((requestId): requestId is string => Boolean(requestId));
    const grantAccessRecords
      = await this.grantAccessRepository.findByPreMarketRequestIds(requestIds);
    const grantAccessRecordsByRequestId = new Map<string, IGrantAccessRequest[]>();
    const matchedAgentIds = new Set<string>();

    for (const record of grantAccessRecords) {
      const requestId = record.preMarketRequestId?.toString();
      if (!requestId) {
        continue;
      }

      const recordsForRequest = grantAccessRecordsByRequestId.get(requestId) || [];
      recordsForRequest.push(record);
      grantAccessRecordsByRequestId.set(requestId, recordsForRequest);

      if (record.status === "free" || record.status === "paid") {
        const agentId = record.agentId?.toString();
        if (agentId) {
          matchedAgentIds.add(agentId);
        }
      }
    }

    const agentIds = Array.from(matchedAgentIds);
    const [agentProfiles, agentUsers] = await Promise.all([
      this.agentRepository.findByUserIds(agentIds),
      this.userRepository.findByIds(
        agentIds,
        "fullName email phoneNumber profileImageUrl",
      ),
    ]);
    const agentProfileByUserId = new Map(
      agentProfiles.map((profile: any) => [
        this.normalizeUserId(profile.userId),
        profile,
      ]),
    );
    const agentUserById = new Map(
      agentUsers.map((user: any) => [user._id?.toString(), user]),
    );

    const requestsWithAgents = requests.data.map((request) => {
      try {
        const requestId = request._id!.toString();
        const grantAccessRecords
          = grantAccessRecordsByRequestId.get(requestId) || [];

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
            const agentProfile
              = agentProfileByUserId.get(agentId);

            // Get agent user (name, email, phone, image)
            const agentUser = agentUserById.get(agentId);

            if (agentProfile && agentUser) {
              const accessInfo = agentMap.get(agentId);
              const accessStatus = accessInfo?.status as
                | "pending"
                | "free"
                | "rejected"
                | "paid"
                | undefined;
              const hasRequestAccess
                = accessStatus === "paid" || accessStatus === "free";
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
                  activationLink: agentProfile.activationLink || null,
                  profileImageUrl: agentUser.profileImageUrl || null,
                  accessStatus,
                  ...(hasGrantAccess && { hasGrantAccess }),
                });
              }
            }
          }
          catch {
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
            agents,
          },
        };
      }
      catch (error) {
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
    });

    return {
      data: requestsWithAgents,
      pagination: requests.pagination,
    };
  }

  /**
   * Builds renter identity and referral context for request-detail responses.
   * Expects a renter user ID attached to a pre-market request.
   * Can return null when the renter no longer exists or fail if referral lookups error.
   */
  private async getRenterInfoForRequest(renterId: string) {
    const renter = await this.renterRepository.findRenterWithReferrer(renterId);

    if (!renter) {
      return null;
    }

    const resolveReferrerId = (value: any): string | null => {
      if (!value)
        return null;
      if (typeof value === "string")
        return value;
      if (typeof value === "object" && value._id)
        return value._id.toString();
      if (typeof value?.toString === "function") {
        const str = value.toString();
        return str === "[object Object]" ? null : str;
      }
      return null;
    };

    let referrerInfo = null;

    if (renter.referredByAgentId) {
      const referredAgent
        = typeof renter.referredByAgentId === "object"
          && (renter.referredByAgentId as any)?._id
          ? renter.referredByAgentId
          : null;
      const referrerId = resolveReferrerId(renter.referredByAgentId);
      const referrer
        = referredAgent
          || (referrerId ? await this.userRepository.findById(referrerId) : null);
      if (referrer) {
        const referrerAgentProfile = referrerId
          ? await this.agentRepository.findByUserId(referrerId)
          : null;
        referrerInfo = {
          referrerId: referrer._id?.toString(),
          referrerName: referrer.fullName,
          referrerEmail: referrer.email ?? null,
          referrerPhoneNumber: referrer.phoneNumber ?? null,
          referralCode: referrer.referralCode ?? null,
          activationLink: referrerAgentProfile?.activationLink || null,
          referrerType: "AGENT",
        };
      }
    }
    else if (renter.referredByAdminId) {
      const referredAdmin
        = typeof renter.referredByAdminId === "object"
          && (renter.referredByAdminId as any)?._id
          ? renter.referredByAdminId
          : null;
      const referrerId = resolveReferrerId(renter.referredByAdminId);
      const referrer
        = referredAdmin
          || (referrerId ? await this.userRepository.findById(referrerId) : null);
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
        activationLink: defaultAgent.activationLink,
        referrerType: "AGENT",
      };
    }

    const profileImageUrl
      = (typeof renter.userId === "object" && renter.userId
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

  /**
   * Resolves the agent/admin referral information shown alongside renter requests.
   * Expects a renter user ID and checks both agent and admin referral relationships.
   * Can return null when the renter has no referrer or the referenced referrer no longer exists.
   */
  private async getReferralInfoForRenter(renterId: string) {
    const renter = await this.renterRepository.findRenterWithReferrer(renterId);

    if (!renter) {
      return null;
    }

    const registrationType = renter.registrationType || "normal";
    const referrer
      = registrationType === "agent_referral"
        ? renter.referredByAgentId
        : registrationType === "admin_referral"
          ? renter.referredByAdminId
          : null;

    if (!referrer) {
      const defaultAgent = await this.getDefaultReferralAgent();
      return {
        registrationType,
        renterName: renter.fullName || renter.email || "Renter",
        referrer: {
          referrerId: defaultAgent.id,
          referrerName: defaultAgent.fullName,
          referrerEmail: defaultAgent.email,
          referrerPhoneNumber: defaultAgent.phoneNumber,
          referralCode: defaultAgent.referralCode,
          activationLink: defaultAgent.activationLink,
          referrerType: "Agent",
        },
      };
    }

    const referrerId
      = typeof referrer === "object" && (referrer as any)?._id
        ? (referrer as any)._id.toString()
        : typeof referrer === "string"
          ? referrer
          : "";
    const referrerName
      = typeof referrer === "object"
        ? (referrer as any).fullName || (referrer as any).name || "Unknown"
        : "Unknown";
    const referrerEmail
      = typeof referrer === "object" ? (referrer as any).email || null : null;
    const referrerPhoneNumber
      = typeof referrer === "object"
        ? (referrer as any).phoneNumber || null
        : null;
    const referrerCode
      = typeof referrer === "object"
        ? (referrer as any).referralCode || null
        : null;
    const referrerType
      = registrationType === "agent_referral" ? "Agent" : "Admin";
    const referrerActivationLink
      = registrationType === "agent_referral" && referrerId
        ? (await this.agentRepository.findByUserId(referrerId))
            ?.activationLink || null
        : null;

    return {
      registrationType,
      renterName: renter.fullName || renter.email || "Renter",
      referrer: {
        referrerId,
        referrerName,
        referrerEmail,
        referrerPhoneNumber,
        referralCode: referrerCode,
        activationLink: referrerType === "Agent" ? referrerActivationLink : null,
        referrerType,
      },
    };
  }

  private async markRequestsAsDeletedInConsolidatedExcel(
    requestIds: string[],
  ): Promise<void> {
    const normalizedRequestIds = requestIds
      .map(requestId => requestId?.trim())
      .filter((requestId): requestId is string => Boolean(requestId));

    if (normalizedRequestIds.length === 0) {
      return;
    }

    try {
      const updatedCount
        = await this.excelService.updateConsolidatedPreMarketStatuses(
          normalizedRequestIds.map(requestId => ({
            requestId,
            status: "Archived",
          })),
        );

      if (updatedCount === 0) {
        logger.warn(
          { requestIds: normalizedRequestIds },
          "No consolidated Excel rows were updated for deleted requests",
        );
      }
    }
    catch (error) {
      logger.error(
        { error, requestIds: normalizedRequestIds },
        "Failed to mark requests as deleted in consolidated Excel",
      );
    }
  }

  private async updateConsolidatedExcel(): Promise<void> {
    const buffer = await this.excelService.generateConsolidatedPreMarketExcel();

    const { url, fileName, key }
      = await this.excelService.uploadConsolidatedExcel(buffer);

    const totalRenters = await this.renterRepository.count();
    const totalRequests = await this.preMarketRepository.count();

    const previousMetadata = await this.preMarketRepository.getExcelMetadata();
    const version = (previousMetadata?.version || 0) + 1;

    await this.preMarketRepository.updateExcelMetadata({
      type: "pre_market",
      fileName,
      fileUrl: url,
      key,
      lastUpdated: new Date(),
      totalRenters,
      totalRequests,
      version,
      generatedAt: new Date(),
    });

    logger.info(
      { url, fileName, key, version, totalRenters, totalRequests },
      "Consolidated Excel updated",
    );
  }

  async refreshConsolidatedExcel(): Promise<void> {
    await this.updateConsolidatedExcel();
  }

  /**
   * Get consolidated Excel file info
   * Can be called by admin to get download link
   */
  async getConsolidatedExcel(): Promise<any> {
    let metadata = await this.preMarketRepository.getExcelMetadata();

    if (!metadata) {
      await this.refreshConsolidatedExcel();
      metadata = await this.preMarketRepository.getExcelMetadata();
    }

    if (!metadata) {
      throw new NotFoundException("No consolidated Excel file found");
    }
    return metadata;
  }

  private scheduleConsolidatedExcelRefresh(
    context: Record<string, unknown>,
    message: string,
  ): void {
    this.refreshConsolidatedExcel().catch((error) => {
      logger.error({ error, ...context }, message);
    });
  }

  public async getAllListingsWithAllData(): Promise<any> {
    try {
      const listings
        = await this.preMarketRepository.getAllListingsWithAllData();

      return listings;
    }
    catch (error) {
      logger.error({ error }, "Failed to get all listings with data");
      throw error;
    }
  }
}
