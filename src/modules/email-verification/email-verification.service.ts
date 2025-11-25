// file: src/modules/email-verification/email-verification.service.ts

/**
 * Email Verification Service
 * ✅ Handle email verification OTP generation, validation, and resend
 * ✅ Complete resend flow with expiration and duplicate prevention
 * ✅ Type-safe with proper error handling
 * ✅ SOLID principles applied
 */

import { logger } from "@/middlewares/pino-logger";
import { emailService } from "@/services/email.service";
import { OTPService } from "@/services/otp.service";
import {
  BadRequestException,
  NotFoundException,
} from "@/utils/app-error.utils";
import { EmailVerificationRepository } from "./email-verification.repository";

/**
 * Email Verification Service Response Types
 */
export interface ICreateOTPResponse {
  otp: string;
  expiresAt: Date;
  expiresInMinutes: number;
}

export interface IVerifyOTPResponse {
  userId: string;
  email: string;
  verified: true;
}

export interface IResendOTPResponse {
  message: string;
  expiresAt: Date;
  expiresInMinutes: number;
}

export interface IOTPResendStatus {
  canResend: boolean;
  reason?: string;
  nextResendTime?: Date;
  attemptsRemaining?: number;
}

/**
 * Email Verification Service
 * Manages email verification OTP lifecycle
 */
export class EmailVerificationService {
  private repository: EmailVerificationRepository;
  private otpService: OTPService;

  // ============================================
  // RATE LIMITING & THROTTLING CONSTANTS
  // ============================================

  private readonly MAX_OTP_ATTEMPTS = 5; // Max failed verification attempts
  private readonly MIN_RESEND_INTERVAL = 60; // Min seconds between resends
  private readonly MAX_RESENDS_PER_HOUR = 5; // Max resend requests per hour
  private readonly OTP_EXPIRY_MINUTES = 10; // OTP validity period

  constructor() {
    this.repository = new EmailVerificationRepository();
    this.otpService = new OTPService({
      length: 4,
      expiryMinutes: this.OTP_EXPIRY_MINUTES,
      allowDuplicates: false,
      trackingEnabled: true,
    });
  }

  // ============================================
  // CREATE OTP (Initial Registration)
  // ============================================

  /**
   * Create initial OTP for email verification
   *
   * @param userId - User ID
   * @param email - User email
   * @returns OTP and expiration details
   *
   * @throws BadRequestException if user already verified
   * @throws Error if OTP creation fails
   *
   * @example
   * const { otp, expiresAt } = await service.createOTP(userId, email);
   */
  async createOTP(userId: string, email: string): Promise<ICreateOTPResponse> {
    try {
      // Check if user already verified (prevent double verification)
      const activeOTP = await this.repository.findActiveOTPByUserId(userId);

      if (activeOTP && activeOTP.verified) {
        throw new BadRequestException(
          "Email already verified for this account"
        );
      }

      // Generate 4-digit OTP using reusable OTP service
      const otpResult = this.otpService.generate("EMAIL_VERIFICATION");

      // Save to database
      const record = await this.repository.create(
        userId,
        email,
        otpResult.code,
        otpResult.expiresAt
      );

      const expiresInMinutes = Math.ceil(otpResult.expiresInSeconds / 60);

      logger.info(
        { userId, email, expiresAt: otpResult.expiresAt },
        "Email verification OTP created"
      );

      return {
        otp: otpResult.code,
        expiresAt: otpResult.expiresAt,
        expiresInMinutes,
      };
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

  // ============================================
  // VERIFY OTP
  // ============================================

  /**
   * Verify email with OTP code
   *
   * @param email - User email
   * @param code - OTP code provided by user
   * @returns Verification result with userId
   *
   * @throws NotFoundException if OTP not found
   * @throws BadRequestException if OTP invalid/expired
   * @throws Error if OTP has reached max attempts
   *
   * @example
   * const result = await service.verifyOTP("user@example.com", "1234");
   */
  async verifyOTP(email: string, code: string): Promise<IVerifyOTPResponse> {
    try {
      // Find active OTP for email
      const record = await this.repository.findByEmail(email);

      if (!record) {
        throw new NotFoundException("Verification code not found or expired");
      }

      // Check if max attempts reached
      if (record.attempts >= this.MAX_OTP_ATTEMPTS) {
        throw new BadRequestException(
          `Maximum verification attempts exceeded. Please request a new code.`
        );
      }

      // Validate OTP code
      const validationResult = this.otpService.validate(
        code,
        record.expiresAt,
        4
      );

      if (!validationResult.isValid) {
        // Increment failed attempts
        await this.repository.incrementAttempts(record._id.toString());

        logger.warn(
          {
            email,
            attempts: record.attempts + 1,
            reason: validationResult.errorCode,
          },
          "OTP verification failed"
        );

        throw new BadRequestException(validationResult.message);
      }

      // Mark as verified
      await this.repository.markAsVerified(record._id.toString());

      logger.info(
        { userId: record.userId.toString(), email },
        "Email verified successfully"
      );

      return {
        userId: record.userId.toString(),
        email,
        verified: true,
      };
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email,
        },
        "Failed to verify email OTP"
      );
      throw error;
    }
  }

  // ============================================
  // RESEND OTP (Main New Feature)
  // ============================================

  /**
   * Resend verification OTP
   *
   * ✅ KEY FEATURE: Complete resend flow with:
   * - Validation that user is unverified
   * - Rate limiting (prevent spam)
   * - Automatic invalidation of old OTPs
   * - Generation of new OTP
   * - Email sending
   *
   * @param email - User email
   * @returns New OTP expiration details
   *
   * @throws NotFoundException if user/email not found
   * @throws BadRequestException if already verified
   * @throws BadRequestException if resend rate limit exceeded
   * @throws Error if resend fails
   *
   * @example
   * const result = await service.resendOTP("user@example.com");
   * // Returns: { message, expiresAt, expiresInMinutes }
   */
  async resendOTP(email: string): Promise<IResendOTPResponse> {
    try {
      // Step 1: Find existing OTP record
      const existingOTP = await this.repository.findByEmail(email);

      if (!existingOTP) {
        // No existing OTP found
        throw new NotFoundException(
          "No pending verification found. Please register again."
        );
      }

      // Step 2: Check if already verified
      if (existingOTP.verified) {
        throw new BadRequestException(
          "Email already verified for this account"
        );
      }

      // Step 3: Check resend rate limiting
      const resendStatus = await this.checkResendEligibility(existingOTP);

      if (!resendStatus.canResend) {
        throw new BadRequestException(
          resendStatus.reason ||
            "Too many resend attempts. Please try again later."
        );
      }

      // Step 4: Invalidate all previous OTPs for this user
      await this.repository.invalidatePreviousOTPs(
        existingOTP.userId.toString()
      );

      logger.debug(
        { userId: existingOTP.userId.toString() },
        "Previous OTPs invalidated"
      );

      // Step 5: Generate new OTP
      const newOTPResult = this.otpService.generate(
        "EMAIL_VERIFICATION_RESEND"
      );

      // Step 6: Save new OTP to database
      const newRecord = await this.repository.create(
        existingOTP.userId.toString(),
        email,
        newOTPResult.code,
        newOTPResult.expiresAt
      );

      // Step 7: Send verification email with new OTP
      await emailService.sendEmailVerificationCode(
        "User", // Will be replaced with actual name in real scenario
        email,
        newOTPResult.code,
        this.OTP_EXPIRY_MINUTES
      );

      const expiresInMinutes = Math.ceil(newOTPResult.expiresInSeconds / 60);

      logger.info(
        {
          userId: existingOTP.userId.toString(),
          email,
          expiresAt: newOTPResult.expiresAt,
        },
        "Email verification OTP resent successfully"
      );

      return {
        message:
          "Verification code has been resent to your email. It will expire in " +
          expiresInMinutes +
          " minutes.",
        expiresAt: newOTPResult.expiresAt,
        expiresInMinutes,
      };
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email,
        },
        "Failed to resend email verification OTP"
      );
      throw error;
    }
  }

  // ============================================
  // CHECK RESEND ELIGIBILITY (Rate Limiting)
  // ============================================

  /**
   * Check if user can request OTP resend
   * Implements rate limiting and throttling
   *
   * @param otpRecord - Existing OTP record
   * @returns Eligibility status with reason if not eligible
   *
   * @private
   *
   * @example
   * const status = await service.checkResendEligibility(otpRecord);
   * if (!status.canResend) {
   *   console.log(status.reason);
   *   // "Please wait X minutes before requesting a new code"
   * }
   */
  private async checkResendEligibility(
    otpRecord: any
  ): Promise<IOTPResendStatus> {
    const now = new Date();

    // Check 1: Minimum interval between resends (prevent rapid spam)
    if (otpRecord.lastAttemptAt) {
      const timeSinceLastAttempt =
        (now.getTime() - otpRecord.lastAttemptAt.getTime()) / 1000;

      if (timeSinceLastAttempt < this.MIN_RESEND_INTERVAL) {
        const waitSeconds = Math.ceil(
          this.MIN_RESEND_INTERVAL - timeSinceLastAttempt
        );
        const nextResendTime = new Date(now.getTime() + waitSeconds * 1000);

        return {
          canResend: false,
          reason: `Please wait ${waitSeconds} seconds before requesting another code.`,
          nextResendTime,
        };
      }
    }

    // Check 2: Maximum resends per hour
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const resendCount = await EmailVerificationOTP.countDocuments({
      userId: otpRecord.userId,
      email: otpRecord.email,
      createdAt: { $gte: oneHourAgo },
    });

    if (resendCount >= this.MAX_RESENDS_PER_HOUR) {
      const nextResendTime = new Date(
        otpRecord.createdAt.getTime() + 60 * 60 * 1000
      );

      return {
        canResend: false,
        reason: `Too many resend requests. Please try again after 1 hour.`,
        nextResendTime,
        attemptsRemaining: 0,
      };
    }

    return {
      canResend: true,
      attemptsRemaining: this.MAX_RESENDS_PER_HOUR - resendCount,
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get verification status for user
   *
   * @param userId - User ID
   * @returns Status object
   *
   * @example
   * const status = await service.getVerificationStatus(userId);
   */
  async getVerificationStatus(userId: string): Promise<{
    isVerified: boolean;
    pendingVerification: boolean;
    expiresAt?: Date;
    expiresInMinutes?: number;
    attempts?: number;
  }> {
    try {
      const record = await this.repository.findActiveOTPByUserId(userId);

      if (!record) {
        return {
          isVerified: false,
          pendingVerification: false,
        };
      }

      if (record.verified) {
        return {
          isVerified: true,
          pendingVerification: false,
        };
      }

      const expiresInMinutes = Math.ceil(
        (record.expiresAt.getTime() - new Date().getTime()) / 60000
      );

      return {
        isVerified: false,
        pendingVerification: true,
        expiresAt: record.expiresAt,
        expiresInMinutes,
        attempts: record.attempts,
      };
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          userId,
        },
        "Failed to get verification status"
      );
      throw error;
    }
  }

  /**
   * Delete expired OTPs (cleanup operation)
   * Should be called periodically (e.g., via cron job)
   *
   * @returns Number of records deleted
   *
   * @example
   * // In a cron job or scheduled task
   * const count = await service.cleanupExpiredOTPs();
   */
  async cleanupExpiredOTPs(): Promise<number> {
    try {
      const count = await this.repository.deleteExpiredOTPs();

      logger.info({ count }, "Expired OTPs cleaned up");

      return count;
    } catch (error) {
      logger.error("Failed to cleanup expired OTPs", {
        error: error instanceof Error ? error.message : String(error),
      });
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
   * const stats = await service.getOTPStatistics(userId);
   */
  async getOTPStatistics(userId: string): Promise<{
    totalOTPs: number;
    activeOTPs: number;
    verifiedOTPs: number;
    failedAttempts: number;
  }> {
    try {
      return await this.repository.getStatistics(userId);
    } catch (error) {
      logger.error("Failed to get OTP statistics", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }
}
