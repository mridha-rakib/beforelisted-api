// file: src/modules/referral/referral.service.ts

import { ROLES as RolesEnum } from "@/constants/app.constants";
import {
  BadRequestException,
  NotFoundException,
} from "@/utils/app-error.utils";
import { ReferralUtil } from "@/utils/referral.utils";
import type { IUser } from "../user/user.interface";
import { UserRepository } from "../user/user.repository";

/**
 * Referral Service
 * Handles all referral-related business logic
 * Follows Single Responsibility Principle
 */
export class ReferralService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Validate referral code and get referrer
   * @throws NotFoundException if code invalid
   * @throws BadRequestException if referrer can't refer
   */
  async validateReferralCode(referralCode: string): Promise<IUser> {
    // Validate format
    if (!ReferralUtil.isValidCodeFormat(referralCode)) {
      throw new BadRequestException(
        "Invalid referral code format  herer............"
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
      referrer.role !== RolesEnum.ADMIN &&
      referrer.role !== RolesEnum.AGENT
    ) {
      throw new BadRequestException("Invalid referrer role");
    }

    return referrer;
  }

  /**
   * Generate referral code for user (admin or agent)
   */
  async generateReferralCode(
    userId: string,
    role: typeof RolesEnum.ADMIN | typeof RolesEnum.AGENT
  ): Promise<string> {
    const prefix = role === RolesEnum.ADMIN ? "ADM" : "AGT";
    const referralCode =
      await this.userRepository.generateUniqueReferralCode(prefix);

    // Update user with referral code
    await this.userRepository.updateById(userId, { referralCode });

    return referralCode;
  }

  /**
   * Increment referral count for referrer
   */
  async recordReferral(referrerId: string): Promise<void> {
    await this.userRepository.incrementReferralCount(referrerId);
  }

  /**
   * Get referrer's referral statistics
   */
  async getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    referredUsers: IUser[];
    referralCode: string | null;
    referralLink: string | null;
  }> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const referredUsers = await this.userRepository.getReferredUsers(userId);

    return {
      totalReferrals: user.totalReferrals,
      referredUsers,
      referralCode: user.referralCode || null,
      referralLink: user.referralLink || null,
    };
  }

  /**
   * Extract referrer role from referral code
   */
  extractReferrerRole(
    referralCode: string
  ): typeof RolesEnum.ADMIN | typeof RolesEnum.AGENT | null {
    return ReferralUtil.extractRoleFromCode(referralCode);
  }
}
