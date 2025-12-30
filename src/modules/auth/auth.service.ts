// file: src/modules/auth/auth.service.ts

import { MESSAGES, ROLES } from "@/constants/app.constants";
import { env } from "@/env";
import { logger } from "@/middlewares/pino-logger";
import { EmailService } from "@/services/email.service";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@/utils/app-error.utils";
import { comparePassword, hashPassword } from "@/utils/password.utils";
import { EmailVerificationService } from "../email-verification/email-verification.service";
import {
  IResendOTPRequest,
  UserType,
} from "../email-verification/email-verification.types";
import { PasswordResetService } from "../password/password.service";
import { AgentProfileRepository } from "../agent/agent.repository";
import type { IUser } from "../user/user.interface";
import { UserService } from "../user/user.service";
import type {
  AuthServiceResponse,
  LoginPayload,
  ReferralInfo,
  VerifyEmailPayload,
} from "./auth.type";
import { RenterRepository } from "../renter/renter.repository";
import { AuthUtil } from "./auth.utils";

export class AuthService {
  private userService: UserService;
  private passwordResetService: PasswordResetService;
  private emailVerificationService: EmailVerificationService;
  private emailService: EmailService;
  private renterRepository: RenterRepository;

  constructor() {
    this.userService = new UserService();
    this.passwordResetService = new PasswordResetService();
    this.emailService = new EmailService();
    this.emailVerificationService = new EmailVerificationService();
    this.renterRepository = new RenterRepository();
  }

  /**
   * Login user (All roles: Admin, Agent, Renter)
   */
  async login(payload: LoginPayload): Promise<AuthServiceResponse> {
    const user = await this.userService.getUserByEmailWithPassword(
      payload.email
    );

    if (!user) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    if (user.accountStatus === "inactive") {
      throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_INACTIVE);
    }

    if (user.role === ROLES.AGENT) {
      const agentRepository = new AgentProfileRepository();
      const agentProfile = await agentRepository.findByUserId(user._id);
      if (!agentProfile || agentProfile.isActive === false) {
        throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_INACTIVE);
      }
    }

    // Verify password
    if (!user.password) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    const isPasswordValid = await comparePassword(
      payload.password,
      user.password
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    // Update last login
    await this.userService.updateLastLogin(user._id.toString());

    // Generate tokens
    const tokens = this.generateTokens(user);

    let referralInfo: ReferralInfo | undefined;

    if (user.role === ROLES.RENTER) {
      const renter = await this.renterRepository.findRenterWithReferrer(
        user._id.toString()
      );

      if (renter?.registrationType === "agent_referral") {
        const referrer = renter.referredByAgentId as any;
        if (referrer) {
          referralInfo = {
            registrationType: "agent_referral",
            referrer: {
              id: referrer._id?.toString() ?? String(referrer),
              role: "Agent",
              fullName: referrer.fullName ?? null,
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

    return {
      user: this.userService.toUserResponse(user),
      tokens,
      mustChangePassword: user.mustChangePassword || false,
      ...(referralInfo ? { referralInfo } : {}),
    };
  }

  /**
   * Verify email
   */
  async verifyEmail(payload: VerifyEmailPayload): Promise<{ message: string }> {
    const result = await this.emailVerificationService.verifyOTP({
      email: payload.email,
      code: payload.code,
    });

    const user = await this.userService.getUserByEmail(payload.email);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    await this.userService.markEmailAsVerified(result.userId);

    logger.info(
      { userId: result.userId, userType: result.userType },
      "Email verified and user marked"
    );

    if (result.userType === ROLES.AGENT) {
      const { NotificationService } = await import(
        "../notification/notification.service"
      );
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
          "Failed to send agent approval notification"
        );
      }
    }

    await this.emailService.sendWelcomeEmail({
      to: user.email,
      userName: user.fullName,
      userType: result.userType,
      loginLink: `${env.CLIENT_URL}/login`,
      isPasswordAutoGenerated: user.passwordAutoGenerated,
      temporaryPassword: undefined,
    });

    return { message: MESSAGES.AUTH.EMAIL_VERIFIED_SUCCESS };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(
    email: string
  ): Promise<{ message: string; expiresAt?: Date; expiresInMinutes?: number }> {
    const user = await this.userService.getUserByEmail(email);

    if (!user) {
      return { message: MESSAGES.AUTH.PASSWORD_RESET_OTP_SENT };
    }

    // Step 2: Generate OTP using password reset service
    const result = await this.passwordResetService.requestPasswordReset(
      user._id.toString(),
      user.email,
      user.fullName
    );

    logger.info(
      { userId: user._id, email: user.email },
      "Password reset requested"
    );

    return result;
  }

  /**
   * Verify password reset OTP
   */
  async verifyPasswordOTP(
    email: string,
    otp: string
  ): Promise<{ message: string }> {
    // Step 1: Find user
    const user = await this.userService.getUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    // Step 2: Verify OTP
    const result = await this.passwordResetService.verifyOTP(
      user._id.toString(),
      otp
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
    newPassword: string
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
      user.email
    );

    logger.info(
      { userId: user._id, email },
      "Password reset successfully completed"
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
    email: string
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
      user.fullName
    );

    logger.info({ userId: user._id, email }, "Password reset OTP resent");

    return result;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    refreshToken: string
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
    request: Partial<IResendOTPRequest>
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
      "Verification code resend initiated"
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
        "User logged out"
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
    newPassword: string
  ): Promise<{ message: string }> {
    // Step 1: Get user by ID (including password field)
    const user = await this.userService.getUserByIdWithPassword(userId);

    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    // Step 2: Verify current password matches
    const isPasswordValid = await comparePassword(
      currentPassword,
      user.password!
    );

    if (!isPasswordValid) {
      logger.warn(
        { userId },
        "Invalid current password attempt for password change"
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
      new Date()
    );

    logger.info({ userId, email: user.email }, "Password changed successfully");

    return {
      message:
        "Password changed successfully. Please login again with your new password.",
    };
  }
}
