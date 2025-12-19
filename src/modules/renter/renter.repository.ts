// file: src/modules/renter/renter.repository.ts

import { logger } from "@/middlewares/pino-logger";
import { PaginatedResponse, PaginationQuery } from "@/ts/pagination.types";
import { PaginationHelper } from "@/utils/pagination-helper";
import type { ObjectId, Types } from "mongoose";
import mongoose from "mongoose";
import { BaseRepository } from "../base/base.repository";
import type { IRenterModel } from "./renter.model";
import { RenterModel } from "./renter.model";
import type { UpdateRenterProfilePayload } from "./renter.type";

/**
 * Renter Repository
 * ✅ Handles all renter data access operations
 */
export class RenterRepository extends BaseRepository<IRenterModel> {
  constructor() {
    super(RenterModel);
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create new renter profile
   */
  async createRenter(data: Partial<IRenterModel>): Promise<IRenterModel> {
    const renter = new this.model(data);
    return renter.save();
  }

  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * Find renter by user ID
   */
  // async findByUserId(
  //   userId: string | Types.ObjectId
  // ): Promise<IRenterModel | null> {
  //   return this.model.findOne({ userId, isDeleted: false });
  // }

  async findByUserId(userId: string): Promise<IRenterModel | null> {
      return this.model
        .findOne({ userId })
        .populate({
          path: "userId",
          select:
            "fullName email role phoneNumber emailVerified accountStatus referralCode totalReferrals",
        })
        .exec();
    }

  /**
   * Find renter by email
   */
  async findByEmail(email: string): Promise<IRenterModel | null> {
    return this.model.findOne({ email, isDeleted: false });
  }

  /**
   * Find renter by registration type
   */
  async findByRegistrationType(
    type: "normal" | "agent_referral" | "admin_referral"
  ): Promise<IRenterModel[]> {
    return this.model.find({ registrationType: type, isDeleted: false });
  }

  /**
   * Find renters referred by specific agent
   */
  async findRentersByAgent(
    agentId: string | Types.ObjectId
  ): Promise<IRenterModel[]> {
    return this.model.find({
      referredByAgentId: new mongoose.Types.ObjectId(agentId as string),
      isDeleted: false,
    });
  }

  /**
   * Find renters referred by specific admin
   */
  async findRentersByAdmin(
    adminId: string | Types.ObjectId
  ): Promise<IRenterModel[]> {
    return this.model.find({
      referredByAdminId: new mongoose.Types.ObjectId(adminId as string),
      isDeleted: false,
    });
  }

  /**
   * Find pending renters (email not verified yet)
   */
  async findPendingRenters(): Promise<IRenterModel[]> {
    return this.model.find({ emailVerified: false, isDeleted: false });
  }

  /**
   * Find active renters
   */
  async findActiveRenters(): Promise<IRenterModel[]> {
    return this.model.find({ accountStatus: "active", isDeleted: false });
  }

  /**
   * Count renters by status
   */
  async countByStatus(): Promise<{
    total: number;
    verified: number;
    unverified: number;
    suspended: number;
    active: number;
  }> {
    const [total, verified, unverified, suspended, active] = await Promise.all([
      this.model.countDocuments({ isDeleted: false }),
      this.model.countDocuments({ emailVerified: true, isDeleted: false }),
      this.model.countDocuments({ emailVerified: false, isDeleted: false }),
      this.model.countDocuments({
        accountStatus: "suspended",
        isDeleted: false,
      }),
      this.model.countDocuments({ accountStatus: "active", isDeleted: false }),
    ]);

    return { total, verified, unverified, suspended, active };
  }

  /**
   * Count renters by registration type
   */
  async countByRegistrationType(): Promise<{
    normal: number;
    agent_referral: number;
    admin_referral: number;
  }> {
    const [normal, agent_referral, admin_referral] = await Promise.all([
      this.model.countDocuments({
        registrationType: "normal",
        isDeleted: false,
      }),
      this.model.countDocuments({
        registrationType: "agent_referral",
        isDeleted: false,
      }),
      this.model.countDocuments({
        registrationType: "admin_referral",
        isDeleted: false,
      }),
    ]);

    return { normal, agent_referral, admin_referral };
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update renter by user ID
   */
  async updateByUserId(
    userId: string | Types.ObjectId,
    data: Partial<IRenterModel>
  ): Promise<IRenterModel | null> {
    return this.model.findOneAndUpdate(
      { userId, isDeleted: false },
      { $set: data },
      { new: true }
    );
  }

  /**
   * Update renter profile
   */
  async updateProfile(
    userId: string | Types.ObjectId,
    data: UpdateRenterProfilePayload
  ): Promise<IRenterModel | null> {
    return this.model.findOneAndUpdate(
      { userId, isDeleted: false },
      { $set: data },
      { new: true }
    );
  }

  /**
   * Add questionnaire data (for admin referral renters)
   */
  async addQuestionnaire(
    userId: string | Types.ObjectId,
    questionnaire: any
  ): Promise<IRenterModel | null> {
    return this.model.findOneAndUpdate(
      { userId, isDeleted: false },
      { $set: { questionnaire } },
      { new: true }
    );
  }

  /**
   * Suspend renter
   */
  async suspendRenter(
    userId: string | Types.ObjectId
  ): Promise<IRenterModel | null> {
    return this.model.findOneAndUpdate(
      { userId, isDeleted: false },
      { $set: { accountStatus: "suspended" } },
      { new: true }
    );
  }

  /**
   * Unsuspend renter
   */
  async unsuspendRenter(
    userId: string | Types.ObjectId
  ): Promise<IRenterModel | null> {
    return this.model.findOneAndUpdate(
      { userId, isDeleted: false },
      { $set: { accountStatus: "active" } },
      { new: true }
    );
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete renter
   */
  async softDeleteRenter(
    userId: string | Types.ObjectId
  ): Promise<IRenterModel | null> {
    return this.model.findOneAndUpdate(
      { userId },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      },
      { new: true }
    );
  }

  /**
   * Restore soft-deleted renter
   */
  async restoreRenter(
    userId: string | Types.ObjectId
  ): Promise<IRenterModel | null> {
    return this.model.findOneAndUpdate(
      { userId },
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
        },
      },
      { new: true }
    );
  }

  // ============================================
  // STATISTICS OPERATIONS
  // ============================================

  /**
   * Get registration statistics
   */
  async getRegistrationStats(): Promise<any> {
    return this.model.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: "$registrationType",
          count: { $sum: 1 },
          emailVerifiedCount: {
            $sum: { $cond: ["$emailVerified", 1, 0] },
          },
          activeCount: {
            $sum: { $cond: [{ $eq: ["$accountStatus", "active"] }, 1, 0] },
          },
        },
      },
    ]);
  }

  /**
   * Get agent referral statistics
   */
  async getAgentReferralStats(agentId: string | Types.ObjectId): Promise<any> {
    return this.model.aggregate([
      {
        $match: {
          referredByAgentId: new mongoose.Types.ObjectId(agentId as string),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalReferrals: { $sum: 1 },
          emailVerified: { $sum: { $cond: ["$emailVerified", 1, 0] } },
          active: {
            $sum: { $cond: [{ $eq: ["$accountStatus", "active"] }, 1, 0] },
          },
          suspended: {
            $sum: { $cond: [{ $eq: ["$accountStatus", "suspended"] }, 1, 0] },
          },
        },
      },
    ]);
  }

  /**
   * Get admin referral statistics
   */
  async getAdminReferralStats(adminId: string | Types.ObjectId): Promise<any> {
    return this.model.aggregate([
      {
        $match: {
          referredByAdminId: new mongoose.Types.ObjectId(adminId as string),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalReferrals: { $sum: 1 },
          emailVerified: { $sum: { $cond: ["$emailVerified", 1, 0] } },
          active: {
            $sum: { $cond: [{ $eq: ["$accountStatus", "active"] }, 1, 0] },
          },
          suspended: {
            $sum: { $cond: [{ $eq: ["$accountStatus", "suspended"] }, 1, 0] },
          },
          lookingToPurchase: {
            $sum: { $cond: ["$questionnaire.lookingToPurchase", 1, 0] },
          },
          needsBuyerSpecialist: {
            $sum: { $cond: ["$questionnaire.buyerSpecialistNeeded", 1, 0] },
          },
          needsRenterSpecialist: {
            $sum: { $cond: ["$questionnaire.renterSpecialistNeeded", 1, 0] },
          },
        },
      },
    ]);
  }

  async findAll(): Promise<any[]> {
    try {
      const result = await this.model.aggregate([
        { $match: { isDeleted: false } },

        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userData",
          },
        },
        {
          $addFields: {
            userInfo: {
              $arrayElemAt: ["$userData", 0],
            },
          },
        },
        {
          $project: {
            userData: 0,
          },
        },
        { $sort: { createdAt: -1 } },
      ]);

      return result;
    } catch (error) {
      logger.error({ error }, "Error in Renter findAll aggregation");
      throw error;
    }
  }

  async count(): Promise<number> {
    return await this.model.countDocuments({ isDeleted: false });
  }

  async updateExcelMetadata(metadata: any): Promise<void> {
    const db = this.model.db;
    await db
      .collection("excel_metadata")
      .updateOne(
        { type: "renters" },
        { $set: { ...metadata, updatedAt: new Date() } },
        { upsert: true }
      );
  }

  /**
   * ✅ Get Excel metadata
   */
  async getExcelMetadata(): Promise<any> {
    const db = this.model.db;
    return await db.collection("excel_metadata").findOne({ type: "renters" });
  }

  /**
   * Find renter by ID with populated referrer details.
   * Populates:
   * - referredByAgentId (if agent_referral)
   * - referredByAdminId (if admin_referral)
   */

  async findRenterWithReferrer(userId: string | ObjectId): Promise<any> {
    return this.model
      .findOne({ userId })
      .populate({
        path: "referredByAgentId",
        select: "fullName email phoneNumber referralCode _id",
        options: { lean: true },
      })
      .populate({
        path: "referredByAdminId",
        select: "fullName email phoneNumber referralCode _id",
        options: { lean: true },
      })
      .lean()
      .exec();
  }

  async findAllWithListingCount(
    query: PaginationQuery,
    accountStatus?: string
  ): Promise<PaginatedResponse<any>> {
    const paginateOptions = PaginationHelper.parsePaginationParams(query);
    const page = paginateOptions.page || 1;
    const limit = paginateOptions.limit || 10;
    const skip = (page - 1) * limit;

    const matchFilter: any = { isDeleted: false };
    if (accountStatus) {
      matchFilter.accountStatus = accountStatus;
    }

    const pipeline = [
      { $match: matchFilter },
      {
        $lookup: {
          from: "premarketrequests",
          let: { userId: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$renterId", "$$userId"] },
                isDeleted: false,
              },
            },
          ],
          as: "preMarketListings",
        },
      },
      {
        $addFields: {
          totalListings: { $size: "$preMarketListings" },
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          email: 1,
          fullName: 1,
          phoneNumber: 1,
          accountStatus: 1,
          totalListings: 1,
          createdAt: 1,
        },
      },
      { $sort: { createdAt: -1 as const } },
      { $skip: skip },
      { $limit: limit },
    ];

    const data = await this.model.aggregate(pipeline);

    const countPipeline = [{ $match: matchFilter }, { $count: "total" }];
    const countResult = await this.model.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    return PaginationHelper.buildResponse(data, total, page, limit);
  }

  /**
   * Get renter with full details including referral info
   * @param renterId - Renter ID
   */
  async findByIdWithReferralInfo(
    renterId: string
  ): Promise<IRenterModel | null> {
    return this.model
      .findById(renterId)
      .populate("userId")
      .lean() as Promise<IRenterModel | null>;
    // .select(
    //   "_id email fullName phoneNumber accountStatus occupations moveInDate " +
    //     "petFriendly emailVerified registrationType referredByAgentId referredByAdminId createdAt"
    // )
  }

  /**
   * Get referrer information (agent or admin who referred this renter)
   * @param renterId - Renter ID
   */
  async getReferrerInfo(renterId: string): Promise<{
    referredByAgentId?: string;
    referredByAdminId?: string;
    registrationType?: string;
  } | null> {
    return this.model
      .findById(renterId)
      .select("referredByAgentId referredByAdminId registrationType")
      .lean() as Promise<any>;
  }


   
}
