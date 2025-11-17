// file: src/modules/password-reset/password-reset.repository.ts

import { BaseRepository } from "@/modules/base/base.repository";
import type { IPasswordResetOTP } from "./password-reset.interface";
import { PasswordResetOTP } from "./password-reset.model";

/**
 * Password Reset OTP Repository
 * Extends BaseRepository for data access
 */
export class PasswordResetOTPRepository extends BaseRepository<IPasswordResetOTP> {
  constructor() {
    super(PasswordResetOTP);
  }

  /**
   * Find active OTP by user ID
   * Active means: not used AND not expired
   */
  async findActiveOTP(userId: string): Promise<IPasswordResetOTP | null> {
    return this.model
      .findOne({
        userId,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      })
      .exec();
  }

  /**
   * Find all OTPs for user (including used/expired)
   */
  async findAllOTPsByUser(userId: string): Promise<IPasswordResetOTP[]> {
    return this.model.find({ userId }).exec();
  }

  /**
   * Find OTP by ID
   */
  async findOTPById(otpId: string): Promise<IPasswordResetOTP | null> {
    return this.model.findById(otpId).exec();
  }

  /**
   * Increment OTP attempts
   */
  async incrementAttempts(otpId: string): Promise<IPasswordResetOTP | null> {
    return this.model
      .findByIdAndUpdate(otpId, { $inc: { attempts: 1 } }, { new: true })
      .exec();
  }

  /**
   * Mark OTP as used
   */
  async markAsUsed(otpId: string): Promise<IPasswordResetOTP | null> {
    return this.model
      .findByIdAndUpdate(
        otpId,
        {
          isUsed: true,
          usedAt: new Date(),
        },
        { new: true }
      )
      .exec();
  }

  /**
   * Delete expired OTPs (manual cleanup)
   * MongoDB TTL index handles automatic cleanup
   */
  async deleteExpiredOTPs(): Promise<any> {
    return this.model
      .deleteMany({
        expiresAt: { $lt: new Date() },
      })
      .exec();
  }

  /**
   * Delete all OTPs for a user (useful after password reset)
   */
  async deleteUserOTPs(userId: string): Promise<any> {
    return this.model.deleteMany({ userId }).exec();
  }

  /**
   * Count active OTPs for user
   */
  async countActiveOTPs(userId: string): Promise<number> {
    return this.model
      .countDocuments({
        userId,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      })
      .exec();
  }

  /**
   * Create OTP
   */
  async createOTP(
    userId: string,
    otp: string,
    expiresAt: Date
  ): Promise<IPasswordResetOTP> {
    return this.model.create({
      userId,
      otp,
      expiresAt,
    });
  }
}
