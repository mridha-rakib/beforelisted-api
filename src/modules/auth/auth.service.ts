// file: src/modules/auth/auth.service.ts

import { MESSAGES, ROLES } from "@/constants/app.constants";
import { env } from "@/env";
import { emailService } from "@/services/email.service";
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from "@/utils/app-error.utils";
import bcryptjs from "bcryptjs";
import { AgentProfileService } from "../agent/agent.service";
import { PasswordResetService } from "../password-reset/password-reset.service";
import { RenterProfileService } from "../renter/renter.service";
import type { IUser } from "../user/user.interface";
import { UserService } from "../user/user.service";
import type {
  AuthServiceResponse,
  LoginPayload,
  RegisterPayload,
} from "./auth.type";
import { AuthUtil } from "./auth.utils";

export class AuthService {
  private userService: UserService;
  private agentProfileService: AgentProfileService;
  private renterProfileService: RenterProfileService;
  private passwordResetService: PasswordResetService;

  constructor() {
    this.userService = new UserService();
    this.agentProfileService = new AgentProfileService();
    this.renterProfileService = new RenterProfileService();
    this.passwordResetService = new PasswordResetService();
  }

  /**
   * Register new user (Agent or Renter)
   */
  async register(payload: RegisterPayload): Promise<AuthServiceResponse> {
    // Check if email already exists
    const existingUser = await this.userService.getUserByEmail(payload.email);
    if (existingUser) {
      throw new ConflictException(MESSAGES.AUTH.EMAIL_ALREADY_EXISTS);
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(
      payload.password,
      env.SALT_ROUNDS
    );

    // Create user
    const user = await this.userService.create({
      email: payload.email,
      password: hashedPassword,
      fullName: payload.fullName,
      phoneNumber: payload.phoneNumber,
      role: payload.role,
      emailVerified: false,
      accountStatus: "pending",
    });

    // Generate email verification token
    const verificationToken = AuthUtil.generateEmailVerificationToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Update user with verification token
    await this.userService.updateVerificationToken(user._id.toString(), {
      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt: expiresAt,
    });

    // Create role-specific profile
    if (payload.role === ROLES.AGENT) {
      await this.agentProfileService.createAgentProfile(user._id.toString(), {
        licenseNumber: payload.licenseNumber!,
        brokerageName: payload.brokerageName!,
      });
    } else if (payload.role === ROLES.RENTER) {
      await this.renterProfileService.createRenterProfile(user._id.toString());
    }

    // Generate verification link
    const verificationLink = AuthUtil.generateVerificationLink(
      env.CLIENT_URL,
      verificationToken
    );

    // Send verification email
    await emailService.sendEmailVerification(
      payload.email,
      payload.fullName,
      verificationLink
    );

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      user: this.userService.getUserResponse(user),
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(payload: LoginPayload): Promise<AuthServiceResponse> {
    // Find user with password
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
    const isPasswordValid = await bcryptjs.compare(
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
      user: this.userService.getUserResponse(user),
      tokens,
    };
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    // Find user with verification token
    const user = await this.userService.getUserByVerificationToken(token);
    if (!user) {
      throw new BadRequestException("Invalid verification token");
    }

    // Check token expiration
    if (
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw new BadRequestException("Verification token expired");
    }

    // Mark email as verified
    await this.userService.markEmailAsVerified(user._id.toString());

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

    // Generate OTP
    const otp = AuthUtil.generateOTP();
    const expiresAt = AuthUtil.getOTPExpirationTime();

    // Save OTP
    await this.passwordResetService.createOTP(
      user._id.toString(),
      otp,
      expiresAt
    );

    // Send OTP email
    await emailService.sendPasswordResetOTP(user.fullName, user.email, otp);

    return { message: MESSAGES.AUTH.PASSWORD_RESET_OTP_SENT };
  }

  /**
   * Verify OTP
   */
  async verifyOTP(email: string, otp: string): Promise<{ message: string }> {
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    // Find active OTP
    const passwordReset = await this.passwordResetService.findActiveOTP(
      user._id.toString()
    );
    if (!passwordReset) {
      throw new BadRequestException(MESSAGES.AUTH.OTP_EXPIRED);
    }

    // Check OTP attempts
    if (passwordReset.attempts >= passwordReset.maxAttempts) {
      throw new BadRequestException(MESSAGES.AUTH.OTP_MAX_ATTEMPTS);
    }

    // Verify OTP
    if (passwordReset.otp !== otp) {
      await this.passwordResetService.incrementAttempts(
        passwordReset._id.toString()
      );
      throw new BadRequestException(MESSAGES.AUTH.INVALID_OTP);
    }

    return { message: "OTP verified successfully" };
  }

  /**
   * Reset password
   */
  async resetPassword(
    email: string,
    otp: string,
    newPassword: string
  ): Promise<{ message: string }> {
    // Verify OTP first
    await this.verifyOTP(email, otp);

    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    // Hash new password
    const hashedPassword = await bcryptjs.hash(newPassword, env.SALT_ROUNDS);

    // Update password
    await this.userService.updatePassword(user._id.toString(), hashedPassword);

    // Mark OTP as used
    const passwordReset = await this.passwordResetService.findActiveOTP(
      user._id.toString()
    );
    if (passwordReset) {
      await this.passwordResetService.markAsUsed(passwordReset._id.toString());
    }

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
}
