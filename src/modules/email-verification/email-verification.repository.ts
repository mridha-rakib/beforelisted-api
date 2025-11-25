// file: src/modules/email-verification/email-verification.repository.ts

/**
 * Email Verification Repository
 * ✅ Handle all email verification OTP operations in database
 * ✅ Type-safe with full TypeScript support
 * ✅ Clean separation of concerns
 */
import { logger } from "@/middlewares/pino-logger";
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
   * Create new email verification OTP record
   *
   * @param userId - User ID
   * @param email - User email
   * @param code - OTP code
   * @param expiresAt - Expiration time
   * @returns Created document
   *
   * @example
   * const record = await repository.create(userId, email, "1234", expiresAt);
   */
  async createOTP(
    userId: string,
    email: string,
    code: string,
    expiresAt: Date
  ): Promise<IEmailVerificationOTP> {
    try {
      const record = await EmailVerificationOTP.create({
        userId,
        email,
        code,
        expiresAt,
        verified: false,
        attempts: 0,
      });

      logger.debug(
        {
          userId,
          email,
          expiresAt,
        },
        "Email verification OTP created"
      );

      return record;
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          userId,
          email,
        },
        "Failed to create email verification OTP"
      );
      throw error;
    }
  }

  /**
   * Find active (non-verified) OTP for user
   *
   * @param userId - User ID
   * @returns OTP record or null
   *
   * @example
   * const otp = await repository.findActiveOTPByUserId(userId);
   */
  async findActiveOTPByUserId(
    userId: string
  ): Promise<IEmailVerificationOTP | null> {
    try {
      const record = await EmailVerificationOTP.findOne({
        userId,
        verified: false,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      return record || null;
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          userId,
        },
        "Failed to find active OTP"
      );
      throw error;
    }
  }

  /**
   * Find OTP by email
   *
   * @param email - User email
   * @returns OTP record or null
   *
   * @example
   * const otp = await repository.findByEmail("user@example.com");
   */
  async findByEmail(email: string): Promise<IEmailVerificationOTP | null> {
    try {
      const record = await EmailVerificationOTP.findOne({
        email,
        verified: false,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      return record || null;
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email,
        },
        "Failed to find OTP by email"
      );
      throw error;
    }
  }

  /**
   * Find OTP by code
   *
   * @param code - OTP code
   * @param email - User email (for additional verification)
   * @returns OTP record or null
   *
   * @example
   * const otp = await repository.findByCode("1234", "user@example.com");
   */
  async findByCode(
    code: string,
    email: string
  ): Promise<IEmailVerificationOTP | null> {
    try {
      const record = await EmailVerificationOTP.findOne({
        code,
        email,
        verified: false,
        expiresAt: { $gt: new Date() },
      });

      return record || null;
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email,
        },
        "Failed to find OTP by code"
      );
      throw error;
    }
  }

  /**
   * Mark OTP as verified
   *
   * @param id - OTP document ID
   * @returns Updated document
   *
   * @example
   * const updated = await repository.markAsVerified(otpId);
   */
  async markAsVerified(id: string): Promise<IEmailVerificationOTP | null> {
    try {
      const record = await EmailVerificationOTP.findByIdAndUpdate(
        id,
        {
          verified: true,
          verifiedAt: new Date(),
        },
        { new: true }
      );

      if (record) {
        logger.debug({ id }, "Email verification OTP marked as verified");
      }

      return record;
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          id,
        },
        "Failed to mark OTP as verified"
      );
      throw error;
    }
  }

  /**
   * Increment failed attempt count
   *
   * @param id - OTP document ID
   * @returns Updated document
   *
   * @example
   * const updated = await repository.incrementAttempts(otpId);
   */
  async incrementAttempts(id: string): Promise<IEmailVerificationOTP | null> {
    try {
      const record = await EmailVerificationOTP.findByIdAndUpdate(
        id,
        {
          $inc: { attempts: 1 },
          lastAttemptAt: new Date(),
        },
        { new: true }
      );

      return record;
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          id,
        },
        "Failed to increment attempts"
      );
      throw error;
    }
  }

  /**
   * Invalidate previous OTPs for user (for resend flow)
   *
   * @param userId - User ID
   * @returns Number of records invalidated
   *
   * @example
   * const count = await repository.invalidatePreviousOTPs(userId);
   */
  async invalidatePreviousOTPs(userId: string): Promise<number> {
    try {
      const result = await EmailVerificationOTP.updateMany(
        {
          userId,
          verified: false,
        },
        {
          verified: true,
          verifiedAt: new Date(),
        }
      );

      logger.debug(
        {
          userId,
          count: result.modifiedCount,
        },
        "Previous OTPs invalidated"
      );

      return result.modifiedCount;
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          userId,
        },
        "Failed to invalidate previous OTPs"
      );
      throw error;
    }
  }

  /**
   * Delete expired OTPs (cleanup operation)
   *
   * @returns Number of records deleted
   *
   * @example
   * const count = await repository.deleteExpiredOTPs();
   */
  async deleteExpiredOTPs(): Promise<number> {
    try {
      const result = await EmailVerificationOTP.deleteMany({
        expiresAt: { $lt: new Date() },
      });

      logger.debug({ count: result.deletedCount }, "Expired OTPs deleted");

      return result.deletedCount;
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to delete expired OTPs"
      );
      throw error;
    }
  }

  /**
   * Get OTP statistics for user
   *
   * @param userId - User ID
   * @returns Statistics object
   *
   * @example
   * const stats = await repository.getStatistics(userId);
   */
  async getStatistics(userId: string): Promise<{
    totalOTPs: number;
    activeOTPs: number;
    verifiedOTPs: number;
    failedAttempts: number;
  }> {
    try {
      const now = new Date();

      const totalOTPs = await EmailVerificationOTP.countDocuments({ userId });

      const activeOTPs = await EmailVerificationOTP.countDocuments({
        userId,
        verified: false,
        expiresAt: { $gt: now },
      });

      const verifiedOTPs = await EmailVerificationOTP.countDocuments({
        userId,
        verified: true,
      });

      const failedAttempts = await EmailVerificationOTP.aggregate([
        { $match: { userId } },
        { $group: { _id: null, totalAttempts: { $sum: "$attempts" } } },
      ]);

      return {
        totalOTPs,
        activeOTPs,
        verifiedOTPs,
        failedAttempts: failedAttempts[0]?.totalAttempts || 0,
      };
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          userId,
        },
        "Failed to get OTP statistics"
      );
      throw error;
    }
  }
}
