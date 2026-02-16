// file: src/modules/agent/agent.repository.ts

import { BaseRepository } from "@/modules/base/base.repository";
import { NotFoundException } from "@/utils/app-error.utils";
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
  async findByUserId(
    userId: string | Types.ObjectId
  ): Promise<IAgentProfile | null> {
    return this.model
      .findOne({ userId })
      .populate({
        path: "userId",
        select:
          "fullName email role phoneNumber emailVerified profileImageUrl accountStatus referralCode totalReferrals",
      })
      .exec();
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
   * Count agents by status
   */
  async countByStatus(): Promise<{
    total: number;
    verified: number;
    free: number;
    pending: number;
  }> {
    const [total, verified, free] = await Promise.all([
      this.model.countDocuments({}),
      this.model.countDocuments({ isVerified: true }),
      this.model.countDocuments({ isApprovedByAdmin: true }),
    ]);

    const pending = total - free;

    return { total, verified, free, pending };
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
    return this.model
      .findOneAndUpdate({ userId }, { $set: data }, { new: true })
      .exec();
  }

  /**
   * Update agent profile by userId
   */
  async updateProfile(
    userId: string | Types.ObjectId,
    data: Partial<IAgentProfile>
  ): Promise<IAgentProfile | null> {
    return this.model.findOneAndUpdate(
      { userId },
      { $set: data },
      { new: true }
    );
  }

  /**
   * Toggle agent access (grant/revoke)
   */

  async toggleAccess(
    agentId: string,
    adminId: string,
    reason?: string
  ): Promise<any> {
    const agent = await this.model.findById(agentId);

    if (!agent) {
      throw new NotFoundException("Agent not found.");
    }

    const newAccessStatus = !agent.hasGrantAccess;

    const action = newAccessStatus ? "granted" : "revoked";

    const updated = await this.model
      .findByIdAndUpdate(
        agentId,
        {
          hasGrantAccess: newAccessStatus,
          lastAccessToggleAt: new Date(),
          $push: {
            accessToggleHistory: {
              action,
              toggledBy: adminId,
              toggledAt: new Date(),
              reason,
            },
          },
        },
        { new: true }
      )
      .populate("hasGrantAccess.toggledBy", "email fullName");

    return updated;
  }

  /**
   * Get access history for an agent
   */
  async getAccessHistory(agentId: string): Promise<any> {
    const agent = await this.model
      .findById(agentId)
      .populate("hasGrantAccess.toggledBy", "email fullName")
      .lean();

    return agent?.hasGrantAccess || [];
  }

  /**
   * Find all agents with access
   */
  async findWithAccess(): Promise<any[]> {
    return this.model
      .find({ hasGrantAccess: true })
      .select("_id email fullName hasGrantAccess lastAccessToggleAt")
      .lean();
  }

  async toggleActive(
    userId: string,
    adminId: string,
    reason?: string
  ): Promise<IAgentProfile> {
    const agent = await this.model.findOne({ userId });

    if (!agent) {
      throw new NotFoundException("Agent not found");
    }

    const newStatus = !agent.isActive;
    const action = newStatus ? "activated" : "deactivated";

    return this.model
      .findOneAndUpdate(
        { userId },
        {
          isActive: newStatus,
          activeAt: newStatus ? new Date() : null,
          lastActivationChange: new Date(),
          $push: {
            activationHistory: {
              action,
              changedBy: adminId,
              changedAt: new Date(),
              reason,
            },
          },
        },
        { new: true }
      )
      .populate("activationHistory.changedBy", "email fullName")
      .exec() as any;
  }

  async activateWithLink(
    userId: string,
    adminId: string,
    activationLink: string,
    reason?: string
  ): Promise<IAgentProfile> {
    const agent = await this.model.findOne({ userId }).exec();

    if (!agent) {
      throw new NotFoundException("Agent not found");
    }

    const now = new Date();
    const updateQuery: Record<string, any> = {
      $set: {
        isActive: true,
        activeAt: agent.isActive && agent.activeAt ? agent.activeAt : now,
        lastActivationChange: now,
        activationLink,
      },
    };

    if (!agent.isActive) {
      updateQuery.$push = {
        activationHistory: {
          action: "activated",
          changedBy: adminId,
          changedAt: now,
          reason,
        },
      };
    }

    return this.model
      .findOneAndUpdate({ userId }, updateQuery, { new: true })
      .populate("activationHistory.changedBy", "email fullName")
      .exec() as any;
  }

  async getActivationHistory(userId: string): Promise<any[]> {
    const agent = await this.model
      .findOne({ userId })
      .populate("activationHistory.changedBy", "email fullName")
      .lean();

    return agent?.activationHistory || [];
  }

  async findAll(): Promise<IAgentProfile[]> {
    return this.model
      .aggregate([
        // Match all agent profiles (no isDeleted field in AgentProfile model)
        { $match: {} },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        {
          $addFields: {
            userId: { $arrayElemAt: ["$userInfo", 0] },
          },
        },
        { $project: { userInfo: 0 } },
        { $sort: { createdAt: -1 } },
      ])
      .exec() as Promise<IAgentProfile[]>;
  }

  /**
   * Find all agents with pagination
   */
  async findAllPaginated(options: {
    page: number;
    limit: number;
    sort?: Record<string, 1 | -1>;
    search?: string;
    isActive?: boolean;
    hasGrantAccess?: boolean;
  }): Promise<{
    data: IAgentProfile[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    const {
      page = 1,
      limit = 10,
      sort = { createdAt: -1 },
      search,
      isActive,
      hasGrantAccess,
    } = options;
    const skip = (page - 1) * limit;

    // Build match filter
    const matchFilter: Record<string, any> = {};

    if (isActive !== undefined) {
      matchFilter.isActive = isActive;
    }

    if (hasGrantAccess !== undefined) {
      matchFilter.hasGrantAccess = hasGrantAccess;
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
      { $match: matchFilter },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $addFields: {
          userId: { $arrayElemAt: ["$userInfo", 0] },
        },
      },
      { $project: { userInfo: 0 } },
    ];

    // Add search filter if provided (search by user fullName or email)
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "userId.fullName": { $regex: search, $options: "i" } },
            { "userId.email": { $regex: search, $options: "i" } },
            { licenseNumber: { $regex: search, $options: "i" } },
            { brokerageName: { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // Get total count
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await this.model.aggregate(countPipeline).exec();
    const total = countResult[0]?.total || 0;

    // Add sort, skip, limit
    pipeline.push({ $sort: sort });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const data = await this.model.aggregate(pipeline).exec();

    return {
      data: data as IAgentProfile[],
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async countAgents(): Promise<any> {
    return this.model.countDocuments({});
  }

  async count(): Promise<number> {
    return await this.model.countDocuments({});
  }

  async updateExcelMetadata(metadata: any): Promise<any> {
    const db = this.model.db;

    await db.collection("excel_metadata").updateOne(
      {
        type: "agent_data",
      },
      { $set: { ...metadata, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  async getExcelMetadata(): Promise<any> {
    const db = this.model.db;
    return await db
      .collection("excel_metadata")
      .findOne({ type: "agent_data" });
  }

  /**
   * Find all agents with grant access
   */
  async findAllGrantAccessAgent(filter: {
    hasGrantAccess: boolean;
  }): Promise<IAgentProfile[]> {
    return this.model
      .find({ hasGrantAccess: filter.hasGrantAccess })
      .populate({
        path: "userId",
        select: "fullName email phoneNumber referralCode",
      })
      .lean()
      .exec() as any;
  }

  async findActiveAgents(): Promise<any[]> {
    return this.model
      .aggregate([
        {
          $match: {
            isActive: true,
            emailSubscriptionEnabled: { $ne: false },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        { $unwind: "$userInfo" },
        { $match: { "userInfo.isDeleted": { $ne: true } } },
        {
          $project: {
            _id: 1,
            hasGrantAccess: 1,
            lastAccessToggleAt: 1,
            fullName: "$userInfo.fullName",
            email: "$userInfo.email",
          },
        },
      ])
      .exec();
  }

  async findActiveAgentsAcceptingRequests(): Promise<any[]> {
    return this.model
      .aggregate([
        {
          $match: {
            isActive: true,
            emailSubscriptionEnabled: { $ne: false },
            acceptingRequests: { $ne: false },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        { $unwind: "$userInfo" },
        { $match: { "userInfo.isDeleted": { $ne: true } } },
        {
          $project: {
            _id: 1,
            hasGrantAccess: 1,
            lastAccessToggleAt: 1,
            fullName: "$userInfo.fullName",
            email: "$userInfo.email",
          },
        },
      ])
      .exec();
  }
}
