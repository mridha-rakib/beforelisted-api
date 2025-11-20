// file: src/utils/password.utils.ts

import { env } from "@/env";
import bcryptjs from "bcryptjs";

/**
 * Password utility functions
 */
export class PasswordUtil {
  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = env.SALT_ROUNDS || 10;
    return bcryptjs.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    return bcryptjs.compare(password, hash);
  }

  /**
   * Generate random secure password (for admin referrals)
   * Format: 8 chars + uppercase + lowercase + number + special
   */
  static generateRandomPassword(length: number = 12): string {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const specials = "!@#$%^&*";

    // Ensure at least one of each type
    let password = "";
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specials[Math.floor(Math.random() * specials.length)];

    // Fill remaining length
    const allChars = uppercase + lowercase + numbers + specials;
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle password
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }
}

// Export convenience functions
export const hashPassword = PasswordUtil.hashPassword;
export const comparePassword = PasswordUtil.comparePassword;
export const generateRandomPassword = PasswordUtil.generateRandomPassword;
