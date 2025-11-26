// file: src/modules/auth/auth.service.ts

import { MESSAGES } from "@/constants/app.constants";
import { logger } from "@/middlewares/pino-logger";
import {
  BadRequestException,
  UnauthorizedException,
} from "@/utils/app-error.utils";
import { comparePassword, hashPassword } from "@/utils/password.utils";
import { EmailVerificationService } from "../email-verification/email-verification.service";
import {
  IResendOTPRequest,
  UserType,
} from "../email-verification/email-verification.types";
import { PasswordResetService } from "../password-reset/password-reset.service";
import type { IUser } from "../user/user.interface";
import { UserService } from "../user/user.service";
import type { AuthServiceResponse, LoginPayload } from "./auth.type";
import { AuthUtil } from "./auth.utils";

/**
 * Auth Service (SIMPLIFIED & SECURE)
 * ONLY handles: Login, Email Verification, Password Reset, Token Refresh
 *
 * Registration moved to:
 * - Agent: POST /agent/register (AgentService)
 * - Renter: POST /renter/register (RenterService)
 */
export class AuthService {
  private userService: UserService;
  private passwordResetService: PasswordResetService;
  private emailVerificationService: EmailVerificationService;

  constructor() {
    this.userService = new UserService();
    this.passwordResetService = new PasswordResetService();
    this.emailVerificationService = new EmailVerificationService();
  }

  // ============================================
  // REMOVED: register() method
  // ============================================
  // Registration now handled by:
  // - AgentService.registerAgent()
  // - RenterService.registerRenter()

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

    // Check account status
    if (user.accountStatus === "suspended") {
      throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_SUSPENDED);
    }
    if (user.accountStatus === "inactive") {
      throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_INACTIVE);
    }

    // Check email verification
    if (!user.emailVerified) {
      throw new UnauthorizedException(MESSAGES.AUTH.EMAIL_NOT_VERIFIED);
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

    return {
      user: this.userService.toUserResponse(user),
      tokens,
      mustChangePassword: user.mustChangePassword || false,
    };
  }

  /**
   * Verify email
   */
  async verifyEmail(email: string, code: string): Promise<{ message: string }> {
    const result = await this.emailVerificationService.verifyOTP({
      email,
      code,
    });

    await this.userService.markEmailAsVerified(result.userId);

    logger.info(
      { userId: result.userId, userType: result.userType },
      "Email verified and user marked"
    );

    return { message: MESSAGES.AUTH.EMAIL_VERIFIED_SUCCESS };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.userService.getUserByEmail(email);

    if (!user) {
      // Don't reveal if email exists for security
      return { message: MESSAGES.AUTH.PASSWORD_RESET_OTP_SENT };
    }

    const otp = AuthUtil.generateOTP();
    const expiresAt = AuthUtil.getOTPExpirationTime();

    await this.passwordResetService.createOTP(
      user._id.toString(),
      otp,
      expiresAt
    );

    await emailService.sendPasswordResetOTP(user.fullName, user.email, otp);

    return { message: MESSAGES.AUTH.PASSWORD_RESET_OTP_SENT };
  }

  /**
   * Verify OTP
   * ✅ SIMPLIFIED: Delegate to PasswordResetService
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
   * Reset password
   * ✅ SIMPLIFIED: Use verifyOTP method
   */
  async resetPassword(
    email: string,
    otp: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const user = await this.userService.getUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    await this.passwordResetService.verifyOTP(user._id.toString(), otp);

    const hashedPassword = await hashPassword(newPassword);

    await this.userService.updatePassword(user._id.toString(), hashedPassword);

    const passwordReset = await this.passwordResetService.findActiveOTP(
      user._id.toString()
    );

    if (passwordReset) {
      await this.passwordResetService.markAsUsed(passwordReset._id.toString());
    }

    await this.passwordResetService.deleteUserOTPs(user._id.toString());

    return { message: MESSAGES.AUTH.PASSWORD_RESET_SUCCESS };
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

      if (
        user.accountStatus === "suspended" ||
        user.accountStatus === "inactive"
      ) {
        throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_SUSPENDED);
      }

      const accessToken = AuthUtil.generateAccessToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
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
   * ✅ UPDATED: Resend OTP instead of token link
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
}
