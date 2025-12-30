// file: src/middlewares/auth.middleware.ts

import { MESSAGES } from "@/constants/app.constants";
import { ErrorCodeEnum } from "@/enums/error-code.enum";

import { logger } from "@/middlewares/pino-logger";
import { AgentProfileRepository } from "@/modules/agent/agent.repository";
import { AuthUtil } from "@/modules/auth/auth.utils";
import { UserRepository } from "@/modules/user/user.repository";
import {
  ForbiddenException,
  UnauthorizedException,
} from "@/utils/app-error.utils";
import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
        accountStatus: string;
        emailVerified?: boolean;
        iat?: number;
        exp?: number;
      };
      requestId?: string;
    }
  }
}

export class AuthMiddleware {
  static verifyToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
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

      const payload = AuthUtil.verifyAccessToken(token);

      const userRepository = new UserRepository();
      const user = await userRepository.findById(payload.userId);

      if (!user) {
        throw new UnauthorizedException(
          MESSAGES.AUTH.UNAUTHORIZED_ACCESS,
          ErrorCodeEnum.AUTH_USER_NOT_FOUND
        );
      }

      if (user.accountStatus !== "active") {
        throw new UnauthorizedException(
          MESSAGES.AUTH.ACCOUNT_INACTIVE,
          ErrorCodeEnum.AUTH_UNAUTHORIZED_ACCESS
        );
      }

      if (user.role === "Agent") {
        const agentRepository = new AgentProfileRepository();
        const agentProfile = await agentRepository.findByUserId(user._id);
        if (!agentProfile || agentProfile.isActive === false) {
          throw new UnauthorizedException(
            MESSAGES.AUTH.ACCOUNT_INACTIVE,
            ErrorCodeEnum.AUTH_UNAUTHORIZED_ACCESS
          );
        }
      }

      req.user = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        emailVerified: user.emailVerified,
        iat: payload.iat,
        exp: payload.exp,
      };

      next();
    } catch (error) {
      logger.warn(
        { requestId: req.id, error: (error as any).message },
        "Token verification failed"
      );
      next(error);
    }
  };

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

        next();
      } catch (error) {
        next(error);
      }
    };
  };

  static optionalAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authHeader = req.get("Authorization") || req.get("authorization");

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const payload = AuthUtil.verifyAccessToken(token);

        const userRepository = new UserRepository();
        const user = await userRepository.findById(payload.userId);

        if (!user || user.accountStatus !== "active") {
          return next();
        }

        if (user.role === "Agent") {
          const agentRepository = new AgentProfileRepository();
          const agentProfile = await agentRepository.findByUserId(user._id);
          if (!agentProfile || agentProfile.isActive === false) {
            return next();
          }
        }

        req.user = {
          userId: user._id.toString(),
          email: user.email,
          role: user.role,
          accountStatus: user.accountStatus,
          emailVerified: user.emailVerified,
          iat: payload.iat,
          exp: payload.exp,
        };

        logger.debug({ userId: payload.userId }, "Optional token verified");
      }

      next();
    } catch (error) {
      logger.debug(
        { error: (error as any).message },
        "Optional token verification skipped"
      );
      next();
    }
  };

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

  static verifyEmailVerified = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user?.emailVerified) {
        throw new ForbiddenException(
          "Please verify your email address before accessing this resource.",
          ErrorCodeEnum.ACCESS_UNAUTHORIZED
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export const authMiddleware = {
  verifyToken: AuthMiddleware.verifyToken,
  authorize: AuthMiddleware.authorize,
  optionalAuth: AuthMiddleware.optionalAuth,
  checkTokenExpiration: AuthMiddleware.checkTokenExpiration,
  verifyEmailVerified: AuthMiddleware.verifyEmailVerified,
};
