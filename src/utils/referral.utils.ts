// file: src/utils/referral.utils.ts

import { ROLES } from "@/constants/app.constants";
import crypto from "crypto";

/**
 * Referral code generation and validation
 */
export class ReferralUtil {
  private static readonly CODE_LENGTH = 12;
  private static readonly PREFIX = {
    [ROLES.ADMIN]: "ADM",
    [ROLES.AGENT]: "AGT",
  };

  /**
   * Generate unique referral code for admin or agent
   * Format: ADM-XXXXXXXXXXXX or AGT-XXXXXXXXXXXX
   */
  static generateReferralCode(role: ROLES.ADMIN | ROLES.AGENT): string {
    const prefix = this.PREFIX[role];
    const randomPart = crypto
      .randomBytes(this.CODE_LENGTH)
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, this.CODE_LENGTH)
      .toUpperCase();

    return `${prefix}-${randomPart}`;
  }

  /**
   * Extract role from referral code
   */
  static extractRoleFromCode(code: string): ROLES.ADMIN | ROLES.AGENT | null {
    if (code.startsWith("ADM-")) return ROLES.ADMIN;
    if (code.startsWith("AGT-")) return ROLES.AGENT;
    return null;
  }

  /**
   * Validate referral code format
   */
  static isValidCodeFormat(code: string): boolean {
    const pattern = /^(ADM|AGT)-[A-Z0-9]{12}$/;
    return pattern.test(code);
  }

  /**
   * Generate full referral link
   */
  static generateReferralLink(referralCode: string, baseUrl: string): string {
    return `${baseUrl}/register?ref=${referralCode}`;
  }
}
