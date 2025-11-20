// file: src/modules/agent/agent.repository.ts

import { BaseRepository } from "@/modules/base/base.repository";
import { Types } from "mongoose";
import type { IAgentProfile } from "./agent.interface";
import { AgentProfile } from "./agent.model";

/**
 * Agent Profile Repository
 */
export class AgentProfileRepository extends BaseRepository<IAgentProfile> {
  constructor() {
    super(AgentProfile);
  }

  /**
   * Find agent by user ID
   */
  async findByUserId(userId: string): Promise<IAgentProfile | null> {
    return this.model.findOne({ userId }).exec();
  }

  /**
   * Find agent by license number
   */
  async findByLicenseNumber(
    licenseNumber: string
  ): Promise<IAgentProfile | null> {
    return this.model.findOne({ licenseNumber }).exec();
  }

  /**
   * Find verified agents
   */
  async findVerifiedAgents(): Promise<IAgentProfile[]> {
    return this.model.find({ isVerified: true }).exec();
  }

  /**
   * Find approved agents (by admin)
   */
  async findApprovedAgents(): Promise<IAgentProfile[]> {
    return this.model.find({ isApprovedByAdmin: true }).exec();
  }

  /**
   * Find suspended agents
   */
  async findSuspendedAgents(): Promise<IAgentProfile[]> {
    return this.model.find({ isSuspended: true }).exec();
  }

  /**
   * Find pending approval agents
   */
  async findPendingApprovalAgents(): Promise<IAgentProfile[]> {
    return this.model
      .find({ isApprovedByAdmin: false, isSuspended: false })
      .exec();
  }

  /**
   * Mark agent as verified
   */
  async markAsVerified(userId: string): Promise<IAgentProfile | null> {
    return this.model
      .findOneAndUpdate(
        { userId },
        { isVerified: true, verifiedAt: new Date() },
        { new: true }
      )
      .exec();
  }

  /**
   * Approve agent (admin)
   */
  async approveAgent(
    userId: string,
    adminId: string,
    adminNotes?: string
  ): Promise<IAgentProfile | null> {
    return this.model
      .findOneAndUpdate(
        { userId },
        {
          isApprovedByAdmin: true,
          approvedByAdmin: adminId,
          approvedAt: new Date(),
          adminNotes,
        },
        { new: true }
      )
      .exec();
  }

  /**
   * Suspend agent (admin)
   */
  async suspendAgent(
    userId: string,
    suspensionReason: string
  ): Promise<IAgentProfile | null> {
    return this.model
      .findOneAndUpdate(
        { userId },
        {
          isSuspended: true,
          suspendedAt: new Date(),
          suspensionReason,
        },
        { new: true }
      )
      .exec();
  }

  /**
   * Unsuspend agent (admin)
   */
  async unsuspendAgent(userId: string): Promise<IAgentProfile | null> {
    return this.model
      .findOneAndUpdate(
        { userId },
        {
          isSuspended: false,
          suspendedAt: null,
          suspensionReason: null,
        },
        { new: true }
      )
      .exec();
  }

  /**
   * Increment grant access count
   */
  async incrementGrantAccessCount(
    userId: string
  ): Promise<IAgentProfile | null> {
    return this.model
      .findOneAndUpdate(
        { userId },
        { $inc: { grantAccessCount: 1 } },
        { new: true }
      )
      .exec();
  }

  /**
   * Increment total matches
   */
  async incrementTotalMatches(userId: string): Promise<IAgentProfile | null> {
    return this.model
      .findOneAndUpdate(
        { userId },
        { $inc: { totalMatches: 1 } },
        { new: true }
      )
      .exec();
  }

  /**
   * Increment successful matches
   */
  async incrementSuccessfulMatches(
    userId: string
  ): Promise<IAgentProfile | null> {
    return this.model
      .findOneAndUpdate(
        { userId },
        { $inc: { successfulMatches: 1 } },
        { new: true }
      )
      .exec();
  }

  /**
   * Update profile completeness
   */
  async updateProfileCompleteness(
    userId: string,
    completeness: number
  ): Promise<IAgentProfile | null> {
    return this.model
      .findOneAndUpdate(
        { userId },
        { profileCompleteness: Math.min(completeness, 100) },
        { new: true }
      )
      .exec();
  }

  /**
   * Count agents by status
   */
  async countByStatus(): Promise<{
    total: number;
    verified: number;
    approved: number;
    suspended: number;
    pending: number;
  }> {
    const [total, verified, approved, suspended] = await Promise.all([
      this.model.countDocuments({}),
      this.model.countDocuments({ isVerified: true }),
      this.model.countDocuments({ isApprovedByAdmin: true }),
      this.model.countDocuments({ isSuspended: true }),
    ]);

    const pending = total - approved;

    return { total, verified, approved, suspended, pending };
  }

  /**
   * Get agent statistics
   */
  async getAgentStats(userId: string): Promise<{
    grantAccessCount: number;
    totalMatches: number;
    successfulMatches: number;
    successRate: number;
  } | null> {
    const agent = await this.model.findOne({ userId }).exec();

    if (!agent) return null;

    return {
      grantAccessCount: agent.grantAccessCount,
      totalMatches: agent.totalMatches,
      successfulMatches: agent.successfulMatches,
      successRate:
        agent.totalMatches > 0
          ? Math.round((agent.successfulMatches / agent.totalMatches) * 100)
          : 0,
    };
  }

  /**
   * Update agent profile by userId
   */
  async updateByUserId(
    userId: string | Types.ObjectId,
    data: Partial<IAgentProfile>
  ): Promise<IAgentProfile | null> {
    return this.model.findOneAndUpdate({ userId }, data, { new: true }).exec();
  }
}
