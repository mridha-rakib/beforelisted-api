// File: src/utils/referral-parser.utils.ts

import { ROLES } from "@/constants/app.constants";
import { logger } from "@/middlewares/pino-logger";

export type ReferralType = "normal" | "agent_referral" | "admin_referral";

export type ReferralPrefix = "AGT" | "ADM";

export interface ParsedReferral {
  type: ReferralType;
  code?: string;
  prefix?: ReferralPrefix;
  isValid: boolean;
}

export interface ReferralValidationResult {
  isValid: boolean;
  type: ReferralType;
  code?: string;
  prefix?: ReferralPrefix;
  error?: string;
}

// ============================================
// REFERRAL PARSER (REUSABLE)
// ============================================

export class ReferralParser {
  private static readonly PREFIX_MAP: Record<ReferralPrefix, ReferralType> = {
    AGT: "agent_referral",
    ADM: "admin_referral",
  };

  private static readonly CODE_PATTERN = /^(AGT|ADM)-[A-Z0-9]{8}$/;
  private static readonly PREFIX_PATTERN = /^([A-Z]{3})-/;

  static parse(referralCode?: string): ParsedReferral {
    if (!referralCode) {
      return {
        type: "normal",
        isValid: true,
      };
    }

    const prefixMatch = referralCode.match(this.PREFIX_PATTERN);
    if (!prefixMatch) {
      logger.warn({ code: referralCode }, "Invalid referral code format");
      return {
        type: "normal",
        code: referralCode,
        isValid: false,
      };
    }

    const prefix = prefixMatch[1] as ReferralPrefix;
    const registrationType = this.PREFIX_MAP[prefix];

    if (!this.CODE_PATTERN.test(referralCode)) {
      logger.warn(
        { code: referralCode, prefix },
        "Referral code failed format validation"
      );
      return {
        type: registrationType || "normal",
        code: referralCode,
        prefix,
        isValid: false,
      };
    }

    logger.debug(
      { code: referralCode, type: registrationType },
      "Referral code parsed successfully"
    );
    return {
      type: registrationType || "normal",
      code: referralCode,
      prefix,
      isValid: true,
    };
  }

  static extractPrefix(code: string): ReferralPrefix | null {
    const match = code.match(this.PREFIX_PATTERN);
    return (match?.[1] as ReferralPrefix) || null;
  }

  static isAgentReferral(referralCode?: string): boolean {
    if (!referralCode) return false;
    return this.parse(referralCode).type === "agent_referral";
  }

  static isAdminReferral(referralCode?: string): boolean {
    if (!referralCode) return false;
    return this.parse(referralCode).type === "admin_referral";
  }

  static validate(code?: string): ReferralValidationResult {
    const parsed = this.parse(code);

    // Normal registration is always valid (no code required)
    if (parsed.type === "normal" && !code) {
      return {
        isValid: true,
        type: "normal",
      };
    }

    // If code provided, must be valid format
    if (code && !parsed.isValid) {
      return {
        isValid: false,
        type: parsed.type,
        code,
        prefix: parsed.prefix,
        error: `Invalid referral code format. Expected: ${parsed.prefix}-[8 alphanumeric chars]`,
      };
    }

    return {
      isValid: true,
      type: parsed.type,
      code,
      prefix: parsed.prefix,
    };
  }

  /**
   * Get registration type name for logging/display
   * @param type - ReferralType
   * @returns Display name
   */
  static getTypeName(type: ReferralType): string {
    const names: Record<ReferralType, string> = {
      normal: "Normal Registration",
      agent_referral: "Agent Referral Registration",
      admin_referral: "Admin Passwordless Registration",
    };
    return names[type];
  }

  /**
   * Get role from referral code
   * @param code - Referral code
   * @returns ROLES.ADMIN | ROLES.AGENT | null
   */
  static getRoleFromCode(
    code?: string
  ): typeof ROLES.ADMIN | typeof ROLES.AGENT | null {
    if (!code) return null;
    const prefix = this.extractPrefix(code);
    if (prefix === "ADM") return ROLES.ADMIN;
    if (prefix === "AGT") return ROLES.AGENT;
    return null;
  }
}
