// file: src/utils/referral.utils.ts

import { ROLES } from "@/constants/app.constants";
import crypto from "crypto";

/**
 * Referral code generation and validation
 */
export class ReferralUtil {
  private static readonly CODE_LENGTH = 8;
  private static readonly PREFIX = {
    [ROLES.ADMIN]: "ADM",
    [ROLES.AGENT]: "AGT",
  };

  static generateReferralCode(
    role: typeof ROLES.ADMIN | typeof ROLES.AGENT
  ): string {
    const prefix = this.PREFIX[role as keyof typeof this.PREFIX];
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const bytes = crypto.randomBytes(this.CODE_LENGTH);
    let randomPart = "";

    for (let i = 0; i < this.CODE_LENGTH; i += 1) {
      randomPart += alphabet[bytes[i] % alphabet.length];
    }
    return `${prefix}-${randomPart}`;
  }

  /**
   * Extract role from referral code
   */
  static extractRoleFromCode(
    code: string
  ): typeof ROLES.ADMIN | typeof ROLES.AGENT | null {
    if (code.startsWith("ADM-")) return ROLES.ADMIN;
    if (code.startsWith("AGT-")) return ROLES.AGENT;
    return null;
  }

  /**
   * Validate referral code format
   */
  static isValidCodeFormat(code: string): boolean {
    const pattern = /^(ADM|AGT)-[A-Z0-9]{8}$/;
    return pattern.test(code);
  }

  /**
   * Generate full referral link
   */
  static generateReferralLink(referralCode: string, baseUrl: string): string {
    return `${baseUrl}/signup?ref=${referralCode}`;
  }
}
