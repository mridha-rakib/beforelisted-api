// File: src/utils/referral-parser.utils.ts
/**
 * Referral Code Parser
 */

import { ROLES } from "@/constants/app.constants";
import { logger } from "@/middlewares/pino-logger";
// ============================================
// TYPES
// ============================================
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

/**
 * ReferralParser
 * ✅ Single Responsibility: Parse referral codes
 * ✅ Used by: RenterService, AgentService
 * ✅ No side effects - pure utility
 */

export class ReferralParser {
  private static readonly PREFIX_MAP: Record<ReferralPrefix, ReferralType> = {
    AGT: "agent_referral",
    ADM: "admin_referral",
  };

  private static readonly CODE_PATTERN = /^(AGT|ADM)-[A-Z0-9]{12}$/;
  private static readonly PREFIX_PATTERN = /^([A-Z]{3})-/;

  // ============================================
  // PUBLIC STATIC METHODS
  // ============================================

  /**
   * Parse referral code from query parameter
   * ✅ Returns typed ParsedReferral
   * ✅ Handles: undefined, invalid, valid codes
   *
   * @param referralCode - Query param value (undefined or string)
   * @returns ParsedReferral with type and validation status
   */
  static parse(referralCode?: string): ParsedReferral {
    // Case 1: No referral code provided
    if (!referralCode) {
      return {
        type: "normal",
        isValid: true,
      };
    }

    // Case 2: Try to extract prefix
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

    // Case 3: Valid prefix but invalid full format
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

    // Case 4: Valid referral code
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

  /**
   * Extract prefix from code (no validation)
   * ✅ Pure utility for prefix extraction
   *
   * @param code - Referral code
   * @returns Prefix or null
   */
  static extractPrefix(code: string): ReferralPrefix | null {
    const match = code.match(this.PREFIX_PATTERN);
    return (match?.[1] as ReferralPrefix) || null;
  }

  /**
   * Check if code is agent referral
   * ✅ Type guard for agent referrals
   *
   * @param referralCode - Code to check
   * @returns boolean
   */
  static isAgentReferral(referralCode?: string): boolean {
    if (!referralCode) return false;
    return this.parse(referralCode).type === "agent_referral";
  }

  /**
   * Check if code is admin referral (passwordless)
   * ✅ Type guard for admin referrals
   *
   * @param referralCode - Code to check
   * @returns boolean
   */
  static isAdminReferral(referralCode?: string): boolean {
    if (!referralCode) return false;
    return this.parse(referralCode).type === "admin_referral";
  }

  /**
   * Validate referral code format
   * ✅ Returns validation result with error details
   *
   * @param code - Code to validate
   * @returns ReferralValidationResult
   */
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
        error: `Invalid referral code format. Expected: ${parsed.prefix}-[12 alphanumeric chars]`,
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
   * ✅ Human-readable type names
   *
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
   * ✅ Maps to ROLES constant
   *
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
