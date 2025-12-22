// file: src/modules/renter/renter.service.ts

import { ROLES } from "@/constants/app.constants";
import { logger } from "@/middlewares/pino-logger";
import { EmailService } from "@/services/email.service";
import { ExcelService } from "@/services/excel.service";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@/utils/app-error.utils";
import { hashPassword } from "@/utils/password.utils";
import { ReferralParser } from "@/utils/referral-parser.utils";
import { AuthUtil } from "../auth/auth.utils";
import { EmailVerificationService } from "../email-verification/email-verification.service";
import { PasswordResetService } from "../password/password.service";
import { UserService } from "../user/user.service";
import { RenterRepository } from "./renter.repository";
import type {
  AdminReferralRenterRegisterPayload,
  AgentReferralRenterRegisterPayload,
  NormalRenterRegisterPayload,
  RenterRegistrationResponse,
  RenterResponse,
  ResetPasswordPayload,
  UpdateRenterProfilePayload,
} from "./renter.type";
import { RenterUtil } from "./renter.utils";

import { PaginatedResponse, PaginationQuery } from "@/ts/pagination.types";
import { AgentProfileRepository } from "../agent/agent.repository";
import { PreMarketRepository } from "../pre-market/pre-market.repository";
import { ReferralService } from "../referral/referral.service";
import { UserRepository } from "../user/user.repository";

/**
 * Renter Service
 * Handles all renter-related business logic
 * Supports three registration flows: Normal, Agent Referral, Admin Referral
 */
export class RenterService {
  private repository: RenterRepository;
  private userService: UserService;
  private emailVerificationService: EmailVerificationService;
  private emailService: EmailService;
  private passwordResetService: PasswordResetService;
  private referralService: ReferralService;
  private excelService: ExcelService;

  constructor() {
    this.repository = new RenterRepository();
    this.userService = new UserService();
    this.emailVerificationService = new EmailVerificationService();
    this.emailService = new EmailService();
    this.passwordResetService = new PasswordResetService();
    this.referralService = new ReferralService();
    this.excelService = new ExcelService();
  }

  // REGISTRATION FLOWS (3 Types)

  async registerRenter(payload: any): Promise<RenterRegistrationResponse> {
    // Detect registration type
    if (payload.referralCode) {
      const parsed = ReferralParser.parse(payload.referralCode);
      if (parsed.type === "agent_referral") {
        return this.registerAgentReferralRenter(
          payload as AgentReferralRenterRegisterPayload
        );
      } else if (parsed.type === "admin_referral") {
        return this.registerAdminReferralRenter(
          payload as AdminReferralRenterRegisterPayload
        );
      } else {
        throw new BadRequestException("Invalid referral code format");
      }
    } else {
      return this.registerNormalRenter(payload as NormalRenterRegisterPayload);
    }
  }

  /**
   * 1️⃣ NORMAL RENTER REGISTRATION
   * Standard flow: email + password + email verification required
   */
  private async registerNormalRenter(
    payload: NormalRenterRegisterPayload
  ): Promise<RenterRegistrationResponse> {
    const existingUser = await this.userService.getUserByEmail(payload.email);
    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    const hashedPassword = await hashPassword(payload.password);

    const user = await this.userService.create({
      email: payload.email,
      password: hashedPassword,
      fullName: payload.fullName,
      phoneNumber: payload.phoneNumber,
      role: ROLES.RENTER,
      emailVerified: false,
      accountStatus: "pending",
    });

    await this.emailVerificationService.createOTP({
      userId: user._id.toString(),
      email: user.email,
      userType: ROLES.RENTER,
      userName: user.fullName,
    });

    const renterProfile = await this.repository.createRenter({
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: payload.phoneNumber,
      registrationType: "normal",
      accountStatus: "pending",
    });

    // Step 6: Generate JWT tokens
    const tokens = this.generateTokens(
      user._id.toString(),
      user.email,
      user.role,
      user.accountStatus
    );

    //  this.updateConsolidatedExcel();
    this.updateRenterConsolidatedExcel().catch((error) => {
      logger.error(error, "Error updating renter consolidated Excel");
    });

    return {
      user: this.userService.toUserResponse(user),
      renter: this.toRenterResponse(renterProfile),
      tokens,
      registrationType: "normal",
    };
  }

  /**
   * 2️⃣ AGENT REFERRAL RENTER REGISTRATION
   * Flow: email + password + referral code (AGT-xxxxx) + email verification required
   */
  private async registerAgentReferralRenter(
    payload: AgentReferralRenterRegisterPayload
  ): Promise<RenterRegistrationResponse> {
    // Step 1: Validate referral code format
    const parsed = ReferralParser.parse(payload.referralCode);

    if (!parsed.isValid || parsed.type !== "agent_referral") {
      throw new BadRequestException("Invalid agent referral code");
    }

    // Step 2: Check if email already exists
    const existingUser = await this.userService.getUserByEmail(payload.email);
    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    // Step 3: VALIDATE & GET AGENT FROM REFERRAL CODE
    const agentId = await this.validateAndGetAgentFromReferralCode(
      payload.referralCode
    );

    // Step 4: Hash password
    const hashedPassword = await hashPassword(payload.password);

    // Step 5: Create User account
    const user = await this.userService.create({
      email: payload.email,
      password: hashedPassword,
      fullName: payload.fullName,
      phoneNumber: payload.phoneNumber,
      role: ROLES.RENTER,
      emailVerified: false,
      accountStatus: "pending",
    });

    // Step 6: Create OTP for email verification
    await this.emailVerificationService.createOTP({
      userId: user._id.toString(),
      email: user.email,
      userType: ROLES.RENTER,
      userName: user.fullName,
    });

    // Step 7: Create Renter profile with agent referral tracking
    const renterProfile = await this.repository.createRenter({
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: payload.phoneNumber,
      registrationType: "agent_referral",
      referredByAgentId: agentId,
      accountStatus: "pending",
    });

    // STEP 8: RECORD REFERRAL - INCREMENT AGENT'S TOTAL REFERRALS (FIXED)
    await this.referralService.recordReferral(agentId);

    // Step 9: Generate JWT tokens
    const tokens = this.generateTokens(
      user._id.toString(),
      user.email,
      user.role,
      user.accountStatus
    );

    this.updateRenterConsolidatedExcel().catch((error) => {
      logger.error(error, "Error updating renter consolidated Excel");
    });

    return {
      user: this.userService.toUserResponse(user),
      renter: this.toRenterResponse(renterProfile),
      tokens,
      registrationType: "agent_referral",
    };
  }

  /**
   * ADMIN REFERRAL RENTER REGISTRATION (PASSWORDLESS)
   * Flow: email + referral code (ADM-xxxxx) + auto-generated password + questionnaire
   * Password sent via email + must change on first login
   */
  private async registerAdminReferralRenter(
    payload: AdminReferralRenterRegisterPayload
  ): Promise<RenterRegistrationResponse> {
    // Step 1: Validate referral code format
    const parsed = ReferralParser.parse(payload.referralCode);
    if (!parsed.isValid || parsed.type !== "admin_referral") {
      throw new BadRequestException("Invalid admin referral code");
    }

    // Step 2: Check if email already exists
    const existingUser = await this.userService.getUserByEmail(payload.email);
    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    // Step 3: Generate random password
    const temporaryPassword = RenterUtil.generateAutoPassword().password;
    const hashedPassword = await hashPassword(temporaryPassword);

    // Step 4: Validate referral code in system and get admin ID
    const adminId = await this.validateAndGetAdminFromReferralCode(
      payload.referralCode
    );

    // STEP 5: RECORD REFERRAL - INCREMENT ADMIN'S TOTAL REFERRALS
    await this.referralService.recordReferral(adminId);

    // Step 5: Create User account with mustChangePassword flag
    const user = await this.userService.create({
      email: payload.email,
      password: hashedPassword,
      fullName: payload.fullName,
      phoneNumber: payload.phoneNumber,
      role: ROLES.RENTER,
      emailVerified: false,
      accountStatus: "pending",
      mustChangePassword: true,
      passwordAutoGenerated: true,
    });

    // Step 6: Skip OTP creation for admin referral (email is verified by admin)
    // Mark email as verified automatically
    await this.userService.markEmailAsVerified(user._id.toString());

    // Step 7: Create Renter profile with admin referral tracking
    const renterProfile = await this.repository.createRenter({
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: payload.phoneNumber,
      registrationType: "admin_referral",
      referredByAdminId: adminId,
      accountStatus: "active",
      questionnaire: payload.questionnaire
        ? { ...payload.questionnaire, _id: false }
        : undefined,
    });

    let emailResult: any = null;
    try {
      logger.debug(
        { email: user.email, userName: user.fullName },
        "Attempting to send admin referral email"
      );

      emailResult = await this.emailService.sendAdminReferralEmail({
        to: user.email,
        userName: user.fullName,
        temporaryPassword,
        loginLink: `${process.env.CLIENT_URL}/login`,
      });

      if (emailResult?.success) {
        logger.info(
          {
            userId: user._id,
            email: user.email,
            messageId: emailResult.messageId,
          },
          "✅ Admin referral email sent successfully"
        );
      } else {
        logger.warn(
          {
            userId: user._id,
            email: user.email,
            error: emailResult?.error,
          },
          "⚠️ Email send failed but registration completed"
        );
      }
    } catch (emailError) {
      logger.error(
        {
          userId: user._id,
          email: user.email,
          error:
            emailError instanceof Error
              ? emailError.message
              : String(emailError),
        },
        "❌ Error during email send - continuing with registration"
      );
    }

    // Step 10: Generate JWT tokens
    const tokens = this.generateTokens(
      user._id.toString(),
      user.email,
      user.role,
      user.accountStatus
    );

    this.updateRenterConsolidatedExcel().catch((error) => {
      logger.error(error, "Error updating renter consolidated Excel");
    });

    return {
      user: this.userService.toUserResponse(user),
      renter: this.toRenterResponse(renterProfile),
      tokens,
      registrationType: "admin_referral",
      temporaryPassword,
      mustChangePassword: true,
      emailSent: emailResult?.success || false,
      emailError: emailResult?.error || null,
    };
  }

  /**
   * Request password reset (forgot password)
   */
  async requestPasswordReset(
    email: string
  ): Promise<{ message: string; expiresAt?: Date; expiresInMinutes?: number }> {
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return { message: "If account exists, password reset code will be sent" };
    }

    const result = await this.passwordResetService.requestPasswordReset(
      user._id.toString(),
      user.email,
      user.fullName
    );

    logger.info({ userId: user._id, email }, "Password reset requested");

    return result;
  }

  /**
   * Verify password reset OTP
   */
  async verifyOTP(email: string, otp: string): Promise<{ message: string }> {
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.passwordResetService.verifyOTP(user._id.toString(), otp);
  }

  /**
   * Reset password with OTP
   */
  async resetPassword(
    payload: ResetPasswordPayload
  ): Promise<{ message: string }> {
    const user = await this.userService.getUserByEmail(payload.email);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Step 1: Verify OTP again
    await this.passwordResetService.verifyOTP(user._id.toString(), payload.otp);

    // Step 2: Hash new password
    const hashedPassword = await hashPassword(payload.newPassword);

    // Step 3: Update user password
    await this.userService.updatePassword(user._id.toString(), hashedPassword);

    // Step 4: Mark OTP as used and clean up
    await this.passwordResetService.markOTPAsUsed(user._id.toString());
    await this.passwordResetService.deleteUserOTPs(user._id.toString());

    // Step 5: Send confirmation email
    await this.emailService.sendPasswordResetConfirmation(
      user.fullName,
      user.email
    );

    logger.info(
      { userId: user._id, email: payload.email },
      "Password reset successfully"
    );

    return {
      message:
        "Password reset successfully. Please log in with your new password.",
    };
  }

  // ============================================
  // PROFILE MANAGEMENT
  // ============================================

  /**
   * Get renter profile
   */
  async getRenterProfile(userId: string): Promise<RenterResponse> {
    const renter = await this.repository.findByUserId(userId);

    if (!renter) {
      throw new NotFoundException("Renter profile not found");
    }

    return this.toRenterResponse(renter);
  }

  /**
   * Update renter profile
   */
  async updateRenterProfile(
    userId: string,
    payload: UpdateRenterProfilePayload
  ): Promise<RenterResponse> {
    const renter = await this.repository.updateProfile(userId, payload);
    if (!renter) {
      throw new NotFoundException("Renter profile not found");
    }

    logger.info({ userId }, "Renter profile updated");

    return this.toRenterResponse(renter);
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(
    userId: string,
    email: string,
    role: string,
    accountStatus: string
  ): { accessToken: string; refreshToken: string; expiresIn: string } {
    const accessToken = AuthUtil.generateAccessToken({
      userId,
      email,
      role,
      accountStatus,
    });

    const refreshToken = AuthUtil.generateRefreshToken(userId);

    return {
      accessToken,
      refreshToken,
      expiresIn: "7d",
    };
  }

  /**
   * Convert renter model to response
   */
  private toRenterResponse(renter: any): RenterResponse {
    return {
      _id: renter._id.toString(),
      userId: renter.userId.toString(),
      email: renter.email,
      fullName: renter.fullName,
      phoneNumber: renter.phoneNumber,
      registrationType: renter.registrationType,
      referredByAgentId: renter.referredByAgentId?.toString(),
      referredByAdminId: renter.referredByAdminId?.toString(),
      emailVerified: renter.emailVerified,
      accountStatus: renter.accountStatus,
      occupation: renter.occupation,
      moveInDate: renter.moveInDate,
      petFriendly: renter.petFriendly || false,
      questionnaire: renter.questionnaire,
      createdAt: renter.createdAt,
      updatedAt: renter.updatedAt,
    };
  }

  /**
   * Validate agent referral code and get agent ID
   * Uses ReferralService instead of placeholder
   */

  private async validateAndGetAgentFromReferralCode(
    code: string
  ): Promise<string> {
    const referrer = await this.referralService.validateReferralCode(code);
    return referrer._id.toString();
  }

  /**
   * Validate admin referral code and get admin ID
   * Uses ReferralService instead of placeholder
   */
  private async validateAndGetAdminFromReferralCode(
    code: string
  ): Promise<string> {
    const referrer = await this.referralService.validateReferralCode(code);
    return referrer._id.toString();
  }

  async getAllRenters(
    query: PaginationQuery,
    accountStatus?: string
  ): Promise<PaginatedResponse<any>> {
    const result = await this.repository.findAllWithListingCount(
      query,
      accountStatus
    );

    const data = await Promise.all(
      result.data.map(async (renter: any) => {
        // Build referralInfo based on registration type
        let referralInfo: any = {
          registrationType: renter.registrationType,
        };

        if (renter.referredByAgentId) {
          const agent = await new AgentProfileRepository().findByUserId(
            renter.referredByAgentId.toString()
          );

          if (agent && agent.userId) {
            const populatedUser = agent.userId as any;
            referralInfo.referredByAgent = {
              referredBy: populatedUser.role,
              referrerName: populatedUser.fullName,
              referrerEmail: populatedUser.email,
            };
          }
        }

        if (
          renter.registrationType === "admin_referral" &&
          renter.referredByAdmin
        ) {
          referralInfo.referredByAdmin = {
            referredBy: "Admin",
            referrerName: renter.referredByAdmin.fullName,
            referrerEmail: renter.referredByAdmin.email,
          };
        }

        return {
          _id: renter._id,
          userId: renter.userId,
          email: renter.email,
          fullName: renter.fullName,
          phoneNumber: renter.phoneNumber,
          accountStatus: renter.accountStatus,
          totalListings: renter.totalListings,
          registrationType: renter.registrationType,
          referralInfo,
          createdAt: renter.createdAt,
        };
      })
    );

    return {
      success: true,
      data,
      pagination: result.pagination,
    };
  }

  /**
   * Get renter details with referral info and listings
   * Admin view: Detailed renter profile
   * @param renterId - Renter ID
   */
  async getRenterDetailsForAdmin(renterId: string): Promise<any> {
    // Get renter basic info
    const renter = await this.repository.findByIdWithReferralInfo(renterId);

    if (!renter) {
      throw new NotFoundException("Renter not found");
    }

    // Get referrer details
    let referralInfo: any = {
      registrationType: renter.registrationType,
    };

    if (renter.referredByAgentId) {
      const agent = await new AgentProfileRepository().findByUserId(
        renter.referredByAgentId.toString()
      );

      if (agent && agent.userId) {
        // Cast to any since userId is populated with user document
        const populatedUser = agent.userId as any;
        referralInfo.referredByAgent = {
          referredBy: populatedUser.role,
          referrerName: populatedUser.fullName,
          referrerEmail: populatedUser.email,
        };
      }
    }

    if (renter.referredByAdminId) {
      const admin = await new UserRepository().findById(
        renter.referredByAdminId.toString()
      );

      referralInfo.referredByAdmin = admin
        ? {
            referredBy: "Admin",
            referrerName: admin.fullName,
            referrerEmail: admin.email,
          }
        : null;
    }

    const listings = await new PreMarketRepository().findByRenterIdAll(
      renter.userId._id.toString(),
      true
    );

    const preMarketListings = listings.map((listing: any) => ({
      _id: listing._id,
      requestId: listing.requestId,
      requestName: listing.requestName,
      isActive: listing.isActive,
      status: listing.status,
      priceRange: listing.priceRange,
      locations: listing.locations,
      movingDateRange: listing.movingDateRange,
      viewedBy: {
        grantAccessAgents: listing.viewedBy?.grantAccessAgents?.length || 0,
        normalAgents: listing.viewedBy?.normalAgents?.length || 0,
      },
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
    }));

    return {
      _id: renter._id,
      email: renter.email,
      fullName: renter.fullName,
      phoneNumber: renter.phoneNumber,
      accountStatus: renter.accountStatus,
      // emailVerified: renter.emailVerified,
      moveInDate: renter.moveInDate,
      petFriendly: renter.petFriendly,
      referralInfo,
      preMarketListings,
      createdAt: renter.createdAt,
    };
  }

  /**
   * Get renter's pre-market listings
   * @param renterId - Renter ID
   * @param includeInactive - Include deactivated listings
   */
  async getRenterListings(
    renterId: string,
    includeInactive: boolean = true
  ): Promise<any[]> {
    return new PreMarketRepository().findByRenterIdAll(
      renterId,
      includeInactive
    );
  }

  /**
   * ✅ Async background job to generate/update Renter Excel
   * Called after every new renter registration
   * Non-blocking: User gets response before Excel is generated
   */
  async updateRenterConsolidatedExcel(): Promise<void> {
    // Fire and forget - don't wait for completion
    setImmediate(async () => {
      try {
        const buffer =
          await this.excelService.generateConsolidatedRenterExcel();

        const { url, fileName } =
          await this.excelService.uploadConsolidatedRenterExcel(buffer);

        const totalRenters = await this.repository.count();

        const previousMetadata = await this.repository.getExcelMetadata();
        const version = (previousMetadata?.version || 0) + 1;

        await this.repository.updateExcelMetadata({
          type: "renters",
          fileName,
          fileUrl: url,
          totalRenters,
          version: version,
          lastUpdated: new Date(),
        });

        logger.info(
          { fileName, totalRenters },
          "Renter Excel updated successfully"
        );
      } catch (error) {
        logger.error(
          { error },
          "Failed to update Renter Excel (non-blocking, continuing)"
        );
        // Don't throw - this is background job, don't affect user registration
      }
    });
  }
}
