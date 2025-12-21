// file: src/modules/agent/agent.service.ts

import { ROLES } from "@/constants/app.constants";
import { logger } from "@/middlewares/pino-logger";

import { ExcelService } from "@/services/excel.service";
import { S3Service } from "@/services/s3.service";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@/utils/app-error.utils";
import { hashPassword } from "@/utils/password.utils";
import type { Types } from "mongoose";
import { AuthUtil } from "../auth/auth.utils";
import { EmailVerificationService } from "../email-verification/email-verification.service";
import { ReferralService } from "../referral/referral.service";
import { UserService } from "../user/user.service";
import type { IAgentProfile } from "./agent.interface";
import { AgentProfileRepository } from "./agent.repository";
import type {
  AdminAgentMetricsResponse,
  AgentProfileResponse,
  AgentRegisterPayload,
  AgentRegistrationResponse,
  CreateAgentProfilePayload,
  UpdateAgentProfilePayload,
} from "./agent.type";

export class AgentService {
  private repository: AgentProfileRepository;
  private userService: UserService;
  private referralService: ReferralService;
  private emailVerificationService: EmailVerificationService;
  private excelService: ExcelService;
  private s3Service: S3Service;

  constructor() {
    this.repository = new AgentProfileRepository();
    this.userService = new UserService();
    this.referralService = new ReferralService();
    this.emailVerificationService = new EmailVerificationService();
    this.excelService = new ExcelService();
    this.s3Service = new S3Service();
  }

  async registerAgent(
    payload: AgentRegisterPayload
  ): Promise<AgentRegistrationResponse> {
    const existingUser = await this.userService.getUserByEmail(payload.email);
    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    const existingAgent = await this.repository.findByLicenseNumber(
      payload.licenseNumber
    );
    if (existingAgent) {
      throw new ConflictException("License number already registered");
    }

    const hashedPassword = await hashPassword(payload.password);

    const user = await this.userService.create({
      email: payload.email,
      password: hashedPassword,
      fullName: payload.fullName,
      phoneNumber: payload.phoneNumber,
      role: ROLES.AGENT,
      emailVerified: false,
      accountStatus: "pending",
    });

    const referralCode = await this.referralService.generateReferralCode(
      user._id.toString(),
      ROLES.AGENT
    );

    const profile = await this.repository.create({
      userId: user._id,
      licenseNumber: payload.licenseNumber,
      brokerageName: payload.brokerageName,
      isVerified: false,
      isSuspended: false,
      isApprovedByAdmin: false,
      grantAccessCount: 0,
      totalMatches: 0,
      successfulMatches: 0,
      totalRentersReferred: 0,
      activeReferrals: 0,
      referralConversionRate: 0,
    } as Partial<IAgentProfile>);

    await this.emailVerificationService.createOTP({
      userId: user._id.toString(),
      email: payload.email,
      userType: ROLES.AGENT,
      userName: payload.fullName,
    });

    const tokens = this.generateTokens(
      user._id.toString(),
      user.email,
      user.role,
      user.accountStatus,
      user.emailVerified
    );

    this.updateAgentConsolidatedExcel().catch((error) => {
      logger.error({ error }, "Consolidated Excel update failed");
    });

    return {
      user: {
        _id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        referralCode,
      },
      profile: this.toResponse(profile),
      tokens,
    };
  }

  /**
   * Create agent profile (INTERNAL)
   */
  async createAgentProfile(
    userId: string | Types.ObjectId,
    payload: CreateAgentProfilePayload
  ): Promise<AgentProfileResponse> {
    const existingAgent = await this.repository.findByLicenseNumber(
      payload.licenseNumber
    );
    if (existingAgent) {
      throw new ConflictException("License number already registered");
    }

    const profile = await this.repository.create({
      userId,
      licenseNumber: payload.licenseNumber,
      brokerageName: payload.brokerageName,
      isVerified: false,
      isSuspended: false,
      isApprovedByAdmin: false,
      grantAccessCount: 0,
      totalMatches: 0,
      successfulMatches: 0,
      totalRentersReferred: 0,
      activeReferrals: 0,
      referralConversionRate: 0,
    } as Partial<IAgentProfile>);

    return this.toResponse(profile);
  }

  /**
   * Get agent profile
   */
  async getAgentProfile(userId: string): Promise<AgentProfileResponse> {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException("Agent profile not found");
    }

    return this.toResponse(profile);
  }

  async updateAgentProfile(
    userId: string,
    payload: UpdateAgentProfilePayload
  ): Promise<AgentProfileResponse> {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException("Agent profile not found");
    }

    if (payload.licenseExpiryDate) {
      if (new Date(payload.licenseExpiryDate) <= new Date()) {
        throw new ConflictException(
          "License expiry date cannot be in the past"
        );
      }
    }

    const updated = await this.repository.updateByUserId(userId, payload);
    if (!updated) {
      throw new NotFoundException("Agent profile not found");
    }

    return this.toResponse(updated);
  }

  async getAgentStats(userId: string): Promise<{
    grantAccessCount: number;
    totalMatches: number;
    successfulMatches: number;
    successRate: number;
  }> {
    const stats = await this.repository.getAgentStats(userId);
    if (!stats) {
      throw new NotFoundException("Agent profile not found");
    }

    return stats;
  }

  async getReferralStats(userId: string): Promise<{
    referralCode: string | null;
    referralLink: string | null;
    totalReferrals: number;
    referredUsers: any[];
  }> {
    return this.referralService.getReferralStats(userId);
  }

  // ADMIN OPERATIONS

  async adminGetAllAgents(
    query: {
      page?: number;
      limit?: number;
      sort?: string;
      search?: string;
      isActive?: boolean;
      hasGrantAccess?: boolean;
    } = {}
  ): Promise<{
    data: AgentProfileResponse[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));

    let sort: Record<string, 1 | -1> = { createdAt: -1 };
    if (query.sort) {
      const sortField = query.sort.startsWith("-")
        ? query.sort.substring(1)
        : query.sort;
      const sortOrder = query.sort.startsWith("-") ? -1 : 1;
      sort = { [sortField]: sortOrder };
    }

    const result = await this.repository.findAllPaginated({
      page,
      limit,
      sort,
      search: query.search,
      isActive: query.isActive,
      hasGrantAccess: query.hasGrantAccess,
    });

    return {
      data: result.data.map((agent: IAgentProfile) => this.toResponse(agent)),
      pagination: result.pagination,
    };
  }

  async adminGetSpecificAgent(userId: string): Promise<AgentProfileResponse> {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException("Agent profile not found");
    }

    return this.toResponse(profile);
  }

  async adminGetPendingApprovalAgents(): Promise<AgentProfileResponse[]> {
    const agents: IAgentProfile[] =
      await this.repository.findPendingApprovalAgents();
    return agents.map((agent: IAgentProfile) => this.toResponse(agent));
  }

  /**
   * ADMIN: Get agent metrics
   */
  async adminGetAgentMetrics(): Promise<AdminAgentMetricsResponse> {
    const statuses = await this.repository.countByStatus();

    const allAgents: IAgentProfile[] = await this.repository.find({});

    const avgSuccessRate =
      allAgents.length > 0
        ? Math.round(
            allAgents.reduce((sum: number, agent: IAgentProfile) => {
              const rate =
                agent.totalMatches > 0
                  ? (agent.successfulMatches / agent.totalMatches) * 100
                  : 0;
              return sum + rate;
            }, 0) / allAgents.length
          )
        : 0;

    const totalMatches = allAgents.reduce(
      (sum: number, agent: IAgentProfile) => sum + agent.totalMatches,
      0
    );

    const totalGrantAccess = allAgents.reduce(
      (sum: number, agent: IAgentProfile) => sum + agent.grantAccessCount,
      0
    );

    return {
      totalAgents: statuses.total,
      verifiedAgents: statuses.verified,
      suspendedAgents: statuses.suspended,
      approvedAgents: statuses.approved,
      pendingApprovalAgents: statuses.pending,
      totalMatches,
      totalGrantAccess,
      avgSuccessRate,
    };
  }

  async incrementGrantAccessCount(userId: string): Promise<void> {
    await this.repository.incrementGrantAccessCount(userId);
  }

  async incrementTotalMatches(userId: string): Promise<void> {
    await this.repository.incrementTotalMatches(userId);
  }

  async incrementSuccessfulMatches(userId: string): Promise<void> {
    await this.repository.incrementSuccessfulMatches(userId);
  }

  async getAgentById(userId: string): Promise<IAgentProfile | null> {
    return this.repository.findByUserId(userId);
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(
    userId: string,
    email: string,
    role: string,
    accountStatus: string,
    emailVerified: boolean
  ): {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  } {
    const accessToken = AuthUtil.generateAccessToken({
      userId,
      email,
      role,
      accountStatus,
      emailVerified,
    });

    const refreshToken = AuthUtil.generateRefreshToken(userId);

    return {
      accessToken,
      refreshToken,
      expiresIn: "7d",
    };
  }

  /**
   * Toggle agent access
   * Automatically switches between grant and revoke
   */
  async toggleAccess(
    agentId: string,
    adminId: string,
    reason?: string
  ): Promise<{
    hasGrantAccess: boolean;
    previousAccess: boolean;
    message: string;
  }> {
    if (!agentId || agentId.trim() === "") {
      throw new BadRequestException("Agent ID is required.");
    }

    const agent = await this.repository.findById(agentId);

    if (!agent) {
      throw new NotFoundException("Agent not found.");
    }

    const previousAccess = agent.hasGrantAccess;
    const newAccessStatus = !previousAccess;

    const updated = await this.repository.toggleAccess(
      agentId,
      adminId,
      reason
    );

    // Get agent name from populated userId or use "Agent"
    const agentName = (agent.userId as any)?.fullName || "Agent";
    const message = newAccessStatus
      ? `Access granted to ${agentName}`
      : `Access revoked from ${agentName}`;

    logger.info(
      {
        agentId,
        adminId,
        previousAccess,
        newAccess: newAccessStatus,
        reason,
      },
      `Agent access ${newAccessStatus ? "granted" : "revoked"}`
    );

    return {
      hasGrantAccess: updated.hasGrantAccess,
      previousAccess,
      message,
    };
  }

  /**
   * Get agent access status
   */
  async getAccessStatus(agentId: string): Promise<{
    hasGrantAccess: boolean;
    lastAccessToggleAt?: Date;
    toggleHistory?: any[];
  }> {
    const agent = await this.repository.findById(agentId);
    if (!agent) {
      throw new NotFoundException("Agent not found");
    }

    const history = await this.repository.getAccessHistory(agentId);

    return {
      hasGrantAccess: agent.hasGrantAccess,
      lastAccessToggleAt: agent.lastAccessToggleAt,
      toggleHistory: history,
    };
  }

  async toggleAgentActive(
    userId: string,
    adminId: string,
    reason?: string
  ): Promise<{
    isActive: boolean;
    previousStatus: boolean;
    message: string;
  }> {
    if (!userId || userId.trim() === "") {
      throw new BadRequestException("User ID is required");
    }

    const agent = await this.repository.findByUserId(userId);

    if (!agent) {
      throw new NotFoundException("Agent not found");
    }

    const previousStatus = agent.isActive;
    const newStatus = !previousStatus;

    const updated = await this.repository.toggleActive(userId, adminId, reason);

    // ============ ADD THIS BLOCK ============
    if (newStatus) {
      await this.userService.updateAccountStatus(userId, "active");
    } else {
      await this.userService.updateAccountStatus(userId, "inactive");
    }

    const { NotificationService } = await import(
      "../notification/notification.service"
    );
    const notificationService = new NotificationService();

    try {
      const user = await this.userService.getById(userId);
      if (newStatus) {
        await notificationService.notifyAgentActivated({
          agentId: user!._id.toString(),
          agentEmail: user!.email,
          agentName: user!.fullName,
          activatedBy: adminId,
        });
      } else {
        await notificationService.notifyAgentDeactivated({
          agentId: user!._id.toString(),
          agentName: user!.fullName,
          reason,
        });
      }
    } catch (error) {
      logger.error(
        { error, userId },
        "Failed to send agent status notification"
      );
    }
    // ============ END ADD ============

    const message = newStatus
      ? `Agent activated successfully`
      : `Agent deactivated successfully`;
    return {
      isActive: updated.isActive,
      previousStatus,
      message,
    };
  }

  /**
   * Get agent activation history
   */
  async getActivationHistory(userId: string): Promise<any[]> {
    return this.repository.getActivationHistory(userId);
  }

  async generateAndUploadAgentExcel(): Promise<any> {}

  private async updateAgentConsolidatedExcel(): Promise<void> {
    const { buffer, fileName } =
      await this.excelService.generateConsolidatedAgentExcel();

    const { url } =
      await this.excelService.uploadConsolidatedAgentExcel(buffer);

    const totalAgents = await this.repository.count();

    const previousMetadata = await this.repository.getExcelMetadata();
    const version = (previousMetadata?.version || 0) + 1;

    await this.repository.updateExcelMetadata({
      type: "agent_data",
      fileName,
      fileUrl: url,
      lastUpdated: new Date(),
      totalAgents,
      version,
      generatedAt: new Date(),
    });

    logger.info({ fileName, version }, "Agent consolidated Excel updated");
  }

  async getAgentConsolidatedExcel(): Promise<any> {
    const metadata = await this.repository.getExcelMetadata();

    if (!metadata) {
      throw new NotFoundException("No consolidated Excel file found");
    }

    return metadata;
  }

  async findAgentById(agentId: string): Promise<IAgentProfile | null> {
    const agent = await this.repository.findById(agentId);

    if (!agent) {
      throw new NotFoundException("Agent not found");
    }
    return await this.repository.findByUserId(agent.userId?.toString());
  }

  private toResponse(agent: IAgentProfile): AgentProfileResponse {
    return {
      _id: agent._id?.toString() ?? "",
      userId:
        agent.userId && (agent.userId as any)._id
          ? agent.userId
          : (agent.userId?.toString() ?? ""),
      licenseNumber: agent.licenseNumber,
      brokerageName: agent.brokerageName,
      isActive: agent.isActive,
      activeAt: agent.activeAt,
      totalRentersReferred: agent.totalRentersReferred,
      activeReferrals: agent.activeReferrals,
      hasGrantAccess: agent.hasGrantAccess,
      lastAccessToggleAt: agent.lastAccessToggleAt,
      grantAccessCount: agent.grantAccessCount,
      totalMatches: agent.totalMatches,
      successfulMatches: agent.successfulMatches,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }
}
