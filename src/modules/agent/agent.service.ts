// file: src/modules/agent/agent.service.ts

import { ROLES } from "@/constants/app.constants";
import { logger } from "@/middlewares/pino-logger";

import { ConflictException, NotFoundException } from "@/utils/app-error.utils";
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
  AdminSuspendAgentPayload,
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
  // private emailService: EmailService;
  // private otpService: OTPService;

  constructor() {
    this.repository = new AgentProfileRepository();
    this.userService = new UserService();
    this.referralService = new ReferralService();
    this.emailVerificationService = new EmailVerificationService();
  }

  // ============================================
  // AGENT REGISTRATION (Complete Flow)
  // ============================================

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

    // 3. Validate license expiry date
    if (new Date(payload.licenseExpiryDate) <= new Date()) {
      throw new ConflictException("License has already expired");
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

    // ✅ Create initial OTP for email verification
    const otpResult = await this.emailVerificationService.createOTP({
      userId: user._id.toString(),
      email: user.email,
      userType: "agent", // ✅ Generic: specify user type
      userName: user.fullName,
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
      brokerageAddress: payload.brokerageAddress,
      licenseExpiryDate: payload.licenseExpiryDate,
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
        brokerageAddress: payload.brokerageAddress,
        licenseExpiryDate: payload.licenseExpiryDate,
      }),
    } as Partial<IAgentProfile>);

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

  // ============================================
  // AGENT PROFILE OPERATIONS
  // ============================================

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

    if (new Date(payload.licenseExpiryDate) <= new Date()) {
      throw new ConflictException("License has already expired");
    }

    const profile = await this.repository.create({
      userId,
      licenseNumber: payload.licenseNumber,
      brokerageName: payload.brokerageName,
      brokerageAddress: payload.brokerageAddress,
      licenseExpiryDate: payload.licenseExpiryDate,
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
      brokerageAddress: updated.brokerageAddress,
      licenseExpiryDate: updated.licenseExpiryDate,
    });

    await this.repository.updateProfileCompleteness(userId, completeness);

    logger.info({ userId }, "Agent profile updated");
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

  // ============================================
  // ADMIN OPERATIONS
  // ============================================

  /**
   * ADMIN: Get all agents (✅ FIXED - Properly typed)
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

  async adminVerifyAgent(userId: string): Promise<AgentProfileResponse> {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException("Agent profile not found");
    }

    if (profile.isVerified) {
      throw new ConflictException("Agent license is already verified");
    }

    const updated = await this.repository.markAsVerified(userId);
    if (!updated) {
      throw new NotFoundException("Agent profile not found");
    }

    logger.info({ userId }, "Agent license verified by admin");
    return this.toResponse(updated);
  }

  async adminSuspendAgent(
    userId: string,
    payload: AdminSuspendAgentPayload
  ): Promise<AgentProfileResponse> {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException("Agent profile not found");
    }

    if (profile.isSuspended) {
      throw new ConflictException("Agent is already suspended");
    }

    const updated = await this.repository.suspendAgent(
      userId,
      payload.suspensionReason
    );
    if (!updated) {
      throw new NotFoundException("Agent profile not found");
    }

    logger.info({ userId }, "Agent suspended");
    return this.toResponse(updated);
  }

  async adminUnsuspendAgent(userId: string): Promise<AgentProfileResponse> {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException("Agent profile not found");
    }

    if (!profile.isSuspended) {
      throw new ConflictException("Agent is not suspended");
    }

    const updated = await this.repository.unsuspendAgent(userId);
    if (!updated) {
      throw new NotFoundException("Agent profile not found");
    }

    logger.info({ userId }, "Agent unsuspended");
    return this.toResponse(updated);
  }

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
    let totalFields = 4;

    if (payload.licenseNumber) completeness += 25;
    if (payload.brokerageName) completeness += 25;
    if (payload.brokerageAddress) completeness += 25;
    else totalFields = 3;

    if (payload.licenseExpiryDate) completeness += 25;

    return (completeness / (totalFields * 25)) * 100;
  }

  /**
   * Convert to response (exclude sensitive fields)
   */
  private toResponse(profile: IAgentProfile): AgentProfileResponse {
    return {
      _id: profile._id.toString(),
      userId: profile.userId.toString(),
      licenseNumber: profile.licenseNumber,
      brokerageName: profile.brokerageName,
      brokerageAddress: profile.brokerageAddress,
      licenseExpiryDate: profile.licenseExpiryDate,
      isVerified: profile.isVerified,
      isSuspended: profile.isSuspended,
      grantAccessCount: profile.grantAccessCount,
      totalMatches: profile.totalMatches,
      successfulMatches: profile.successfulMatches,
      avgResponseTime: profile.avgResponseTime,
      isApprovedByAdmin: profile.isApprovedByAdmin,
      profileCompleteness: profile.profileCompleteness,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
