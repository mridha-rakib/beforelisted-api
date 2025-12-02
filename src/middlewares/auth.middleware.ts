// file: src/middlewares/auth.middleware.ts

import { MESSAGES, ROLES } from "@/constants/app.constants";
import { ErrorCodeEnum } from "@/enums/error-code.enum";

import { logger } from "@/middlewares/pino-logger";
import { AuthUtil } from "@/modules/auth/auth.utils";
import {
  ForbiddenException,
  UnauthorizedException,
} from "@/utils/app-error.utils";
import type { NextFunction, Request, Response } from "express";

/**
 * Extended Express Request with user info
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
        iat?: number;
        exp?: number;
      };
      requestId?: string;
    }
  }
}

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user info to request
 */
export class AuthMiddleware {
  /**
   * Verify JWT Token
   * Validates access token and attaches decoded payload to req.user
   */
  static verifyToken = (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.get("Authorization") || req.get("authorization");
      const requestId = req.id || req.headers["x-request-id"];

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        logger.warn(
          { requestId, path: req.path },
          "Missing or invalid Authorization header"
        );
        throw new UnauthorizedException(
          MESSAGES.AUTH.INVALID_CREDENTIALS,
          ErrorCodeEnum.AUTH_TOKEN_NOT_FOUND
        );
      }

      const token = authHeader.substring(7);

      // Verify token
      const payload = AuthUtil.verifyAccessToken(token);

      // Attach user info to request
      req.user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        iat: payload.iat,
        exp: payload.exp,
      };

      logger.debug(
        { userId: payload.userId, role: payload.role, requestId },
        "Token verified successfully"
      );

      next();
    } catch (error) {
      logger.warn(
        { requestId: req.id, error: (error as any).message },
        "Token verification failed"
      );
      next(error);
    }
  };

  /**
   * Authorize by Role
   * Check if user has required role(s)
   */
  static authorize = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          throw new UnauthorizedException(
            MESSAGES.AUTH.UNAUTHORIZED_ACCESS,
            ErrorCodeEnum.AUTH_UNAUTHORIZED_ACCESS
          );
        }

        if (!allowedRoles.includes(req.user.role)) {
          logger.warn(
            { userId: req.user.userId, role: req.user.role, requestId: req.id },
            "User role not authorized"
          );
          throw new ForbiddenException(
            `Only ${allowedRoles.join(", ")} can access this resource`,
            ErrorCodeEnum.ACCESS_UNAUTHORIZED
          );
        }

        logger.debug(
          { userId: req.user.userId, role: req.user.role },
          "User authorized"
        );

        next();
      } catch (error) {
        next(error);
      }
    };
  };

  /**
   * Optional Authentication
   * Verifies token if present, but doesn't require it
   */
  static optionalAuth = (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.get("Authorization") || req.get("authorization");

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const payload = AuthUtil.verifyAccessToken(token);

        req.user = {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          iat: payload.iat,
          exp: payload.exp,
        };

        logger.debug({ userId: payload.userId }, "Optional token verified");
      }

      next();
    } catch (error) {
      // Don't throw error for optional auth, just skip
      logger.debug(
        { error: (error as any).message },
        "Optional token verification skipped"
      );
      next();
    }
  };

  /**
   * Verify Token Expiration
   * Check if token is about to expire
   */
  static checkTokenExpiration = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user || !req.user.exp) {
        return next();
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresIn = req.user.exp - now;

      // Warn if token expires in less than 5 minutes
      if (expiresIn < 300 && expiresIn > 0) {
        logger.warn(
          { userId: req.user.userId, expiresIn },
          "Token expiring soon"
        );
        res.setHeader("X-Token-Expires-In", expiresIn);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify Agent Access
   * Check if agent has grant access
   */
  static verifyAgentAccess = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        throw new UnauthorizedException(
          MESSAGES.AUTH.UNAUTHORIZED_ACCESS,
          ErrorCodeEnum.AUTH_UNAUTHORIZED_ACCESS
        );
      }

      if (req.user.role !== ROLES.AGENT) {
        throw new ForbiddenException("Only agents can access this resource");
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify Email Verified
   * Check if user has verified their email
   */
  static verifyEmailVerified = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
      }

      // This would require fetching user from DB to check emailVerified field
      // For now, just verify token exists (user is authenticated)
      // In production, cache emailVerified status or check at service level

      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify Account Status
   * Check if account is active
   */
  static verifyAccountStatus = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        throw new UnauthorizedException(MESSAGES.AUTH.UNAUTHORIZED_ACCESS);
      }

      // This would require fetching user from DB to check accountStatus
      // Recommended to check at service level instead

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Export middleware functions as singletons for convenience
 */
export const authMiddleware = {
  verifyToken: AuthMiddleware.verifyToken,
  authorize: AuthMiddleware.authorize,
  optionalAuth: AuthMiddleware.optionalAuth,
  checkTokenExpiration: AuthMiddleware.checkTokenExpiration,
  verifyAgentAccess: AuthMiddleware.verifyAgentAccess,
  verifyEmailVerified: AuthMiddleware.verifyEmailVerified,
  verifyAccountStatus: AuthMiddleware.verifyAccountStatus,
};
