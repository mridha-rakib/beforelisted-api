// file: src/modules/password-reset/password-reset.service.ts

import { MESSAGES } from "@/constants/app.constants";
import { logger } from "@/middlewares/pino-logger";
import {
  BadRequestException,
  NotFoundException,
} from "@/utils/app-error.utils";
import type { IPasswordResetOTP } from "./password-reset.interface";
import { PasswordResetOTPRepository } from "./password-reset.repository";

/**
 * Password Reset Service
 * Handles OTP creation, verification, and cleanup
 */
export class PasswordResetService {
  private repository: PasswordResetOTPRepository;

  constructor() {
    this.repository = new PasswordResetOTPRepository();
  }

  /**
   * Create new OTP for password reset
   */
  async createOTP(
    userId: string,
    otp: string,
    expiresAt: Date
  ): Promise<IPasswordResetOTP> {
    // Delete any existing active OTPs for this user
    await this.repository.deleteUserOTPs(userId);

    // Create new OTP
    const result = await this.repository.createOTP(userId, otp, expiresAt);

    logger.info({ userId, expiresAt }, "OTP created for password reset");

    return result;
  }

  /**
   * Find active OTP for user
   */
  async findActiveOTP(userId: string): Promise<IPasswordResetOTP | null> {
    return this.repository.findActiveOTP(userId);
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(userId: string, otp: string): Promise<{ message: string }> {
    // Find active OTP
    const passwordReset = await this.repository.findActiveOTP(userId);

    if (!passwordReset) {
      logger.warn({ userId }, "No active OTP found");
      throw new BadRequestException(MESSAGES.AUTH.OTP_EXPIRED);
    }

    // Check if max attempts exceeded
    if (passwordReset.attempts >= passwordReset.maxAttempts) {
      logger.warn(
        { userId, attempts: passwordReset.attempts },
        "Max OTP attempts exceeded"
      );
      throw new BadRequestException(MESSAGES.AUTH.OTP_MAX_ATTEMPTS);
    }

    // Check if OTP matches
    if (passwordReset.otp !== otp) {
      // Increment attempts
      await this.repository.incrementAttempts(passwordReset._id.toString());

      logger.warn(
        { userId, attempt: passwordReset.attempts + 1 },
        "Invalid OTP attempted"
      );

      throw new BadRequestException(MESSAGES.AUTH.INVALID_OTP);
    }

    logger.info({ userId }, "OTP verified successfully");

    return { message: "OTP verified successfully" };
  }

  /**
   * Mark OTP as used after successful password reset
   */
  async markAsUsed(otpId: string): Promise<IPasswordResetOTP | null> {
    const result = await this.repository.markAsUsed(otpId);

    if (result) {
      logger.info({ otpId }, "OTP marked as used");
    }

    return result;
  }

  /**
   * Get OTP details
   */
  async getOTP(otpId: string): Promise<IPasswordResetOTP> {
    const otp = await this.repository.findOTPById(otpId);

    if (!otp) {
      throw new NotFoundException("OTP not found");
    }

    return otp;
  }

  /**
   * Check if user has active OTP
   */
  async hasActiveOTP(userId: string): Promise<boolean> {
    const count = await this.repository.countActiveOTPs(userId);
    return count > 0;
  }

  /**
   * Get time remaining on active OTP
   */
  async getOTPTimeRemaining(userId: string): Promise<number | null> {
    const otp = await this.repository.findActiveOTP(userId);

    if (!otp) {
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(otp.expiresAt);
    const timeRemaining = expiresAt.getTime() - now.getTime();

    return timeRemaining > 0 ? Math.ceil(timeRemaining / 1000) : 0; // seconds
  }

  /**
   * Clean up expired OTPs manually
   * Note: MongoDB TTL index handles this automatically
   */
  async cleanupExpiredOTPs(): Promise<{ deletedCount: number }> {
    const result = await this.repository.deleteExpiredOTPs();

    logger.info(
      { deletedCount: result.deletedCount },
      "Expired OTPs cleaned up"
    );

    return { deletedCount: result.deletedCount || 0 };
  }

  /**
   * Delete all OTPs for user (after successful password reset)
   */
  async deleteUserOTPs(userId: string): Promise<void> {
    await this.repository.deleteUserOTPs(userId);

    logger.info({ userId }, "All user OTPs deleted");
  }
}
