// file: src/modules/referral/referral.service.ts

import { ROLES as RolesEnum } from "@/constants/app.constants";
import { ErrorCodeEnum } from "@/enums/error-code.enum";
import {
  BadRequestException,
  NotFoundException,
} from "@/utils/app-error.utils";
import { ReferralUtil } from "@/utils/referral.utils";

import type { IUser } from "../user/user.interface";

import { AgentProfileRepository } from "../agent/agent.repository";
import { UserRepository } from "../user/user.repository";

/**
 * Referral Service
 * Handles all referral-related business logic
 * Follows Single Responsibility Principle
 */
export class ReferralService {
  private userRepository: UserRepository;
  private agentRepository: AgentProfileRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.agentRepository = new AgentProfileRepository();
  }

  /**
   * Validates a referral code and returns the admin or agent who owns it.
   * Expects a formatted referral code from signup/login; the owner must exist and be allowed to refer.
   * Can fail when the code is malformed, missing from the database, deleted, the wrong role, or an inactive agent.
   */
  async validateReferralCode(referralCode: string): Promise<IUser> {
    // Validate format
    if (!ReferralUtil.isValidCodeFormat(referralCode)) {
      throw new BadRequestException(
        "Invalid referral code format  herer............",
      );
    }

    // Find user with this referral code
    const referrer = await this.userRepository.findByReferralCode(referralCode);

    if (!referrer) {
      throw new NotFoundException("Referral code not found");
    }

    // Check if referrer can still refer
    if (referrer.isDeleted) {
      throw new BadRequestException("Referral code is no longer valid");
    }

    // Verify referrer is admin or agent
    if (
      referrer.role !== RolesEnum.ADMIN
      && referrer.role !== RolesEnum.AGENT
    ) {
      throw new BadRequestException("Invalid referrer role");
    }

    if (referrer.role === RolesEnum.AGENT) {
      const agentProfile = await this.agentRepository.findByUserId(
        referrer._id.toString(),
      );

      if (!agentProfile || agentProfile.isActive === false) {
        throw new BadRequestException(
          "This agent referral link is no longer active",
          ErrorCodeEnum.REGISTRATION_LINK_INACTIVE,
        );
      }
    }

    return referrer;
  }

  /**
   * Creates and stores a unique referral code for an admin or agent user.
   * Expects an existing user ID and a role that can refer renters.
   * Can fail if the user update fails or the repository cannot allocate a unique code.
   */
  async generateReferralCode(
    userId: string,
    role: typeof RolesEnum.ADMIN | typeof RolesEnum.AGENT,
  ): Promise<string> {
    const prefix = role === RolesEnum.ADMIN ? "ADM" : "AGT";
    const referralCode
      = await this.userRepository.generateUniqueReferralCode(prefix);

    // Update user with referral code
    await this.userRepository.updateById(userId, { referralCode });

    return referralCode;
  }

  /**
   * Records that a valid referral link was used.
   * Expects a referrer user ID that has already passed validation.
   * Can fail if the referrer no longer exists or the counter update cannot be saved.
   */
  async recordReferral(referrerId: string): Promise<void> {
    await this.userRepository.incrementReferralCount(referrerId);
  }

  /**
   * Builds referral stats for dashboard display.
   * Expects a user ID for an admin or agent; returns their code, links, and referred users.
   * Can fail when the user is missing.
   */
  async getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    fullName: string | null;
    referredUsers: IUser[];
    referralCode: string | null;
    referralLink: string | null;
    loginLink: string | null;
  }> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const referredUsers = await this.userRepository.getReferredUsers(userId);

    return {
      totalReferrals: user.totalReferrals,
      fullName: user.fullName || null,
      referredUsers,
      referralCode: user.referralCode || null,
      referralLink: user.referralLink || null,
      loginLink: user.loginLink || null,
    };
  }

  /**
   * Maps a referral code prefix to the role that owns that code.
   * Expects a formatted code string; unsupported prefixes return null.
   * Can return null when callers pass a malformed or non-referral value.
   */
  extractReferrerRole(
    referralCode: string,
  ): typeof RolesEnum.ADMIN | typeof RolesEnum.AGENT | null {
    return ReferralUtil.extractRoleFromCode(referralCode);
  }
}
