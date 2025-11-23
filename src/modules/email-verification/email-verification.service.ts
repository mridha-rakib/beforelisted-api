// file: src/modules/email-verification/email-verification.service.ts

import { AUTH } from "@/constants/app.constants";
import { logger } from "@/middlewares/pino-logger";
import { BadRequestException } from "@/utils/app-error.utils";
import { EmailVerificationOTPRepository } from "./email-verification.repository";

/**
 * Email Verification Service
 * Handles OTP creation, verification, and cleanup
 */
export class EmailVerificationService {
  private repository: EmailVerificationOTPRepository;

  constructor() {
    this.repository = new EmailVerificationOTPRepository();
  }

  /**
   * Generate 4-digit OTP
   */
  private generateOTP(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Get OTP expiration time (10 minutes from now)
   */
  private getExpirationTime(): Date {
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + AUTH.EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES
    );
    return expiresAt;
  }

  /**
   * Create new OTP for email verification
   */
  async createOTP(
    userId: string,
    email: string
  ): Promise<{
    otp: string;
    expiresAt: Date;
  }> {
    // Delete any existing active OTPs for this user
    await this.repository.deleteUserOTPs(userId);

    // Generate new OTP
    const otp = this.generateOTP();
    const expiresAt = this.getExpirationTime();

    // Create OTP record
    await this.repository.createOTP(userId, email, otp, expiresAt);

    logger.info({ userId, email }, "Email verification OTP created");

    return { otp, expiresAt };
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(
    email: string,
    otp: string
  ): Promise<{
    userId: string;
    message: string;
  }> {
    // Find active OTP for email
    const verificationRecord =
      await this.repository.findActiveOTPByEmail(email);

    if (!verificationRecord) {
      logger.warn({ email }, "No active verification OTP found");
      throw new BadRequestException(
        "Verification code has expired or is invalid. Please request a new code."
      );
    }

    // Check if max attempts exceeded
    if (verificationRecord.attempts >= verificationRecord.maxAttempts) {
      logger.warn(
        { email, attempts: verificationRecord.attempts },
        "Max verification attempts exceeded"
      );
      throw new BadRequestException(
        "Maximum verification attempts exceeded. Please request a new code."
      );
    }

    // Check if OTP matches
    if (verificationRecord.otp !== otp) {
      // Increment attempts
      await this.repository.incrementAttempts(
        verificationRecord._id.toString()
      );

      const remainingAttempts =
        verificationRecord.maxAttempts - verificationRecord.attempts - 1;

      logger.warn(
        { email, attempt: verificationRecord.attempts + 1, remainingAttempts },
        "Invalid verification OTP attempted"
      );

      throw new BadRequestException(
        `Invalid verification code. You have ${remainingAttempts} attempt${remainingAttempts !== 1 ? "s" : ""} remaining.`
      );
    }

    // OTP is valid - mark as used
    await this.repository.markAsUsed(verificationRecord._id.toString());

    logger.info(
      { userId: verificationRecord.userId, email },
      "Email verification successful"
    );

    return {
      userId: verificationRecord.userId,
      message: "Email verified successfully",
    };
  }

  /**
   * Resend verification OTP
   */
  async resendOTP(
    userId: string,
    email: string
  ): Promise<{
    otp: string;
    expiresAt: Date;
    canResend: boolean;
  }> {
    // Check if there's an active OTP
    const activeOTP = await this.repository.findActiveOTPByUserId(userId);

    if (activeOTP) {
      const now = new Date();
      const timeSinceCreation = now.getTime() - activeOTP.createdAt.getTime();
      const cooldownMs = AUTH.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000;

      // Enforce cooldown (e.g., 60 seconds)
      if (timeSinceCreation < cooldownMs) {
        const remainingSeconds = Math.ceil(
          (cooldownMs - timeSinceCreation) / 1000
        );
        throw new BadRequestException(
          `Please wait ${remainingSeconds} seconds before requesting a new code`
        );
      }
    }

    // Create new OTP
    const result = await this.createOTP(userId, email);

    logger.info({ userId, email }, "Verification OTP resent");

    return {
      ...result,
      canResend: true,
    };
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
    const otp = await this.repository.findActiveOTPByUserId(userId);
    if (!otp) {
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(otp.expiresAt);
    const timeRemaining = expiresAt.getTime() - now.getTime();

    return timeRemaining > 0 ? Math.ceil(timeRemaining / 1000) : 0; // seconds
  }

  /**
   * Clean up expired OTPs (manual cleanup)
   */
  async cleanupExpiredOTPs(): Promise<{ deletedCount: number }> {
    const result = await this.repository.deleteExpiredOTPs();
    logger.info(
      { deletedCount: result.deletedCount },
      "Expired verification OTPs cleaned up"
    );
    return result;
  }

  /**
   * Delete all OTPs for user (after successful verification or account deletion)
   */
  async deleteUserOTPs(userId: string): Promise<void> {
    await this.repository.deleteUserOTPs(userId);
    logger.info({ userId }, "All user verification OTPs deleted");
  }
}
