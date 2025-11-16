import { ErrorCodeEnum } from "@/enums/error-code.enum";
import { env } from "@/env";
import { UnauthorizedException } from "@/utils/app-error.utils";
import jwt from "jsonwebtoken";
import { JWTPayload, RefreshTokenResponse } from "./user.interface";
import { UserRepository } from "./user.repository";

import bcrypt from "bcryptjs";

export class UserUtility {
  private repo = new UserRepository();
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly saltRounds: number;

  constructor() {
    this.jwtSecret = env.JWT_SECRET as string;
    this.jwtRefreshSecret = env.JWT_REFRESH_SECRET as string;
    this.accessTokenExpiry = env.JWT_EXPIRY as string;
    this.refreshTokenExpiry = env.JWT_REFRESH_EXPIRY as string;
    this.saltRounds = env.SALT_ROUNDS;
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const payload = this.verifyRefreshToken(refreshToken);

    const user = await this.repo.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedException(
        "User not found",
        ErrorCodeEnum.AUTH_USER_NOT_FOUND
      );
    }

    const tokenPayload: Omit<JWTPayload, "iat" | "exp"> = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const tokens = this.generateTokens(tokenPayload);

    return {
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      message: "Token refreshed successfully",
    };
  }

  // Password hashing utility method
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.saltRounds);
  }

  // Password comparison utility method
  async comparePassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Generate both access and refresh tokens
  generateTokens(payload: Omit<JWTPayload, "iat" | "exp">): {
    accessToken: string;
    refreshToken: string;
  } {
    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: this.refreshTokenExpiry,
    } as jwt.SignOptions);

    return { accessToken, refreshToken };
  }

  // Verify access token and return payload
  verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as JWTPayload;
    } catch (error: unknown) {
      throw new UnauthorizedException(
        "Invalid or expired access token",
        ErrorCodeEnum.AUTH_TOKEN_INVALID
      );
    }
  }

  // Verify refresh token and return payload
  verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.jwtRefreshSecret) as JWTPayload;
    } catch (error) {
      throw new UnauthorizedException(
        "Invalid or expired refresh token",
        ErrorCodeEnum.AUTH_TOKEN_INVALID
      );
    }
  }
}
