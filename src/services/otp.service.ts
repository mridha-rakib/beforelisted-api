// file: src/services/otp.service.ts

/**
 * OTP Service (Injectable)
 */

import { logger } from "@/middlewares/pino-logger";

/**
 * OTP Configuration Interface
 */
export interface IOTPServiceConfig {
  length: number; // Default: 4 digits
  expiryMinutes: number; // Default: 10 minutes
  allowDuplicates: boolean; // Default: false
  trackingEnabled: boolean; // Enable duplicate prevention tracking
  maxTrackedOTPs: number; // Max OTPs to track per module
}

/**
 * OTP Generation Response
 */
export interface IOTPGenerationResponse {
  code: string;
  expiresAt: Date;
  expiresInSeconds: number;
  createdAt: Date;
  moduleKey?: string; // Which module requested this OTP
}

/**
 * OTP Validation Response
 */
export interface IOTPValidationResponse {
  isValid: boolean;
  message: string;
  isExpired?: boolean;
  remainingSeconds?: number;
  errorCode?: string; // For specific error handling
}

/**
 * OTP Service Class
 * Singleton service for OTP management
 * Implements dependency injection pattern
 */
export class OTPService {
  /**
   * Default configuration
   */
  private readonly DEFAULT_CONFIG: IOTPServiceConfig = {
    length: 4,
    expiryMinutes: 10,
    allowDuplicates: false,
    trackingEnabled: true,
    maxTrackedOTPs: 100,
  };

  /**
   * Instance configuration
   */
  private config: IOTPServiceConfig;

  /**
   * Track recently generated OTPs
   * Map<moduleKey, Set<otpCode>>
   * In production, migrate this to Redis or database
   */
  private recentOTPs: Map<string, Set<string>> = new Map();

  /**
   * Constructor with optional configuration
   * @param config - Optional custom configuration
   *
   * @example
   * // Default configuration
   * const otpService = new OTPService();
   *
   * @example
   * // Custom configuration
   * const otpService = new OTPService({
   *   length: 6,
   *   expiryMinutes: 5,
   *   allowDuplicates: false,
   * });
   */
  constructor(config?: Partial<IOTPServiceConfig>) {
    this.config = {
      ...this.DEFAULT_CONFIG,
      ...config,
    };

    // Validate configuration on initialization
    this.validateConfig();

    logger.info(
      {
        config: this.config,
      },
      "OTP Service initialized"
    );
  }

  /**
   * Generate 4-digit OTP (default)
   * Range: 1000-9999
   *
   * @param moduleKey - Unique key for the calling module (e.g., "EMAIL_VERIFICATION")
   * @param expiryOverride - Optional expiry time override (in minutes)
   * @returns Generated OTP with expiration details
   *
   * @example
   * // Email verification OTP
   * const otp = otpService.generate("EMAIL_VERIFICATION");
   *
   * @example
   * // Forgot password OTP with 5 minute expiry
   * const otp = otpService.generate("FORGOT_PASSWORD", 5);
   *
   * @throws Error if configuration is invalid
   */
  generate(
    moduleKey?: string,
    expiryOverride?: number
  ): IOTPGenerationResponse {
    try {
      const expiryMinutes = expiryOverride || this.config.expiryMinutes;

      // Validate expiry
      if (expiryMinutes < 1 || expiryMinutes > 1440) {
        throw new Error("Expiry time must be between 1 and 1440 minutes");
      }

      let otp: string;
      let attempts = 0;
      const maxAttempts = 100;

      // Generate OTP with duplicate prevention
      do {
        otp = this.generateRandomOTP(this.config.length);
        attempts++;

        // Skip duplicate check if duplicates allowed or tracking disabled
        if (
          this.config.allowDuplicates ||
          !this.config.trackingEnabled ||
          !moduleKey
        ) {
          break;
        }

        // Check if OTP was recently generated
        const recentSet = this.recentOTPs.get(moduleKey);
        if (!recentSet || !recentSet.has(otp)) {
          break;
        }
      } while (attempts < maxAttempts);

      // If we couldn't generate a unique OTP, log warning but proceed
      if (attempts >= maxAttempts) {
        logger.warn(
          {
            moduleKey,
            maxAttempts,
          },
          "OTP duplicate prevention failed after max attempts"
        );
      }

      // Track OTP if module key and tracking enabled
      if (moduleKey && this.config.trackingEnabled) {
        this.trackOTP(moduleKey, otp);
      }

      // Calculate expiration
      const createdAt = new Date();
      const expiresAt = new Date(
        createdAt.getTime() + expiryMinutes * 60 * 1000
      );
      const expiresInSeconds = expiryMinutes * 60;

      logger.debug(
        {
          moduleKey,
          length: this.config.length,
          expiryMinutes,
        },
        "OTP generated"
      );

      return {
        code: otp,
        expiresAt,
        expiresInSeconds,
        createdAt,
        moduleKey,
      };
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          moduleKey,
        },
        "Failed to generate OTP"
      );
      throw error;
    }
  }

  /**
   * Generate 6-digit OTP
   * Range: 100000-999999
   * Useful for SMS or higher security scenarios
   *
   * @param moduleKey - Unique module identifier
   * @param expiryOverride - Optional expiry override (in minutes)
   * @returns Generated 6-digit OTP
   *
   * @example
   * const otp = otpService.generate6Digit("SMS_2FA");
   */
  generate6Digit(
    moduleKey?: string,
    expiryOverride?: number
  ): IOTPGenerationResponse {
    const originalLength = this.config.length;
    try {
      this.config.length = 6;
      return this.generate(moduleKey, expiryOverride);
    } finally {
      this.config.length = originalLength;
    }
  }

  /**
   * Generate 8-digit OTP
   * Range: 10000000-99999999
   * Maximum security OTP
   *
   * @param moduleKey - Unique module identifier
   * @param expiryOverride - Optional expiry override (in minutes)
   * @returns Generated 8-digit OTP
   *
   * @example
   * const otp = otpService.generate8Digit("HIGH_SECURITY");
   */
  generate8Digit(
    moduleKey?: string,
    expiryOverride?: number
  ): IOTPGenerationResponse {
    const originalLength = this.config.length;
    try {
      this.config.length = 8;
      return this.generate(moduleKey, expiryOverride);
    } finally {
      this.config.length = originalLength;
    }
  }

  /**
   * Validate OTP
   * Checks format, range, and expiration
   *
   * @param otp - OTP code to validate
   * @param expiresAt - Expiration timestamp
   * @param expectedLength - Expected OTP length (default: config.length)
   * @returns Validation result with status and message
   *
   * @example
   * const result = otpService.validate("1234", expiresAt);
   * if (result.isValid) {
   *   console.log("OTP is valid");
   * } else {
   *   console.log(result.message); // "OTP has expired"
   * }
   *
   * @example
   * // Validate with specific length
   * const result = otpService.validate("123456", expiresAt, 6);
   */
  validate(
    otp: string,
    expiresAt: Date,
    expectedLength?: number
  ): IOTPValidationResponse {
    try {
      const length = expectedLength || this.config.length;

      // Check if OTP exists
      if (!otp || otp.trim() === "") {
        return {
          isValid: false,
          message: "OTP is required",
          errorCode: "OTP_MISSING",
        };
      }

      // Check format - must be numeric
      if (!/^\d+$/.test(otp)) {
        return {
          isValid: false,
          message: "OTP must contain only digits",
          errorCode: "OTP_INVALID_FORMAT",
        };
      }

      // Check length
      if (otp.length !== length) {
        return {
          isValid: false,
          message: `OTP must be ${length} digits`,
          errorCode: "OTP_INVALID_LENGTH",
        };
      }

      // Check value range (no leading zeros)
      const min = Math.pow(10, length - 1);
      const max = Math.pow(10, length) - 1;
      const otpNumber = parseInt(otp, 10);

      if (otpNumber < min || otpNumber > max) {
        return {
          isValid: false,
          message: `OTP must be between ${min} and ${max}`,
          errorCode: "OTP_OUT_OF_RANGE",
        };
      }

      // Check expiration
      const now = new Date();
      const isExpired = now > expiresAt;

      if (isExpired) {
        const expiredMinutesAgo = Math.floor(
          (now.getTime() - expiresAt.getTime()) / 60000
        );
        return {
          isValid: false,
          message: `OTP has expired ${expiredMinutesAgo} minutes ago`,
          isExpired: true,
          errorCode: "OTP_EXPIRED",
        };
      }

      // Calculate remaining time
      const remainingSeconds = Math.floor(
        (expiresAt.getTime() - now.getTime()) / 1000
      );

      return {
        isValid: true,
        message: "OTP is valid",
        isExpired: false,
        remainingSeconds,
      };
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        "Error validating OTP"
      );

      return {
        isValid: false,
        message: "OTP validation failed",
        errorCode: "OTP_VALIDATION_ERROR",
      };
    }
  }

  /**
   * Get remaining time for OTP in seconds
   *
   * @param expiresAt - Expiration timestamp
   * @returns Remaining seconds (0 if expired)
   *
   * @example
   * const remaining = otpService.getRemainingSeconds(expiresAt);
   * console.log(`OTP expires in ${remaining} seconds`);
   */
  getRemainingSeconds(expiresAt: Date): number {
    const now = new Date();
    const remaining = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
    return Math.max(0, remaining);
  }

  /**
   * Get remaining time for OTP in minutes
   *
   * @param expiresAt - Expiration timestamp
   * @returns Remaining minutes (0 if expired)
   *
   * @example
   * const remaining = otpService.getRemainingMinutes(expiresAt);
   * console.log(`OTP expires in ${remaining} minutes`);
   */
  getRemainingMinutes(expiresAt: Date): number {
    return Math.ceil(this.getRemainingSeconds(expiresAt) / 60);
  }

  /**
   * Check if OTP is expired
   *
   * @param expiresAt - Expiration timestamp
   * @returns true if expired, false if still valid
   *
   * @example
   * if (otpService.isExpired(expiresAt)) {
   *   console.log("Please request a new OTP");
   * }
   */
  isExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Clear tracked OTPs (for memory cleanup)
   * Call periodically in production (use Redis instead in distributed systems)
   *
   * @param moduleKey - Module key to clear, or undefined to clear all
   *
   * @example
   * // Clear OTPs for specific module
   * otpService.clearTrackedOTPs("EMAIL_VERIFICATION");
   *
   * @example
   * // Clear all tracked OTPs
   * otpService.clearTrackedOTPs();
   */
  clearTrackedOTPs(moduleKey?: string): void {
    try {
      if (moduleKey) {
        this.recentOTPs.delete(moduleKey);
        logger.debug({ moduleKey }, "Cleared tracked OTPs");
      } else {
        this.recentOTPs.clear();
        logger.debug("Cleared all tracked OTPs");
      }
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          moduleKey,
        },
        "Error clearing tracked OTPs"
      );
    }
  }

  /**
   * Get OTP service statistics and metrics
   *
   * @returns Statistics object
   *
   * @example
   * const stats = otpService.getStats();
   * console.log(stats);
   * // {
   * //   trackedModules: 3,
   * //   EMAIL_VERIFICATION: { count: 45 },
   * //   FORGOT_PASSWORD: { count: 12 },
   * //   totalTrackedOTPs: 57
   * // }
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {
      config: this.config,
      trackedModules: this.recentOTPs.size,
      totalTrackedOTPs: 0,
    };

    this.recentOTPs.forEach((otpSet, moduleKey) => {
      stats[moduleKey] = {
        count: otpSet.size,
      };
      stats.totalTrackedOTPs += otpSet.size;
    });

    return stats;
  }

  /**
   * Update service configuration at runtime
   *
   * @param config - Partial configuration to update
   *
   * @example
   * otpService.updateConfig({
   *   expiryMinutes: 5,
   *   allowDuplicates: true,
   * });
   */
  updateConfig(config: Partial<IOTPServiceConfig>): void {
    try {
      const newConfig = { ...this.config, ...config };
      this.validateConfig();
      this.config = newConfig;

      logger.info({ config: this.config }, "OTP Service configuration updated");
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to update OTP Service configuration"
      );
      throw error;
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Generate random OTP of specified length
   * @private
   */
  private generateRandomOTP(length: number): string {
    const min = Math.pow(10, length - 1); // 10^(length-1)
    const max = Math.pow(10, length) - 1; // 10^length - 1
    const randomNumber = Math.floor(Math.random() * (max - min + 1) + min);
    return randomNumber.toString();
  }

  /**
   * Track OTP for duplicate prevention
   * @private
   */
  private trackOTP(moduleKey: string, otp: string): void {
    let otpSet = this.recentOTPs.get(moduleKey);

    if (!otpSet) {
      otpSet = new Set();
      this.recentOTPs.set(moduleKey, otpSet);
    }

    otpSet.add(otp);

    // Keep only last MAX_TRACKED_OTPS
    if (otpSet.size > this.config.maxTrackedOTPs) {
      const firstItem = otpSet.values().next().value!;
      otpSet.delete(firstItem);
    }
  }

  /**
   * Validate configuration
   * @private
   */
  private validateConfig(): void {
    if (this.config.length < 4 || this.config.length > 8) {
      throw new Error("OTP length must be between 4 and 8 digits");
    }

    if (this.config.expiryMinutes < 1 || this.config.expiryMinutes > 1440) {
      throw new Error("Expiry time must be between 1 and 1440 minutes (1 day)");
    }

    if (this.config.maxTrackedOTPs < 10 || this.config.maxTrackedOTPs > 10000) {
      throw new Error("Max tracked OTPs must be between 10 and 10000");
    }
  }
}

// ============================================
// SINGLETON INSTANCE (Optional)
// ============================================

/**
 * Export singleton instance for convenience
 * Use if you want a pre-configured instance
 * Otherwise, instantiate with: new OTPService(config)
 *
 * @example
 * import { otpService } from "@/services/otp.service";
 * const otp = otpService.generate("EMAIL_VERIFICATION");
 */
export const otpService = new OTPService();
