// file: src/modules/email-verification/email-verification.repository.ts

import { BaseRepository } from "@/modules/base/base.repository";
import type { IEmailVerificationOTP } from "./email-verification.interface";
import { EmailVerificationOTP } from "./email-verification.model";

/**
 * Email Verification OTP Repository
 */
export class EmailVerificationOTPRepository extends BaseRepository<IEmailVerificationOTP> {
  constructor() {
    super(EmailVerificationOTP);
  }

  /**
   * Find active OTP by user ID
   * Active means: not used AND not expired
   */
  async findActiveOTPByUserId(
    userId: string
  ): Promise<IEmailVerificationOTP | null> {
    return this.model
      .findOne({
        userId,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      })
      .exec();
  }

  /**
   * Find active OTP by email
   */
  async findActiveOTPByEmail(
    email: string
  ): Promise<IEmailVerificationOTP | null> {
    return this.model
      .findOne({
        email: email.toLowerCase(),
        isUsed: false,
        expiresAt: { $gt: new Date() },
      })
      .exec();
  }

  /**
   * Create new OTP
   */
  async createOTP(
    userId: string,
    email: string,
    otp: string,
    expiresAt: Date
  ): Promise<IEmailVerificationOTP> {
    return this.create({
      userId,
      email: email.toLowerCase(),
      otp,
      attempts: 0,
      maxAttempts: 3,
      isUsed: false,
      expiresAt,
    } as Partial<IEmailVerificationOTP>);
  }

  /**
   * Increment OTP attempts
   */
  async incrementAttempts(
    otpId: string
  ): Promise<IEmailVerificationOTP | null> {
    return this.model
      .findByIdAndUpdate(otpId, { $inc: { attempts: 1 } }, { new: true })
      .exec();
  }

  /**
   * Mark OTP as used
   */
  async markAsUsed(otpId: string): Promise<IEmailVerificationOTP | null> {
    return this.model
      .findByIdAndUpdate(otpId, { isUsed: true }, { new: true })
      .exec();
  }

  /**
   * Delete all OTPs for user
   */
  async deleteUserOTPs(userId: string): Promise<void> {
    await this.model.deleteMany({ userId }).exec();
  }

  /**
   * Delete all OTPs for email
   */
  async deleteEmailOTPs(email: string): Promise<void> {
    await this.model.deleteMany({ email: email.toLowerCase() }).exec();
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
   * Delete expired OTPs (manual cleanup)
   */
  async deleteExpiredOTPs(): Promise<{ deletedCount: number }> {
    const result = await this.model
      .deleteMany({
        expiresAt: { $lt: new Date() },
      })
      .exec();

    return { deletedCount: result.deletedCount || 0 };
  }
}
