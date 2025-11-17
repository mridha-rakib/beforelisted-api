// file: src/modules/auth/auth.utils.ts
import { JWT, OTP, REFERRAL_CODE } from "@/constants/app.constants";
import { env } from "@/env";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import type { JWTPayload } from "../user/user.type";

/**

Auth Utilities

Handles JWT tokens, OTP generation, and related security functions
//*Generate Access Token
*/
export class AuthUtil {
  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: JWT.ACCESS_EXPIRY,
    });
  }

  /**

Generate Refresh Token
*/
  static generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
      expiresIn: JWT.REFRESH_EXPIRY,
    });
  }

  /**

Verify Access Token
*/
  static verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      return decoded as JWTPayload;
    } catch (error) {
      throw new Error("Invalid or expired access token");
    }
  }

  /**

Verify Refresh Token
*/
  static verifyRefreshToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
      return decoded as JWTPayload;
    } catch (error) {
      throw new Error("Invalid or expired refresh token");
    }
  }

  /**

Decode token without verification (for debugging)
*/
  static decodeToken(token: string): any {
    return jwt.decode(token);
  }

  /**

Generate Email Verification Token
*/
  static generateEmailVerificationToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**

Generate OTP (4 digits)
*/
  static generateOTP(): string {
    const min = Math.pow(10, OTP.LENGTH - 1);
    const max = Math.pow(10, OTP.LENGTH) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  /**

Generate Random Password
/
static generateRandomPassword(length: number = 16): string {
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&';
let password = '';
for (let i = 0; i < length; i++) {
password += chars.charAt(Math.floor(Math.random() * chars.length));
}
return password;
}

/**

Generate Referral Code
*/
  static generateReferralCode(prefix: string): string {
    const randomPart = uuidv4()
      .replace(/-/g, "")
      .substring(0, REFERRAL_CODE.LENGTH);
    return `${prefix}-${randomPart.toUpperCase()}`;
  }

  /**

Generate Referral URL Slug
*/
  static generateReferralSlug(fullName: string): string {
    const slug = fullName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    return `${slug}-${uuidv4().substring(0, 8)}`;
  }

  /**

Calculate token expiration time
*/
  static getTokenExpirationTime(expiryString: string): Date {
    const expiryDate = new Date();
    const match = expiryString.match(/(\d+)([dhms])/);
    if (!match) return expiryDate;

    const value = parseInt(match);

    const unit = match;

    switch (unit) {
      case "d":
        expiryDate.setDate(expiryDate.getDate() + value);
        break;
      case "h":
        expiryDate.setHours(expiryDate.getHours() + value);
        break;
      case "m":
        expiryDate.setMinutes(expiryDate.getMinutes() + value);
        break;
      case "s":
        expiryDate.setSeconds(expiryDate.getSeconds() + value);
        break;
    }

    return expiryDate;
  }

  /**

Calculate OTP expiration time (10 minutes)
*/
  static getOTPExpirationTime(): Date {
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + OTP.EXPIRY_MINUTES);
    return expiryDate;
  }

  /**

Calculate referral code expiration time (30 days)
*/
  static getReferralCodeExpirationTime(): Date {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + REFERRAL_CODE.EXPIRY_DAYS);
    return expiryDate;
  }

  /**

Verify email format
*/
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**

Validate password strength

Requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
/
static isStrongPassword(password: string): boolean {
const strongPasswordRegex =
/^(?=.[a-z])(?=.[A-Z])(?=.\d)(?=.[@$!%?&])[A-Za-z\d@$!%*?&]{8,}$/;
return strongPasswordRegex.test(password);
}

/**

Generate verification link
*/
  static generateVerificationLink(baseURL: string, token: string): string {
    return `${baseURL}/api/v1/auth/verify-email?token=${token}`;
  }

  /**

Generate password reset link
*/
  static generatePasswordResetLink(baseURL: string, token: string): string {
    return `${baseURL}/api/v1/auth/reset-password?token=${token}`;
  }

  /**

Generate admin referral link
*/
  static generateAdminReferralLink(
    baseURL: string,
    referralSlug: string
  ): string {
    return `${baseURL}/auth/register?ref=${referralSlug}`;
  }

  /**

Generate agent referral link
*/
  static generateAgentReferralLink(
    baseURL: string,
    referralCode: string
  ): string {
    return `${baseURL}/auth/register?ref=${referralCode}`;
  }
}
