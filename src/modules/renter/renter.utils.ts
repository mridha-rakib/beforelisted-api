// file: src/modules/renter/renter.utils.ts

import { IGeneratedPasswordResponse } from "./renter.interface";

export class RenterUtil {
  /**
   * @returns Generated password with metadata
   */

  static generateAutoPassword(): IGeneratedPasswordResponse {
    const upperCase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowerCase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";

    const allCharacters = upperCase + lowerCase + numbers;

    let password = "";

    password += upperCase[Math.floor(Math.random() * upperCase.length)];
    password += lowerCase[Math.floor(Math.random() * lowerCase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];

    for (let i = 0; i < 9; i++) {
      password +=
        allCharacters[Math.floor(Math.random() * allCharacters.length)];
    }

    password = password
      .split("")
      .sort(() => 0.5 - Math.random())
      .join("");

    return {
      password,
      expiresInHours: 24,
      mustChangeOnLogin: true,
    };
  }

  static validatePasswordStrength(password: string): {
    isValid: boolean;
    message: string;
  } {
    if (!password || password.length < 8) {
      return {
        isValid: false,
        message: "Password must be at least 8 characters long",
      };
    }

    if (!/[A-Z]/.test(password)) {
      return {
        isValid: false,
        message: "Password must contain at least one uppercase letter",
      };
    }

    if (!/[a-z]/.test(password)) {
      return {
        isValid: false,
        message: "Password must contain at least one lowercase letter",
      };
    }

    if (!/[0-9]/.test(password)) {
      return {
        isValid: false,
        message: "Password must contain at least one number",
      };
    }

    return {
      isValid: true,
      message: "Password is strong",
    };
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateFullName(fullName: string): {
    isValid: boolean;
    message: string;
  } {
    if (!fullName || fullName.trim().length < 2) {
      return {
        isValid: false,
        message: "Full name must be at least 2 characters",
      };
    }

    if (fullName.length > 100) {
      return {
        isValid: false,
        message: "Full name must not exceed 100 characters",
      };
    }

    // Allow letters, spaces, hyphens, apostrophes
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    if (!nameRegex.test(fullName)) {
      return {
        isValid: false,
        message: "Full name contains invalid characters",
      };
    }

    return {
      isValid: true,
      message: "Full name is valid",
    };
  }

  /**
   * Validate phone number (basic validation)
   * Allows various formats: +1234567890, 123-456-7890, (123)456-7890, etc.
   *
   * @param phoneNumber - Phone number to validate
   * @returns true if valid, false otherwise
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    if (!phoneNumber) return true; // Phone is optional
    const phoneRegex = /^[\d\s\-\(\)\+\.]+$/;
    return (
      phoneRegex.test(phoneNumber) &&
      phoneNumber.replace(/\D/g, "").length >= 10
    );
  }

  /**
   * Normalize email to lowercase and trim
   *
   * @param email - Email to normalize
   * @returns Normalized email
   */
  static normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Normalize phone number (remove non-digits except +)
   *
   * @param phoneNumber - Phone number to normalize
   * @returns Normalized phone number
   */
  static normalizePhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return "";
    return phoneNumber.replace(/[^\d\+]/g, "");
  }

  /**
   * Check if referral code is valid format
   * Agent: AGT-XXXXXXXX (AGT- prefix + 8 chars)
   * Admin: ADM-XXXXXXXX (ADM- prefix + 8 chars)
   *
   * @param code - Referral code to validate
   * @param type - Type of referral code (agent or admin)
   * @returns { isValid, type, code }
   */
  static validateReferralCode(
    code: string,
    type?: "agent" | "admin"
  ): { isValid: boolean; type?: "agent" | "admin"; code?: string } {
    if (!code || code.trim() === "") {
      return { isValid: false };
    }

    const trimmedCode = code.trim().toUpperCase();

    if (trimmedCode.startsWith("AGT-")) {
      const isValidFormat = /^AGT-[A-Z0-9]{8}$/.test(trimmedCode);
      if (type && type !== "agent") {
        return { isValid: false };
      }
      return {
        isValid: isValidFormat,
        type: "agent",
        code: trimmedCode,
      };
    }

    if (trimmedCode.startsWith("ADM-")) {
      const isValidFormat = /^ADM-[A-Z0-9]{8}$/.test(trimmedCode);
      if (type && type !== "admin") {
        return { isValid: false };
      }
      return {
        isValid: isValidFormat,
        type: "admin",
        code: trimmedCode,
      };
    }

    return { isValid: false };
  }

  static passwordsMatch(password: string, confirmPassword: string): boolean {
    return password === confirmPassword;
  }

  static generateVerificationCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  static getRegistrationType(
    referralCode?: string
  ): "normal" | "agent_referral" | "admin_referral" {
    if (!referralCode) {
      return "normal";
    }

    const validation = this.validateReferralCode(referralCode);
    if (!validation.isValid) {
      return "normal";
    }

    if (validation.type === "agent") {
      return "agent_referral";
    }

    if (validation.type === "admin") {
      return "admin_referral";
    }

    return "normal";
  }

  static buildUserData(data: {
    email: string;
    password?: string;
    fullName: string;
    phoneNumber?: string;
  }): {
    email: string;
    password?: string;
    fullName: string;
    phoneNumber?: string;
  } {
    return {
      email: this.normalizeEmail(data.email),
      password: data.password,
      fullName: data.fullName.trim(),
      phoneNumber: data.phoneNumber
        ? this.normalizePhoneNumber(data.phoneNumber)
        : undefined,
    };
  }

  /**
   * Format error message for client
   *
   * @param error - Error object or message
   * @returns Formatted error message
   */
  static formatErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    return "An unexpected error occurred";
  }

  /**
   * Generate secure token for password reset
   *
   * @returns Secure random token (32 chars)
   */
  static generateSecureToken(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * Calculate token expiration time
   *
   * @param minutesFromNow - Minutes from now
   * @returns Expiration date
   */
  static calculateExpiration(minutesFromNow: number): Date {
    const now = new Date();
    return new Date(now.getTime() + minutesFromNow * 60 * 1000);
  }

  /**
   * Check if token/code is expired
   *
   * @param expiresAt - Expiration timestamp
   * @returns true if expired, false if still valid
   */
  static isExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Get expiration time in minutes
   *
   * @param expiresAt - Expiration timestamp
   * @returns Minutes until expiration (0 if expired)
   */
  static getExpirationMinutes(expiresAt: Date): number {
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    const diffMinutes = Math.ceil(diffMs / 60000);
    return Math.max(0, diffMinutes);
  }
}
