// file: src/modules/email-verification/email-verification.service.ts

import { logger } from "@/middlewares/pino-logger";
import { EmailService } from "@/services/email.service";
import { OTPService } from "@/services/otp.service";
import {
  BadRequestException,
  NotFoundException,
} from "@/utils/app-error.utils";
import type {
  ICreateOTPRequest,
  ICreateOTPResponse,
  IEmailVerificationOTP,
  IResendEligibility,
  IResendOTPRequest,
  IResendOTPResponse,
  IVerificationStatus,
  IVerifyOTPRequest,
  IVerifyOTPResponse,
} from "./email-verification.types";
// import { ICreateOTPResponse } from "./email-verification.interface";
import { EmailVerificationOTPRepository } from "./email-verification.repository";

export class EmailVerificationService {
  private repository: EmailVerificationOTPRepository;
  private otpService: OTPService;
  private emailService: EmailService;

  private readonly config = {
    MAX_OTP_ATTEMPTS: 100,
    MIN_RESEND_INTERVAL_SECONDS: 60,
    MAX_RESENDS_PER_HOUR: 5,
    OTP_EXPIRY_MINUTES: 5,
    OTP_LENGTH: 4,
  };
  constructor(
    config?: Partial<typeof EmailVerificationService.prototype.config>
  ) {
    this.repository = new EmailVerificationOTPRepository();
    this.emailService = new EmailService();
    this.otpService = new OTPService({
      length: 4,
      expiryMinutes: this.config.OTP_EXPIRY_MINUTES,
      allowDuplicates: false,
      trackingEnabled: true,
    });

    if (config) {
      Object.assign(this.config, config);
    }
  }

  async createOTP(request: ICreateOTPRequest): Promise<ICreateOTPResponse> {
    await this.repository.invalidatePreviousOTPs(request.userId);

    const activeOTP = await this.repository.findActiveByUserId(request.userId);
    if (activeOTP?.verified) {
      throw new BadRequestException("Email already verified for this account");
    }

    const otpGenerated = this.otpService.generate("EMAIL_VERIFICATION");

    const expiresAt = new Date(
      Date.now() + this.config.OTP_EXPIRY_MINUTES * 60 * 1000
    );

    const record = await this.repository.createOTP({
      userId: request.userId,
      email: request.email,
      userType: request.userType,
      code: otpGenerated.code,
      expiresAt: otpGenerated.expiresAt,
      verified: false,
      attempts: 0,
      maxAttempts: this.config.MAX_OTP_ATTEMPTS,
    });

    await this.emailService.sendEmailVerification({
      to: request.email,
      userName: request.userName,
      userType: request.userType,
      verificationCode: String(otpGenerated.code),
      expiresIn: this.config.OTP_EXPIRY_MINUTES,
    });

    logger.info(
      {
        userId: request.userId,
        email: request.email,
        userType: request.userType,
        expiresAt: otpGenerated.expiresAt,
      },
      "Email verification OTP created and sent successfully"
    );

    return {
      otp: otpGenerated.code,
      code: otpGenerated.code,
      expiresAt: otpGenerated.expiresAt,
      expiresInMinutes: this.config.OTP_EXPIRY_MINUTES,
    };
  }

  async verifyOTP(request: IVerifyOTPRequest): Promise<IVerifyOTPResponse> {
    const record = await this.repository.findByEmail(request.email);
    if (!record) {
      throw new NotFoundException("Verification code not found or expired");
    }

    if (record.attempts >= this.config.MAX_OTP_ATTEMPTS) {
      throw new BadRequestException(
        "Maximum verification attempts exceeded. Please request a new code."
      );
    }

    const isValidCode = await this.validateOTPCode(
      request.code,
      record.code,
      record.expiresAt
    );

    if (!isValidCode) {
      await this.repository.incrementAttempts(record._id!.toString());

      logger.warn(
        {
          email: request.email,
          attempts: record.attempts + 1,
          userType: record.userType,
        },
        "OTP verification failed - invalid code"
      );

      throw new BadRequestException("Invalid verification code");
    }

    await this.repository.markAsVerified(record._id!.toString());

    logger.info(
      {
        userId: record.userId,
        email: request.email,
        userType: record.userType,
      },
      "Email verified successfully"
    );

    return {
      userId: record.userId,
      email: record.email,
      userType: record.userType,
      verified: true,
    };
  }

  async resendOTP(request: IResendOTPRequest): Promise<IResendOTPResponse> {
    let existingOTP = await this.repository.findByEmail(
      request.email,
      request.userType
    );

    if (!existingOTP) {
      existingOTP = await this.repository.findByEmailIgnoreExpiry(
        request.email,
        request.userType
      );
    }

    if (!existingOTP) {
      throw new NotFoundException(
        "No pending verification found. Please register again."
      );
    }

    if (existingOTP.verified) {
      throw new BadRequestException("Email already verified for this account");
    }

    const eligibility = await this.checkResendEligibility(existingOTP);
    if (!eligibility.canResend) {
      throw new BadRequestException(
        eligibility.reason ||
          "Too many resend attempts. Please try again later."
      );
    }

    await this.repository.invalidatePreviousOTPs(existingOTP.userId);

    const newOTPGenerated = this.otpService.generate(
      "EMAIL_VERIFICATION_RESEND"
    );

    await this.repository.createOTP({
      userId: existingOTP.userId,
      email: request.email,
      userType: request.userType,
      code: newOTPGenerated.code,
      expiresAt: newOTPGenerated.expiresAt,
      verified: false,
      attempts: 0,
      maxAttempts: this.config.MAX_OTP_ATTEMPTS,
    });

    const expiresInMinutes = Math.ceil(newOTPGenerated.expiresInSeconds / 60);

    await this.emailService.resendEmailVerification({
      to: request.email,
      userName: request.userName!,
      userType: request.userType!,
      verificationCode: String(newOTPGenerated.code),
      expiresIn: expiresInMinutes,
    });

    logger.info(
      {
        userId: existingOTP.userId,
        email: request.email,
        userType: request.userType,
        resendCount: eligibility.attemptsRemaining,
      },
      "Email verification OTP resent successfully"
    );

    return {
      message: `Verification code has been resent to your email. It will expire in ${expiresInMinutes} minutes.`,
      expiresAt: newOTPGenerated.expiresAt,
      expiresInMinutes,
    };
  }

  private async checkResendEligibility(
    otpRecord: IEmailVerificationOTP
  ): Promise<IResendEligibility> {
    const now = new Date();

    if (otpRecord.lastAttemptAt) {
      const secondsSinceLastAttempt =
        (now.getTime() - otpRecord.lastAttemptAt.getTime()) / 1000;

      if (secondsSinceLastAttempt < this.config.MIN_RESEND_INTERVAL_SECONDS) {
        const waitSeconds = Math.ceil(
          this.config.MIN_RESEND_INTERVAL_SECONDS - secondsSinceLastAttempt
        );

        return {
          canResend: false,
          reason: `Please wait ${waitSeconds} seconds before requesting another code.`,
          nextResendTime: new Date(now.getTime() + waitSeconds * 1000),
        };
      }
    }

    const resendCount = await this.repository.countResendAttemptsLastHour(
      otpRecord.userId,
      otpRecord.email
    );

    if (resendCount >= this.config.MAX_RESENDS_PER_HOUR) {
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      return {
        canResend: false,
        reason: "Too many resend requests. Please try again after 1 hour.",
        nextResendTime: oneHourFromNow,
        attemptsRemaining: 0,
      };
    }

    return {
      canResend: true,
      attemptsRemaining: this.config.MAX_RESENDS_PER_HOUR - resendCount,
    };
  }

  private async validateOTPCode(
    providedCode: string,
    storedCode: string,
    expiresAt: Date
  ): Promise<boolean> {
    if (new Date() > expiresAt) {
      return false;
    }

    return providedCode === storedCode;
  }

  async getVerificationStatus(userId: string): Promise<IVerificationStatus> {
    const record = await this.repository.findActiveByUserId(userId);

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
        userType: record.userType,
      };
    }

    const expiresInMinutes = Math.ceil(
      (record.expiresAt.getTime() - new Date().getTime()) / 60000
    );

    return {
      isVerified: false,
      pendingVerification: true,
      userType: record.userType,
      expiresAt: record.expiresAt,
      expiresInMinutes: Math.max(0, expiresInMinutes),
      attempts: record.attempts,
    };
  }

  async cleanupExpiredOTPs(): Promise<number> {
    const count = await this.repository.deleteExpiredOTPs();

    logger.info({ count }, "Expired email verification OTPs cleaned up");

    return count;
  }

  async deleteUserVerificationData(userId: string): Promise<void> {
    await this.repository.deleteByUserId(userId);

    logger.info({ userId }, "User verification data deleted");
  }
}
