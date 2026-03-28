// file: src/modules/renter/renter.service.ts

import { ROLES, SYSTEM_DEFAULT_AGENT } from "@/constants/app.constants";
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
  RenterRegistrationResponse,
  RenterResponse,
  ResetPasswordPayload,
  UpdateRenterProfilePayload,
} from "./renter.type";
import { RenterUtil } from "./renter.utils";

import { PaginatedResponse, PaginationQuery } from "@/ts/pagination.types";
import { AgentProfileRepository } from "../agent/agent.repository";
import { PreMarketRepository } from "../pre-market/pre-market.repository";
import { PreMarketService } from "../pre-market/pre-market.service";
import { ReferralService } from "../referral/referral.service";
import type { UserResponse } from "@/modules/user/user.type";
import { UserRepository } from "../user/user.repository";

export class RenterService {
  private repository: RenterRepository;
  private userService: UserService;
  private emailVerificationService: EmailVerificationService;
  private emailService: EmailService;
  private passwordResetService: PasswordResetService;
  private referralService: ReferralService;
  private excelService: ExcelService;
  private preMarketService: PreMarketService;

  constructor() {
    this.repository = new RenterRepository();
    this.userService = new UserService();
    this.emailVerificationService = new EmailVerificationService();
    this.emailService = new EmailService();
    this.passwordResetService = new PasswordResetService();
    this.referralService = new ReferralService();
    this.excelService = new ExcelService();
    this.preMarketService = new PreMarketService();
  }

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
      throw new BadRequestException(
        "Referral code is required. Renters must register using an agent or admin referral code."
      );
    }
  }
  private async registerAgentReferralRenter(
    payload: AgentReferralRenterRegisterPayload
  ): Promise<RenterRegistrationResponse> {
    const parsed = ReferralParser.parse(payload.referralCode);

    if (!parsed.isValid || parsed.type !== "agent_referral") {
      throw new BadRequestException("Invalid agent referral code");
    }
    const existingUser = await this.userService.getUserByEmail(payload.email);
    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    const agentId = await this.validateAndGetAgentFromReferralCode(
      payload.referralCode
    );

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
      registrationType: "agent_referral",
      referredByAgentId: agentId,
      accountStatus: "pending",
    });

    await this.referralService.recordReferral(agentId);
    const tokens = this.generateTokens(
      user._id.toString(),
      user.email,
      user.role,
      user.accountStatus
    );

    this.updateRenterConsolidatedExcel().catch((error) => {
      logger.error(error, "Error updating renter consolidated Excel");
    });
    this.schedulePreMarketConsolidatedExcelRefresh(
      {
        userId: user._id.toString(),
        renterId: renterProfile._id?.toString(),
      },
      "Error updating pre-market consolidated Excel after renter registration",
    );

    return {
      user: this.userService.toUserResponse(user),
      renter: this.toRenterResponse(renterProfile),
      tokens,
      registrationType: "agent_referral",
    };
  }

  private async registerAdminReferralRenter(
    payload: AdminReferralRenterRegisterPayload
  ): Promise<RenterRegistrationResponse> {
    const parsed = ReferralParser.parse(payload.referralCode);
    if (!parsed.isValid || parsed.type !== "admin_referral") {
      throw new BadRequestException("Invalid admin referral code");
    }
    const existingUser = await this.userService.getUserByEmail(payload.email);
    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    const temporaryPassword = RenterUtil.generateAutoPassword().password;
    const hashedPassword = await hashPassword(temporaryPassword);

    const adminId = await this.validateAndGetAdminFromReferralCode(
      payload.referralCode
    );
    const assignedAgentId = await this.getDefaultAssignedAgentId();

    await this.referralService.recordReferral(adminId);

    const user = await this.userService.create({
      email: payload.email,
      password: hashedPassword,
      fullName: payload.fullName,
      phoneNumber: payload.phoneNumber,
      role: ROLES.RENTER,
      emailVerified: true,
      accountStatus: "active",
      mustChangePassword: true,
      passwordAutoGenerated: true,
    });

    await this.userService.markEmailAsVerified(user._id.toString());
    const renterProfile = await this.repository.createRenter({
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: payload.phoneNumber,
      registrationType: "admin_referral",
      referredByAdminId: adminId,
      referredByAgentId: assignedAgentId,
      accountStatus: "active",
      questionnaire: payload.questionnaire
        ? { ...payload.questionnaire, _id: false }
        : undefined,
    });
    const registeredAgent = await this.getAssignedAgentWelcomeDetails(
      assignedAgentId
    );

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

        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail) {
          logger.warn("ADMIN_EMAIL not configured in environment");
        } else {
          try {
            await this.emailService.sendRenterRegistrationVerifiedAdminNotification(
              {
                to: adminEmail,
                renterName: user.fullName || "N/A",
                renterPhone: user.phoneNumber || "N/A",
                renterEmail: user.email,
                registrationDate: this.formatEasternTime(
                  user.createdAt ? new Date(user.createdAt) : new Date()
                ),
                registeredAgentName: registeredAgent.fullName || "N/A",
                registeredAgentBrokerage: registeredAgent.brokerage || "N/A",
                registeredAgentEmail: registeredAgent.email,
              }
            );
          } catch (adminNotificationError) {
            logger.error(
              {
                userId: user._id,
                email: user.email,
                error:
                  adminNotificationError instanceof Error
                    ? adminNotificationError.message
                    : String(adminNotificationError),
              },
              "❌ Error sending admin notification for admin referral renter registration"
            );
          }
        }

        try {
          const welcomeEmailResult = await this.emailService.sendWelcomeEmail({
            to: user.email,
            userName: user.fullName,
            userType: ROLES.RENTER,
            loginLink: `${process.env.CLIENT_URL}/login`,
            registeredAgent,
          });

          if (welcomeEmailResult?.success) {
            logger.info(
              {
                userId: user._id,
                email: user.email,
                messageId: welcomeEmailResult.messageId,
              },
              "✅ Admin referral renter welcome email sent successfully"
            );
          } else {
            logger.warn(
              {
                userId: user._id,
                email: user.email,
                error: welcomeEmailResult?.error,
              },
              "⚠️ Welcome email send failed after admin referral password email"
            );
          }
        } catch (welcomeEmailError) {
          logger.error(
            {
              userId: user._id,
              email: user.email,
              error:
                welcomeEmailError instanceof Error
                  ? welcomeEmailError.message
                  : String(welcomeEmailError),
            },
            "❌ Error sending admin referral renter welcome email"
          );
        }
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
    this.schedulePreMarketConsolidatedExcelRefresh(
      {
        userId: user._id.toString(),
        renterId: renterProfile._id?.toString(),
      },
      "Error updating pre-market consolidated Excel after renter registration",
    );

    const userResponse = this.userService.toUserResponse(user);
    const { referralLink, loginLink, totalReferrals, ...restUser } = userResponse;

    return {
      user: restUser as UserResponse,
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

  async updateRenterProfile(
    userId: string,
    payload: UpdateRenterProfilePayload
  ): Promise<RenterResponse> {
    // Update Renter model
    const renter = await this.repository.updateProfile(userId, payload);
    if (!renter) {
      throw new NotFoundException("Renter profile not found");
    }

    const syncPayload: Record<string, any> = {};
    if (payload.fullName) syncPayload.fullName = payload.fullName;
    if (payload.phoneNumber) syncPayload.phoneNumber = payload.phoneNumber;

    if (Object.keys(syncPayload).length > 0) {
      const { UserRepository } = await import("../user/user.repository");
      const userRepository = new UserRepository();
      await userRepository.updateById(userId, syncPayload);
      logger.info({ userId }, "Profile synced to User model");
    }

    const updatedRenter = await this.repository.findByUserId(userId);

    this.schedulePreMarketConsolidatedExcelRefresh(
      { userId },
      "Error updating pre-market consolidated Excel after renter profile update",
    );

    return this.toRenterResponse(updatedRenter || renter);
  }

  async deleteRenterProfile(userId: string): Promise<{ message: string }> {
    const renter = await this.repository.findByUserId(userId);
    if (!renter) {
      throw new NotFoundException("Renter profile not found");
    }

    await this.preMarketService.deleteRequestsByRenterId(userId);

    const renterUser =
      renter.userId && typeof renter.userId === "object"
        ? (renter.userId as { fullName?: string; email?: string })
        : null;
    const renterEmail = renterUser?.email || renter.email;
    const renterName = renterUser?.fullName || renter.fullName || renterEmail;

    const { UserRepository } = await import("../user/user.repository");
    const userRepository = new UserRepository();
    await this.repository.permanentlyDeleteRenter(userId);
    await userRepository.permanentlyDeleteUser(userId);

    logger.info({ userId }, "Renter profile and user account deleted");

    this.schedulePreMarketConsolidatedExcelRefresh(
      { userId },
      "Error updating pre-market consolidated Excel after renter deletion",
    );

    if (renterEmail) {
      try {
        const emailResult =
          await this.emailService.sendRenterAccountDeletedEmail({
            to: renterEmail,
            userName: renterName,
          });

        if (!emailResult.success) {
          logger.warn(
            { userId, email: renterEmail, error: emailResult.error },
            "Account deletion email failed to send",
          );
        }
      } catch (error) {
        logger.error(
          {
            userId,
            email: renterEmail,
            error: error instanceof Error ? error.message : String(error),
          },
          "Error sending account deletion email",
        );
      }
    }

    return { message: "Renter profile deleted successfully" };
  }

  async toggleEmailSubscription(
    userId: string
  ): Promise<{ emailSubscriptionEnabled: boolean }> {
    const renter = await this.repository.findByUserId(userId);
    if (!renter) {
      throw new NotFoundException("Renter profile not found");
    }

    const current = renter.emailSubscriptionEnabled !== false;
    const nextValue = !current;

    await this.repository.updateProfile(userId, {
      emailSubscriptionEnabled: nextValue,
    });

    return { emailSubscriptionEnabled: nextValue };
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
    // Handle populated userId - can be object or ObjectId
    const isUserIdPopulated =
      renter.userId && typeof renter.userId === "object" && renter.userId._id;
    const userIdValue = isUserIdPopulated
      ? renter.userId._id.toString()
      : renter.userId?.toString();

    // Build user info if userId is populated
    const userInfo = isUserIdPopulated
      ? {
          fullName: renter.userId.fullName,
          email: renter.userId.email,
          phoneNumber: renter.userId.phoneNumber,
          role: renter.userId.role,
          emailVerified: renter.userId.emailVerified,
          accountStatus: renter.userId.accountStatus,
          profileImageUrl: renter.userId.profileImageUrl,
        }
      : null;

    return {
      _id: renter._id.toString(),
      userId: userIdValue,
      registrationType: renter.registrationType,
      referredByAdminId: renter.referredByAdminId?.toString(),
      referredByAgentId: renter.referredByAgentId?.toString(),
      emailSubscriptionEnabled: renter.emailSubscriptionEnabled !== false,
      questionnaire: renter.questionnaire,
      createdAt: renter.createdAt,
      updatedAt: renter.updatedAt,
      ...(userInfo && { userInfo }),
    };
  }

  private async validateAndGetAgentFromReferralCode(
    code: string
  ): Promise<string> {
    const referrer = await this.referralService.validateReferralCode(code);
    return referrer._id.toString();
  }

  private async validateAndGetAdminFromReferralCode(
    code: string
  ): Promise<string> {
    const referrer = await this.referralService.validateReferralCode(code);
    return referrer._id.toString();
  }

  private async getDefaultAssignedAgentId(): Promise<string> {
    const defaultAgent = await this.userService.getUserByEmail(
      SYSTEM_DEFAULT_AGENT.email
    );

    if (!defaultAgent || defaultAgent.role !== ROLES.AGENT) {
      throw new NotFoundException(
        "Default assigned agent is not configured. Please contact support."
      );
    }

    return defaultAgent._id.toString();
  }

  private async getAssignedAgentWelcomeDetails(agentId: string): Promise<{
    fullName: string;
    title: string;
    brokerage: string;
    email: string;
  }> {
    const fallbackAgent = {
      fullName: SYSTEM_DEFAULT_AGENT.fullName,
      title: SYSTEM_DEFAULT_AGENT.title,
      brokerage: SYSTEM_DEFAULT_AGENT.brokerageName,
      email: SYSTEM_DEFAULT_AGENT.email,
    };

    try {
      const agent = await new AgentProfileRepository().findByUserId(agentId);
      const agentUser = await this.userService.getById(agentId);
      const populatedUser =
        agent?.userId && typeof agent.userId === "object"
          ? (agent.userId as { fullName?: string; email?: string })
          : null;

      return {
        fullName: populatedUser?.fullName || fallbackAgent.fullName,
        title: agent?.title || fallbackAgent.title,
        brokerage: agent?.brokerageName || fallbackAgent.brokerage,
        email: populatedUser?.email || agentUser?.email || fallbackAgent.email,
      };
    } catch (error) {
      logger.warn(
        {
          agentId,
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to resolve assigned agent details for renter welcome email"
      );

      return fallbackAgent;
    }
  }

  private formatEasternTime(date: Date): string {
    return date.toLocaleString("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
  }

  private schedulePreMarketConsolidatedExcelRefresh(
    context: Record<string, unknown>,
    message: string
  ): void {
    this.preMarketService.refreshConsolidatedExcel().catch((error) => {
      logger.error({ error, ...context }, message);
    });
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
              activationLink: agent.activationLink || null,
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

  async getRenterDetailsForAdmin(renterId: string): Promise<any> {
    const renter = await this.repository.findByIdWithReferralInfo(renterId);

    if (!renter) {
      throw new NotFoundException("Renter not found");
    }

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
          activationLink: agent.activationLink || null,
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

    const profileImageUrl =
      renter.userId && typeof renter.userId === "object"
        ? (renter.userId as any).profileImageUrl
        : undefined;

    const preMarketListings = listings.map((listing: any) => ({
      _id: listing._id,
      requestId: listing.requestId,
      requestName: listing.requestName,
      isActive: listing.isActive,
      status: listing.status,
      priceRange: listing.priceRange,
      locations: listing.locations,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      movingDateRange: listing.movingDateRange,
      preferences: listing.preferences,
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
      profileImage: profileImageUrl,
      // emailVerified: renter.,
      referralInfo,
      preMarketListings,
      createdAt: renter.createdAt,
    };
  }

  async getRenterListings(
    renterId: string,
    includeInactive: boolean = true
  ): Promise<any[]> {
    return new PreMarketRepository().findByRenterIdAll(
      renterId,
      includeInactive
    );
  }

  async updateRenterConsolidatedExcel(): Promise<void> {
    try {
      const buffer = await this.excelService.generateConsolidatedRenterExcel();

      const { url, fileName } =
        await this.excelService.uploadConsolidatedRenterExcel(buffer);

      const totalRenters = await this.repository.count();

      const previousMetadata = await this.repository.getExcelMetadata();
      const version = (previousMetadata?.version || 0) + 1;

      await this.repository.updateExcelMetadata({
        type: "renters_data",
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
    }
  }

  async getRentersConsolidatedExcel(): Promise<any> {
    const metadata = await this.repository.getExcelMetadata();

    if (!metadata) {
      throw new NotFoundException("No consolidated Excel file found");
    }

    return metadata;
  }
}
