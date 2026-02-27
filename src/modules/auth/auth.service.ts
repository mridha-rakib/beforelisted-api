// file: src/modules/auth/auth.service.ts

import {
  MESSAGES,
  ROLES,
  SYSTEM_DEFAULT_AGENT,
} from "@/constants/app.constants";
import { env } from "@/env";
import { logger } from "@/middlewares/pino-logger";
import { EmailService } from "@/services/email.service";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@/utils/app-error.utils";
import { comparePassword, hashPassword } from "@/utils/password.utils";
import type { IAgentProfile } from "../agent/agent.interface";
import { AgentProfileRepository } from "../agent/agent.repository";
import type { AgentProfileResponse } from "../agent/agent.type";
import { EmailVerificationService } from "../email-verification/email-verification.service";
import {
  IResendOTPRequest,
  UserType,
} from "../email-verification/email-verification.types";
import { PasswordResetService } from "../password/password.service";
import { ReferralService } from "../referral/referral.service";
import { RenterRepository } from "../renter/renter.repository";
import type { IUser } from "../user/user.interface";
import { UserService } from "../user/user.service";
import type { UserResponse } from "../user/user.type";
import type {
  AuthServiceResponse,
  LoginPayload,
  ReferralInfo,
  VerifyEmailPayload,
} from "./auth.type";
import { AuthUtil } from "./auth.utils";

export class AuthService {
  private userService: UserService;
  private passwordResetService: PasswordResetService;
  private emailVerificationService: EmailVerificationService;
  private emailService: EmailService;
  private renterRepository: RenterRepository;
  private referralService: ReferralService;

  constructor() {
    this.userService = new UserService();
    this.passwordResetService = new PasswordResetService();
    this.emailService = new EmailService();
    this.emailVerificationService = new EmailVerificationService();
    this.renterRepository = new RenterRepository();
    this.referralService = new ReferralService();
  }

  /**
   * Login user (All roles: Admin, Agent, Renter)
   */
  async login(payload: LoginPayload): Promise<AuthServiceResponse> {
    const user = await this.userService.getUserByEmailWithPassword(
      payload.email,
    );
    let agentProfile: AgentProfileResponse | undefined;

    if (!user) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    if (user.accountStatus === "inactive") {
      throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_INACTIVE);
    }

    if (
      (user.role === ROLES.AGENT || user.role === ROLES.RENTER) &&
      !user.emailVerified
    ) {
      throw new UnauthorizedException(MESSAGES.AUTH.EMAIL_NOT_VERIFIED);
    }

    if (user.role === ROLES.AGENT) {
      const agentRepository = new AgentProfileRepository();
      const profile = await agentRepository.findByUserId(user._id);
      if (!profile || profile.isActive === false) {
        throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_INACTIVE);
      }
      agentProfile = this.toAgentProfileResponse(profile);
    }

    // Verify password
    if (!user.password) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    const isPasswordValid = await comparePassword(
      payload.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    let referralInfo: ReferralInfo | undefined;

    if (user.role === ROLES.RENTER) {
      let renter = await this.renterRepository.findRenterWithReferrer(
        user._id.toString(),
      );

      if (!renter) {
        throw new NotFoundException("Renter profile not found");
      }

      const hasReferrer = Boolean(
        renter.referredByAgentId || renter.referredByAdminId,
      );

      if (!hasReferrer) {
        if (!payload.referralCode) {
          const defaultReferralAgent =
            await this.getDefaultReferralAgentForError();

          throw new UnauthorizedException(
            "No referral is associated with your account. Please provide a valid agent or admin referral code to continue.",
            undefined,
            { defaultReferralAgent },
          );
        }

        const referrer = await this.referralService.validateReferralCode(
          payload.referralCode,
        );

        const registrationType =
          referrer.role === ROLES.ADMIN ? "admin_referral" : "agent_referral";

        await this.renterRepository.assignReferralByUserId(
          user._id.toString(),
          {
            registrationType,
            referrerId: referrer._id.toString(),
          },
        );
        await this.referralService.recordReferral(referrer._id.toString());

        logger.info(
          {
            renterUserId: user._id.toString(),
            referrerId: referrer._id.toString(),
            registrationType,
          },
          "Renter referral was reassigned during login",
        );

        renter = await this.renterRepository.findRenterWithReferrer(
          user._id.toString(),
        );
        if (!renter) {
          throw new NotFoundException("Renter profile not found");
        }
      } else if (payload.referralCode) {
        const currentReferrer =
          renter.registrationType === "agent_referral"
            ? (renter.referredByAgentId as any)
            : renter.registrationType === "admin_referral"
              ? (renter.referredByAdminId as any)
              : null;
        const currentReferralCode =
          currentReferrer && typeof currentReferrer === "object"
            ? currentReferrer.referralCode || null
            : null;

        if (
          !currentReferralCode ||
          currentReferralCode !== payload.referralCode
        ) {
          throw new BadRequestException(
            "Your account already has a referral. You cannot login with a different referral code.",
          );
        }
      }

      if (renter?.registrationType === "agent_referral") {
        const referrer = renter.referredByAgentId as any;
        if (referrer) {
          const referrerId =
            referrer?._id?.toString?.() ??
            (typeof referrer === "string" ? referrer : null);
          let referrerTitle: string | null = null;
          let referrerBrokerageName: string | null = null;

          if (referrerId) {
            const agentRepository = new AgentProfileRepository();
            const agentProfile = await agentRepository.findByUserId(referrerId);
            referrerTitle = agentProfile?.title ?? null;
            referrerBrokerageName = agentProfile?.brokerageName ?? null;
          }

          referralInfo = {
            registrationType: "agent_referral",
            referrer: {
              id: referrerId ?? String(referrer),
              role: "Agent",
              fullName: referrer.fullName ?? null,
              title: referrerTitle,
              brokerageName: referrerBrokerageName,
              email: referrer.email ?? null,
              phoneNumber: referrer.phoneNumber ?? null,
              referralCode: referrer.referralCode ?? null,
            },
          };
        }
      } else if (renter?.registrationType === "admin_referral") {
        const referrer = renter.referredByAdminId as any;
        if (referrer) {
          referralInfo = {
            registrationType: "admin_referral",
            referrer: {
              id: referrer._id?.toString() ?? String(referrer),
              role: "Admin",
              fullName: referrer.fullName ?? null,
              email: referrer.email ?? null,
              phoneNumber: referrer.phoneNumber ?? null,
              referralCode: referrer.referralCode ?? null,
            },
          };
        }
      }
    }

    // Update last login only after all renter-specific access checks pass
    await this.userService.updateLastLogin(user._id.toString());

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      user: this.userService.toUserResponse(user),
      tokens,
      mustChangePassword: user.mustChangePassword || false,
      ...(user.role === ROLES.AGENT
        ? {
            title: agentProfile?.title ?? null,
            loginLink: `${env.CLIENT_URL}/login`,
          }
        : {}),
      ...(agentProfile ? { agentProfile } : {}),
      ...(referralInfo ? { referralInfo } : {}),
    };
  }

  /**
   * Verify email
   */
  async verifyEmail(payload: VerifyEmailPayload): Promise<{
    message: string;
    user: UserResponse;
    role: string;
    title?: string | null;
  }> {
    const result = await this.emailVerificationService.verifyOTP({
      email: payload.email,
      code: payload.code,
    });

    const user = await this.userService.getUserByEmail(payload.email);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    const updatedUser =
      (await this.userService.markEmailAsVerified(result.userId)) || user;
    const userResponse = this.userService.toUserResponse(updatedUser);
    let agentTitle: string | null = null;
    let renterRegisteredAgent:
      | {
          fullName?: string;
          title?: string;
          brokerage?: string;
        }
      | undefined;

    logger.info(
      { userId: result.userId, userType: result.userType },
      "Email verified and user marked",
    );

    if (result.userType === ROLES.AGENT) {
      const agentRepository = new AgentProfileRepository();
      const agentProfile = await agentRepository.findByUserId(user._id);
      agentTitle = agentProfile?.title ?? null;

      const { NotificationService } =
        await import("../notification/notification.service");
      const notificationService = new NotificationService();

      try {
        await notificationService.notifyAdminsAgentPendingApproval({
          agentId: user._id.toString(),
          agentEmail: user.email,
          agentName: user.fullName,
          licenseNumber: user.referralCode || "N/A",
        });
      } catch (error) {
        logger.error(
          { error, userId: user._id },
          "Failed to send agent approval notification",
        );
      }

      const adminEmail = env.ADMIN_EMAIL;
      if (!adminEmail) {
        logger.warn("ADMIN_EMAIL not configured in environment");
      } else {
        const nameParts = user.fullName?.trim().split(/\s+/).filter(Boolean);
        const agentFirstName = nameParts?.[0] || user.fullName || "Agent";
        const agentLastName = nameParts?.slice(1).join(" ") || "";
        const registrationDate = this.formatEasternTime(
          user.createdAt ? new Date(user.createdAt) : new Date(),
        );
        const agentTitleForAdminEmail = agentProfile?.title || "N/A";
        const agentBrokerageForAdminEmail =
          agentProfile?.brokerageName || "N/A";
        const agentPhoneNumber = user.phoneNumber || "N/A";
        const agentRegistrationLink = user.referralCode
          ? `${env.CLIENT_URL}/signup/renter?ref=${encodeURIComponent(user.referralCode)}`
          : "N/A";

        try {
          await this.emailService.sendAgentRegistrationVerifiedAdminNotification(
            {
              to: adminEmail,
              agentFirstName,
              agentLastName,
              agentTitle: agentTitleForAdminEmail,
              agentBrokerage: agentBrokerageForAdminEmail,
              agentEmail: user.email,
              agentPhoneNumber,
              registrationDate,
              agentRegistrationLink,
            },
          );
        } catch (error) {
          logger.error(
            { error, userId: user._id },
            "Failed to send agent registration verified email to admin",
          );
        }
      }
    }

    if (result.userType === ROLES.RENTER) {
      try {
        const renter = await this.renterRepository.findRenterWithReferrer(
          user._id.toString(),
        );

        const referredAgent = renter?.referredByAgentId as any;
        const referredAgentId =
          referredAgent?._id?.toString?.() ??
          (typeof renter?.referredByAgentId === "string"
            ? renter.referredByAgentId
            : null);

        if (referredAgentId) {
          const agentRepository = new AgentProfileRepository();
          const agentProfile =
            await agentRepository.findByUserId(referredAgentId);

          renterRegisteredAgent = {
            fullName: referredAgent?.fullName || "Your Registered Agent",
            title: agentProfile?.title || "Licensed Real Estate Agent",
            brokerage: agentProfile?.brokerageName || "BeforeListed",
          };
        }
      } catch (error) {
        logger.warn(
          { error, userId: user._id },
          "Failed to resolve renter referral and registered agent details",
        );
      }

      const adminEmail = env.ADMIN_EMAIL;
      if (!adminEmail) {
        logger.warn("ADMIN_EMAIL not configured in environment");
      } else {
        const nameParts = user.fullName?.trim().split(/\s+/).filter(Boolean);
        const renterFirstName = nameParts?.[0] || user.fullName || "Renter";
        const renterLastName = nameParts?.slice(1).join(" ") || "";
        const registrationDate = this.formatEasternTime(
          user.createdAt ? new Date(user.createdAt) : new Date(),
        );

        try {
          await this.emailService.sendRenterRegistrationVerifiedAdminNotification(
            {
              to: adminEmail,
              renterName:
                user.fullName || `${renterFirstName} ${renterLastName}`.trim(),
              renterPhone: user.phoneNumber || "N/A",
              renterEmail: user.email,
              registrationDate,
              registeredAgentName: renterRegisteredAgent?.fullName || "N/A",
              registeredAgentBrokerage:
                renterRegisteredAgent?.brokerage || "N/A",
            },
          );
        } catch (error) {
          logger.error(
            { error, userId: user._id },
            "Failed to send renter registration verified email to admin",
          );
        }
      }
    }

    await this.emailService.sendWelcomeEmail({
      to: user.email,
      userName: user.fullName,
      userType: result.userType,
      loginLink: `${env.CLIENT_URL}/login`,
      isPasswordAutoGenerated: user.passwordAutoGenerated,
      temporaryPassword: undefined,
      registeredAgent:
        result.userType === ROLES.RENTER ? renterRegisteredAgent : undefined,
    });

    return {
      message: MESSAGES.AUTH.EMAIL_VERIFIED_SUCCESS,
      user: userResponse,
      role: userResponse.role,
      ...(userResponse.role === ROLES.AGENT ? { title: agentTitle } : {}),
    };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(
    email: string,
  ): Promise<{ message: string; expiresAt?: Date; expiresInMinutes?: number }> {
    const user = await this.userService.getUserByEmail(email);

    if (!user) {
      return { message: MESSAGES.AUTH.PASSWORD_RESET_OTP_SENT };
    }

    // Step 2: Generate OTP using password reset service
    const result = await this.passwordResetService.requestPasswordReset(
      user._id.toString(),
      user.email,
      user.fullName,
    );

    logger.info(
      { userId: user._id, email: user.email },
      "Password reset requested",
    );

    return result;
  }

  /**
   * Verify password reset OTP
   */
  async verifyPasswordOTP(
    email: string,
    otp: string,
  ): Promise<{ message: string }> {
    // Step 1: Find user
    const user = await this.userService.getUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    // Step 2: Verify OTP
    const result = await this.passwordResetService.verifyOTP(
      user._id.toString(),
      otp,
    );

    logger.info({ userId: user._id, email }, "Password reset OTP verified");

    return result;
  }

  /**
   * Verify OTP
   */
  async verifyOTP(email: string, otp: string): Promise<{ message: string }> {
    const user = await this.userService.getUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    // ✅ FIXED: Use PasswordResetService.verifyOTP() which handles all logic
    return this.passwordResetService.verifyOTP(user._id.toString(), otp);
  }

  /**
   * Reset password with OTP
   */
  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Step 1: Find user
    const user = await this.userService.getUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    // Step 2: Verify OTP again (double check)
    await this.passwordResetService.verifyOTP(user._id.toString(), otp);

    // Step 3: Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Step 4: Update user password
    await this.userService.updatePassword(user._id.toString(), hashedPassword);

    // Step 5: Mark OTP as used
    await this.passwordResetService.markOTPAsUsed(user._id.toString());

    // Step 6: Clean up all reset OTPs for this user
    await this.passwordResetService.deleteUserOTPs(user._id.toString());

    // Step 7: Send security notification email
    await this.emailService.sendPasswordResetConfirmation(
      user.fullName,
      user.email,
    );

    logger.info(
      { userId: user._id, email },
      "Password reset successfully completed",
    );

    // Step 8: Log out user from all devices (invalidate all tokens)
    // This is optional - you can skip if not implemented yet
    // await this.authTokenService.revokeAllTokensForUser(user._id.toString());

    return {
      message:
        "Password reset successfully. Please log in with your new password.",
    };
  }

  /**
   * Resend password reset OTP
   */
  async resendPasswordOTP(
    email: string,
  ): Promise<{ message: string; expiresAt?: Date; expiresInMinutes?: number }> {
    const user = await this.userService.getUserByEmail(email);

    if (!user) {
      return {
        message:
          "If an account exists, a password reset code will be sent to the email address",
      };
    }

    const result = await this.passwordResetService.requestPasswordReset(
      user._id.toString(),
      user.email,
      user.fullName,
    );

    logger.info({ userId: user._id, email }, "Password reset OTP resent");

    return result;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    try {
      const payload = AuthUtil.verifyRefreshToken(refreshToken);

      const user = await this.userService.getById(payload.userId);

      if (!user) {
        throw new UnauthorizedException(MESSAGES.AUTH.REFRESH_TOKEN_INVALID);
      }

      if (user.accountStatus !== "active") {
        throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_INACTIVE);
      }

      if (user.role === ROLES.AGENT) {
        const agentRepository = new AgentProfileRepository();
        const agentProfile = await agentRepository.findByUserId(user._id);
        if (!agentProfile || agentProfile.isActive === false) {
          throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_INACTIVE);
        }
      }

      const accessToken = AuthUtil.generateAccessToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        emailVerified: user.emailVerified,
      });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException(MESSAGES.AUTH.REFRESH_TOKEN_INVALID);
    }
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(user: IUser): {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  } {
    const accessToken = AuthUtil.generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
      emailVerified: user.emailVerified,
    });

    const refreshToken = AuthUtil.generateRefreshToken(user._id.toString());

    return {
      accessToken,
      refreshToken,
      expiresIn: "7d",
    };
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(
    request: Partial<IResendOTPRequest>,
  ): Promise<{ message: string }> {
    // Find user first
    const user = await this.userService.getUserByEmail(request.email!);

    if (!user) {
      return {
        message: "If an account exists, a verification code will be sent",
      };
    }

    if (user.emailVerified) {
      throw new BadRequestException("Email already verified");
    }

    // Step 3: Get userType (from request or user.role)
    const userType = (request.userType || user.role) as UserType;
    const userName = request.userName || user.fullName;

    // Step 4: Call email verification service to resend OTP
    const result = await this.emailVerificationService.resendOTP({
      email: request.email!,
      userType,
      userName,
    });

    logger.info(
      {
        email: request.email,
        userType,
        userId: user._id,
      },
      "Verification code resend initiated",
    );

    return { message: result.message };
  }

  /**
   * Logout user (clear tokens and sessions)
   *  Required by auth controller
   */
  async logout(token: string, userId: string): Promise<{ message: string }> {
    try {
      logger.info(
        { userId, token: token.substring(0, 20) + "..." },
        "User logged out",
      );

      // [TODO]:
      // Optional: Add token blacklist logic here if implemented
      // await this.authTokenService.revokeToken(token);

      return { message: "Logged out successfully" };
    } catch (error) {
      logger.error({ error, userId }, "Logout failed");
      throw new BadRequestException("Logout failed");
    }
  }

  /**
   * Change password for authenticated user
   */

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Step 1: Get user by ID (including password field)
    const user = await this.userService.getUserByIdWithPassword(userId);

    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    // Step 2: Verify current password matches
    const isPasswordValid = await comparePassword(
      currentPassword,
      user.password!,
    );

    if (!isPasswordValid) {
      logger.warn(
        { userId },
        "Invalid current password attempt for password change",
      );
      throw new UnauthorizedException("Current password is incorrect");
    }

    // Step 3: Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Step 4: Update user password in database
    await this.userService.updatePassword(userId, hashedPassword);

    // Step 5: Invalidate all refresh tokens (force re-login everywhere)
    await this.userService.invalidateAllRefreshTokens(userId);

    // Step 6: Send password change confirmation email
    await this.userService.notifyPasswordChange(
      user.email,
      user.fullName,
      new Date(),
    );

    logger.info({ userId, email: user.email }, "Password changed successfully");

    return {
      message:
        "Password changed successfully. Please login again with your new password.",
    };
  }

  private formatEasternTime(date: Date): string {
    return date.toLocaleString("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  private async getDefaultReferralAgentForError(): Promise<{
    id: string | null;
    role: "Agent";
    fullName: string | null;
    title: string | null;
    brokerageName: string | null;
    email: string | null;
    phoneNumber: string | null;
    referralCode: string | null;
    referralLink: string | null;
    loginLink: string | null;
  }> {
    const baseUrl = env.CLIENT_URL || "https://app.rentersedge.com";
    const buildReferralLink = (referralCode: string | null) =>
      referralCode
        ? `${baseUrl}/signup/renter?ref=${encodeURIComponent(referralCode)}`
        : null;
    const buildLoginLink = (referralCode: string | null) =>
      referralCode
        ? `${baseUrl}/signin?ref=${encodeURIComponent(referralCode)}`
        : null;

    const fallbackReferralCode = null;

    const fallback = {
      id: null,
      role: "Agent" as const,
      fullName: SYSTEM_DEFAULT_AGENT.fullName,
      title: SYSTEM_DEFAULT_AGENT.title,
      brokerageName: SYSTEM_DEFAULT_AGENT.brokerageName,
      email: SYSTEM_DEFAULT_AGENT.email,
      phoneNumber: SYSTEM_DEFAULT_AGENT.phoneNumber,
      referralCode: fallbackReferralCode,
      referralLink: buildReferralLink(fallbackReferralCode),
      loginLink: buildLoginLink(fallbackReferralCode),
    };

    try {
      const defaultAgentUser = await this.userService.getUserByEmail(
        SYSTEM_DEFAULT_AGENT.email,
      );

      if (!defaultAgentUser || defaultAgentUser.role !== ROLES.AGENT) {
        return fallback;
      }

      const agentRepository = new AgentProfileRepository();
      const defaultAgentProfile = await agentRepository.findByUserId(
        defaultAgentUser._id,
      );

      return {
        id: defaultAgentUser._id?.toString() ?? null,
        role: "Agent",
        fullName: defaultAgentUser.fullName || SYSTEM_DEFAULT_AGENT.fullName,
        title: defaultAgentProfile?.title || SYSTEM_DEFAULT_AGENT.title,
        brokerageName:
          defaultAgentProfile?.brokerageName ||
          SYSTEM_DEFAULT_AGENT.brokerageName,
        email: defaultAgentUser.email || SYSTEM_DEFAULT_AGENT.email,
        phoneNumber:
          defaultAgentUser.phoneNumber || SYSTEM_DEFAULT_AGENT.phoneNumber,
        referralCode: defaultAgentUser.referralCode || null,
        referralLink: buildReferralLink(defaultAgentUser.referralCode || null),
        loginLink: buildLoginLink(defaultAgentUser.referralCode || null),
      };
    } catch (error) {
      logger.warn(
        { error },
        "Failed to resolve default referral agent for no-referral login error",
      );
      return fallback;
    }
  }

  private toAgentProfileResponse(agent: IAgentProfile): AgentProfileResponse {
    return {
      _id: agent._id?.toString() ?? "",
      userInfo:
        agent.userId && (agent.userId as any)._id
          ? agent.userId
          : (agent.userId?.toString() ?? ""),
      licenseNumber: agent.licenseNumber,
      brokerageName: agent.brokerageName,
      title: agent.title,
      isActive: agent.isActive,
      activeAt: agent.activeAt,
      activationLink: agent.activationLink,
      totalRentersReferred: agent.totalRentersReferred,
      activeReferrals: agent.activeReferrals,
      emailSubscriptionEnabled: agent.emailSubscriptionEnabled !== false,
      acceptingRequests: agent.acceptingRequests !== false,
      acceptingRequestsToggledAt: agent.acceptingRequestsToggledAt,
      hasGrantAccess: agent.hasGrantAccess,
      lastAccessToggleAt: agent.lastAccessToggleAt,
      grantAccessCount: agent.grantAccessCount,
      totalMatches: agent.totalMatches,
      successfulMatches: agent.successfulMatches,
      profileImageUrl: (agent.userId as any)?.profileImageUrl ?? null,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }
}
