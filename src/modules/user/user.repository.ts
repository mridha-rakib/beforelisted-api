// file: src/modules/user/user.repository.ts

import { logger } from "@/middlewares/pino-logger";
import { BaseRepository } from "@/modules/base/base.repository";
import type { IUser } from "./user.interface";
import { RefreshTokenBlacklist, User } from "./user.model";

/**
 * User Repository - Extended with referral operations
 */
export class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(User);
  }

  /**
   * Find user by email (excludes soft-deleted)
   */
  async findByEmail(email: string): Promise<IUser | null> {
    return this.model
      .findOne({ email: email.toLowerCase(), isDeleted: false })
      .exec();
  }

  /**
   * Find user by email with password
   */
  async findByEmailWithPassword(email: string): Promise<IUser | null> {
    return this.model
      .findOne({ email: email.toLowerCase(), isDeleted: false })
      .select("+password")
      .exec();
  }

  /**
   * Find user by verification token
   */
  async findByVerificationToken(token: string): Promise<IUser | null> {
    return this.model
      .findOne({
        emailVerificationToken: token,
        isDeleted: false,
      })
      .select("+emailVerificationToken +emailVerificationExpiresAt")
      .exec();
  }

  // ============================================
  // REFERRAL-SPECIFIC METHODS
  // ============================================

  /**
   * Find user by referral code
   */
  async findByReferralCode(referralCode: string): Promise<IUser | null> {
    return this.model
      .findOne({
        referralCode,
        isDeleted: false,
        role: { $in: ["admin", "agent"] }, // Only admin/agent have codes
      })
      .exec();
  }

  /**
   * Generate unique referral code
   */
  async generateUniqueReferralCode(prefix: string): Promise<string> {
    const crypto = require("crypto");
    let isUnique = false;
    let referralCode = "";

    while (!isUnique) {
      const randomPart = crypto
        .randomBytes(6)
        .toString("base64")
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 10)
        .toUpperCase();

      referralCode = `${prefix}-${randomPart}`;

      const existing = await this.model.findOne({ referralCode }).exec();
      if (!existing) {
        isUnique = true;
      }
    }

    return referralCode;
  }

  /**
   * Increment referral count for admin/agent
   */
  async incrementReferralCount(userId: string): Promise<IUser | null> {
    return this.model
      .findByIdAndUpdate(
        userId,
        {
          $inc: { totalReferrals: 1 },
          $set: {
            firstReferralUsedAt: new Date(),
          },
        },
        { new: true }
      )
      .exec();
  }

  /**
   * Update referral count (set specific value)
   */
  async updateReferralCount(
    userId: string,
    count: number
  ): Promise<IUser | null> {
    return this.model
      .findByIdAndUpdate(userId, { totalReferrals: count }, { new: true })
      .exec();
  }

  /**
   * Get users referred by a specific user
   */
  async getReferredUsers(referrerId: string): Promise<IUser[]> {
    return this.model
      .find({
        referredBy: referrerId,
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Count referred users
   */
  async countReferredUsers(referrerId: string): Promise<number> {
    return this.model
      .countDocuments({
        referredBy: referrerId,
        isDeleted: false,
      })
      .exec();
  }

  // ============================================
  // EXISTING METHODS (keeping your implementations)
  // ============================================

  async findByRole(role: string): Promise<IUser[]> {
    return this.model.find({ role, isDeleted: false }).exec();
  }

  async findByAccountStatus(status: string): Promise<IUser[]> {
    return this.model.find({ accountStatus: status, isDeleted: false }).exec();
  }

  async searchUsers(searchTerm: string): Promise<IUser[]> {
    const regex = new RegExp(searchTerm, "i");
    return this.model
      .find({
        $or: [{ email: regex }, { fullName: regex }],
        isDeleted: false,
      })
      .exec();
  }

  async markEmailAsVerified(userId: string): Promise<IUser | null> {
    return this.model
      .findByIdAndUpdate(
        userId,
        {
          emailVerified: true,
          emailVerificationToken: undefined,
          emailVerificationExpiresAt: undefined,
          accountStatus: "active",
        },
        { new: true }
      )
      .exec();
  }

  async updateVerificationToken(
    userId: string,
    data: {
      emailVerificationToken?: string;
      emailVerificationExpiresAt?: Date;
    }
  ): Promise<IUser | null> {
    return this.model.findByIdAndUpdate(userId, data, { new: true }).exec();
  }

  async updatePassword(
    userId: string,
    hashedPassword: string
  ): Promise<IUser | null> {
    return this.model
      .findByIdAndUpdate(
        userId,
        {
          password: hashedPassword,
          passwordChangedAt: new Date(),
          mustChangePassword: false,
          passwordAutoGenerated: false,
        },
        { new: true }
      )
      .exec();
  }

  async updateLastLogin(userId: string): Promise<IUser | null> {
    return this.model
      .findByIdAndUpdate(userId, { lastLoginAt: new Date() }, { new: true })
      .exec();
  }

  async softDeleteUser(
    userId: string,
    deletedBy: string
  ): Promise<IUser | null> {
    return this.model
      .findByIdAndUpdate(
        userId,
        {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy,
          accountStatus: "inactive",
        },
        { new: true }
      )
      .exec();
  }

  async restoreUser(userId: string): Promise<IUser | null> {
    return this.model
      .findByIdAndUpdate(
        userId,
        {
          isDeleted: false,
          deletedAt: undefined,
          deletedBy: undefined,
          accountStatus: "active",
        },
        { new: true }
      )
      .exec();
  }

  async findDeletedUsers(): Promise<IUser[]> {
    return this.model.find({ isDeleted: true }).exec();
  }

  async permanentlyDeleteUser(userId: string): Promise<any> {
    return this.model.deleteOne({ _id: userId }).exec();
  }

  async countByRole(role: string): Promise<number> {
    return this.model.countDocuments({ role, isDeleted: false }).exec();
  }

  async countActiveUsers(): Promise<number> {
    return this.model
      .countDocuments({ accountStatus: "active", isDeleted: false })
      .exec();
  }

  /**
   * Find user by ID with password
   * Used for password change operations
   */
  async findByIdWithPassword(userId: string): Promise<IUser | null> {
    return this.model.findById(userId).select("+password").exec();
  }

  /**
   * Delete all refresh tokens for a user
   * Used when user logs out or changes password
   *
   * @param userId - User ID
   * @returns Number of tokens deleted
   */
  async deleteAllRefreshTokens(userId: string): Promise<number> {
    try {
      const result = await RefreshTokenBlacklist.deleteMany({
        userId: userId,
      });

      return result.deletedCount || 0;
    } catch (error) {
      logger.error({ userId, error }, "Error deleting refresh tokens");
      throw error;
    }
  }
}
