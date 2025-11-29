// file: src/modules/renter/renter.repository.ts

import type { Types } from "mongoose";
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
  async findByUserId(
    userId: string | Types.ObjectId
  ): Promise<IRenterModel | null> {
    return this.model.findOne({ userId, isDeleted: false });
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
}
