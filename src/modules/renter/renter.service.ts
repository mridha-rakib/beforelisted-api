// file: src/modules/renter/renter.service.ts

import { ROLES } from "@/constants/app.constants";
import { logger } from "@/middlewares/pino-logger";
import { EmailService } from "@/services/email.service";
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

import { ReferralService } from "../referral/referral.service";

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

  constructor() {
    this.repository = new RenterRepository();
    this.userService = new UserService();
    this.emailVerificationService = new EmailVerificationService();
    this.emailService = new EmailService();
    this.passwordResetService = new PasswordResetService();
    this.referralService = new ReferralService();
  }

  // REGISTRATION FLOWS (3 Types)

  /**
   * Register Renter (All Types)
   * Detects registration type and routes to appropriate flow
   * Supports: Normal, Agent Referral, Admin Referral
   */
  async registerRenter(payload: any): Promise<RenterRegistrationResponse> {
    // Detect registration type
    if (payload.referralCode) {
      const parsed = ReferralParser.parse(payload.referralCode);

      console.log("==================================");
      console.log(parsed);
      console.log("===========================================");

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
    // Step 1: Check if email already exists
    const existingUser = await this.userService.getUserByEmail(payload.email);
    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    // Step 2: Hash password
    const hashedPassword = await hashPassword(payload.password);

    // Step 3: Create User account
    const user = await this.userService.create({
      email: payload.email,
      password: hashedPassword,
      fullName: payload.fullName,
      phoneNumber: payload.phoneNumber,
      role: ROLES.RENTER,
      emailVerified: false,
      accountStatus: "pending",
    });

    // Step 4: Create OTP for email verification
    await this.emailVerificationService.createOTP({
      userId: user._id.toString(),
      email: user.email,
      userType: ROLES.RENTER,
      userName: user.fullName,
    });

    // Step 5: Create Renter profile
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
      user.role
    );

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
      user.role
    );
    return {
      user: this.userService.toUserResponse(user),
      renter: this.toRenterResponse(renterProfile),
      tokens,
      registrationType: "agent_referral",
    };
  }

  /**
   * 3️⃣ ADMIN REFERRAL RENTER REGISTRATION (PASSWORDLESS)
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

    // Step 3: Validate referral code in system and get admin ID
    const adminId = await this.validateAndGetAdminFromReferralCode(
      payload.referralCode
    );

    // Step 4: Generate random password
    const temporaryPassword = RenterUtil.generateAutoPassword().toString();
    const hashedPassword = await hashPassword(temporaryPassword);

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
      questionnaire: payload.questionnaire,
    });

    // STEP 8: RECORD REFERRAL - INCREMENT ADMIN'S TOTAL REFERRALS
    await this.referralService.recordReferral(adminId);

    // Step 9: Send email with temporary password
    await this.emailService.sendAdminReferralEmail({
      to: user.email,
      userName: user.fullName,
      temporaryPassword,
      loginLink: `${process.env.CLIENT_URL}/login`,
    });

    // Step 10: Generate JWT tokens
    const tokens = this.generateTokens(
      user._id.toString(),
      user.email,
      user.role
    );

    logger.info(
      {
        userId: user._id,
        email: user.email,
        registrationType: "admin_referral",
        adminId,
      },
      "Admin referral renter registration completed (passwordless)"
    );

    return {
      user: this.userService.toUserResponse(user),
      renter: this.toRenterResponse(renterProfile),
      tokens,
      registrationType: "admin_referral",
      temporaryPassword,
      mustChangePassword: true,
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
    console.log(
      "+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++"
    );
    console.log(renter);
    console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
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

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Generate JWT tokens
   */
  private generateTokens(
    userId: string,
    email: string,
    role: string
  ): { accessToken: string; refreshToken: string; expiresIn: string } {
    const accessToken = AuthUtil.generateAccessToken({
      userId,
      email,
      role,
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
}
