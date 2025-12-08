// file: src/modules/agent/agent.service.ts

import { ROLES } from "@/constants/app.constants";
import { logger } from "@/middlewares/pino-logger";

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
  AdminApproveAgentPayload,
  AgentProfileResponse,
  AgentRegisterPayload,
  AgentRegistrationResponse,
  CreateAgentProfilePayload,
  UpdateAgentProfilePayload,
} from "./agent.type";

/**
 * Agent Service
 * Handles ALL agent-related business logic including registration
 * All methods properly typed
 */
export class AgentService {
  private repository: AgentProfileRepository;
  private userService: UserService;
  private referralService: ReferralService;
  private emailVerificationService: EmailVerificationService;

  constructor() {
    this.repository = new AgentProfileRepository();
    this.userService = new UserService();
    this.referralService = new ReferralService();
    this.emailVerificationService = new EmailVerificationService();
  }

  // AGENT REGISTRATION (Complete Flow)
  /**
   * Complete agent registration
   */
  async registerAgent(
    payload: AgentRegisterPayload
  ): Promise<AgentRegistrationResponse> {
    // 1. Check if email already exists
    const existingUser = await this.userService.getUserByEmail(payload.email);
    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    // 2. Check if license number already exists
    const existingAgent = await this.repository.findByLicenseNumber(
      payload.licenseNumber
    );
    if (existingAgent) {
      throw new ConflictException("License number already registered");
    }

    // 4. Hash password
    const hashedPassword = await hashPassword(payload.password);

    // 5. Create user account
    const user = await this.userService.create({
      email: payload.email,
      password: hashedPassword,
      fullName: payload.fullName,
      phoneNumber: payload.phoneNumber,
      role: ROLES.AGENT,
      emailVerified: false,
      accountStatus: "pending",
    });

    // 6. Generate referral code for agent
    const referralCode = await this.referralService.generateReferralCode(
      user._id.toString(),
      ROLES.AGENT
    );

    // 7. Create agent profile
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
      profileCompleteness: this.calculateProfileCompleteness({
        licenseNumber: payload.licenseNumber,
        brokerageName: payload.brokerageName,
      }),
    } as Partial<IAgentProfile>);

    await this.emailVerificationService.createOTP({
      userId: user._id.toString(),
      email: payload.email,
      userType: ROLES.AGENT,
      userName: payload.fullName,
    });

    // 10. Generate JWT tokens
    const tokens = this.generateTokens(
      user._id.toString(),
      user.email,
      user.role
    );

    logger.info({ userId: user._id }, "Agent registered successfully");

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

  // AGENT PROFILE OPERATIONS
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
      profileCompleteness: this.calculateProfileCompleteness(payload),
    } as Partial<IAgentProfile>);

    logger.info({ userId }, "Agent profile created");
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

  /**
   * Update agent profile
   */
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

    const completeness = this.calculateProfileCompleteness({
      licenseNumber: updated.licenseNumber,
      brokerageName: updated.brokerageName,
    });

    await this.repository.updateProfileCompleteness(userId, completeness);

    return this.toResponse(updated);
  }

  /**
   * Get agent statistics
   */
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

  /**
   *  Get agent referral statistics and link
   * Retrieves referral code, link, total count, and referred users
   */
  async getReferralStats(userId: string): Promise<{
    referralCode: string | null;
    referralLink: string | null;
    totalReferrals: number;
    referredUsers: any[];
  }> {
    return this.referralService.getReferralStats(userId);
  }

  // ADMIN OPERATIONS

  /**
   * ADMIN: Get all agents (Properly typed)
   */
  async adminGetAllAgents(): Promise<AgentProfileResponse[]> {
    const agents: IAgentProfile[] = await this.repository.find({});
    return agents.map((agent: IAgentProfile) => this.toResponse(agent));
  }

  async adminGetAgent(userId: string): Promise<AgentProfileResponse> {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException("Agent profile not found");
    }

    return this.toResponse(profile);
  }

  async adminApproveAgent(
    userId: string,
    adminId: string,
    payload: AdminApproveAgentPayload
  ): Promise<AgentProfileResponse> {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException("Agent profile not found");
    }

    if (profile.isApprovedByAdmin) {
      throw new ConflictException("Agent is already approved");
    }

    const updated = await this.repository.approveAgent(
      userId,
      adminId,
      payload.adminNotes
    );

    if (!updated) {
      throw new NotFoundException("Agent profile not found");
    }

    logger.info({ userId, adminId }, "Agent approved by admin");
    return this.toResponse(updated);
  }

  // async adminSuspendAgent(
  //   userId: string,
  //   payload: AdminSuspendAgentPayload
  // ): Promise<AgentProfileResponse> {
  //   const profile = await this.repository.findByUserId(userId);
  //   if (!profile) {
  //     throw new NotFoundException("Agent profile not found");
  //   }

  //   if (profile.isSuspended) {
  //     throw new ConflictException("Agent is already suspended");
  //   }

  //   const updated = await this.repository.suspendAgent(
  //     userId,
  //     payload.suspensionReason
  //   );
  //   if (!updated) {
  //     throw new NotFoundException("Agent profile not found");
  //   }

  //   logger.info({ userId }, "Agent suspended");
  //   return this.toResponse(updated);
  // }

  // async adminUnsuspendAgent(userId: string): Promise<AgentProfileResponse> {
  //   const profile = await this.repository.findByUserId(userId);
  //   if (!profile) {
  //     throw new NotFoundException("Agent profile not found");
  //   }

  //   if (!profile.isSuspended) {
  //     throw new ConflictException("Agent is not suspended");
  //   }

  //   const updated = await this.repository.unsuspendAgent(userId);
  //   if (!updated) {
  //     throw new NotFoundException("Agent profile not found");
  //   }

  //   logger.info({ userId }, "Agent unsuspended");
  //   return this.toResponse(updated);
  // }

  async adminGetPendingApprovalAgents(): Promise<AgentProfileResponse[]> {
    const agents: IAgentProfile[] =
      await this.repository.findPendingApprovalAgents();
    return agents.map((agent: IAgentProfile) => this.toResponse(agent));
  }

  async adminGetSuspendedAgents(): Promise<AgentProfileResponse[]> {
    const agents: IAgentProfile[] = await this.repository.findSuspendedAgents();
    return agents.map((agent: IAgentProfile) => this.toResponse(agent));
  }

  /**
   * ADMIN: Get agent metrics (✅ FIXED - Strongly typed reduce callbacks)
   */
  async adminGetAgentMetrics(): Promise<AdminAgentMetricsResponse> {
    const statuses = await this.repository.countByStatus();

    const allAgents: IAgentProfile[] = await this.repository.find({});

    // ✅ FIXED: Explicitly type reduce parameters
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

    // ✅ FIXED: Explicitly type reduce parameters
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

  // async adminGetAllAgentMetrics(): Promise<AdminAgentMetricsResponse> {
  //   const metrics = await this.repository.getAdminMetrics();
  //   return metrics;
  // }
  // ============================================
  // INTERNAL HELPER METHODS
  // ============================================

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
    role: string
  ): {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  } {
    const accessToken = AuthUtil.generateAccessToken({
      userId,
      email,
      role,
    });

    const refreshToken = AuthUtil.generateRefreshToken(userId);

    return {
      accessToken,
      refreshToken,
      expiresIn: "7d",
    };
  }

  /**
   * Calculate profile completeness percentage
   */
  private calculateProfileCompleteness(
    payload: CreateAgentProfilePayload
  ): number {
    let completeness = 0;
    let totalFields = 2;

    if (payload.licenseNumber) completeness += 50;
    if (payload.brokerageName) completeness += 50;

    return (completeness / (totalFields * 50)) * 100;
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
    hasAccess: boolean;
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

    const previousAccess = agent.hasAccess;
    const newAccessStatus = !previousAccess;

    const updated = await this.repository.toggleAccess(
      agentId,
      adminId,
      reason
    );

    const message = newAccessStatus
      ? `Access granted to ${agent.fullName}`
      : `Access revoked from ${agent.fullName}`;

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
      hasAccess: updated.hasAccess,
      previousAccess,
      message,
    };
  }

  /**
   * Get agent access status
   */
  async getAccessStatus(agentId: string): Promise<{
    hasAccess: boolean;
    lastAccessToggleAt?: Date;
    toggleHistory?: any[];
  }> {
    const agent = await this.repository.findById(agentId);
    if (!agent) {
      throw new NotFoundException("Agent not found");
    }

    const history = await this.repository.getAccessHistory(agentId);

    return {
      hasAccess: agent.hasAccess,
      lastAccessToggleAt: agent.lastAccessToggleAt,
      toggleHistory: history,
    };
  }

  /**
   * Toggle agent active/deactive status
   * Automatically switches between active and inactive
   */
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

  /**
   * Convert to response (exclude sensitive fields)
   */
  private toResponse(agent: IAgentProfile): AgentProfileResponse {
    return {
      _id: agent._id.toString(),
      userId:
        agent.userId && (agent.userId as any)._id
          ? agent.userId
          : agent.userId.toString(),
      licenseNumber: agent.licenseNumber,
      brokerageName: agent.brokerageName,
      isActive: agent.isActive,
      activeAt: agent.activeAt,
      isApprovedByAdmin: agent.isApprovedByAdmin,
      approvedByAdmin: agent.approvedByAdmin?.toString(),
      approvedAt: agent.approvedAt,
      adminNotes: agent.adminNotes,
      totalRentersReferred: agent.totalRentersReferred,
      activeReferrals: agent.activeReferrals,
      referralConversionRate: agent.referralConversionRate,
      hasAccess: agent.hasAccess,
      lastAccessToggleAt: agent.lastAccessToggleAt,
      grantAccessCount: agent.grantAccessCount,
      totalMatches: agent.totalMatches,
      successfulMatches: agent.successfulMatches,
      avgResponseTime: agent.avgResponseTime,
      profileCompleteness: agent.profileCompleteness,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }
}
