// file: src/modules/user/user.repository.ts

import { BaseRepository } from "@/modules/base/base.repository";
import type { IUser } from "./user.interface";
import { User } from "./user.model";

/**
 * User Repository - extends BaseRepository
 * Handles all user database operations
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

  /**
   * Find users by role (excludes soft-deleted)
   */
  async findByRole(role: string): Promise<IUser[]> {
    return this.model.find({ role, isDeleted: false }).exec();
  }

  /**
   * Find users by account status
   */
  async findByAccountStatus(status: string): Promise<IUser[]> {
    return this.model.find({ accountStatus: status, isDeleted: false }).exec();
  }

  /**
   * Search users by email or fullName (excludes soft-deleted)
   */
  async searchUsers(searchTerm: string): Promise<IUser[]> {
    const regex = new RegExp(searchTerm, "i");
    return this.model
      .find({
        $or: [{ email: regex }, { fullName: regex }],
        isDeleted: false,
      })
      .exec();
  }

  /**
   * Mark email as verified
   */
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

  /**
   * Update verification token
   */
  async updateVerificationToken(
    userId: string,
    data: {
      emailVerificationToken?: string;
      emailVerificationExpiresAt?: Date;
    }
  ): Promise<IUser | null> {
    return this.model.findByIdAndUpdate(userId, data, { new: true }).exec();
  }

  /**
   * Update password
   */
  async updatePassword(
    userId: string,
    hashedPassword: string
  ): Promise<IUser | null> {
    return this.model
      .findByIdAndUpdate(userId, { password: hashedPassword }, { new: true })
      .exec();
  }

  /**
   * Update last login
   */
  async updateLastLogin(userId: string): Promise<IUser | null> {
    return this.model
      .findByIdAndUpdate(userId, { lastLoginAt: new Date() }, { new: true })
      .exec();
  }

  /**
   * Soft delete user
   */
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

  /**
   * Restore soft-deleted user
   */
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

  /**
   * Find soft-deleted users
   */
  async findDeletedUsers(): Promise<IUser[]> {
    return this.model.find({ isDeleted: true }).exec();
  }

  /**
   * Permanently delete user (hard delete)
   */
  async permanentlyDeleteUser(userId: string): Promise<any> {
    return this.model.deleteOne({ _id: userId }).exec();
  }

  /**
   * Count users by role
   */
  async countByRole(role: string): Promise<number> {
    return this.model.countDocuments({ role, isDeleted: false }).exec();
  }

  /**
   * Count active users
   */
  async countActiveUsers(): Promise<number> {
    return this.model
      .countDocuments({ accountStatus: "active", isDeleted: false })
      .exec();
  }
}
