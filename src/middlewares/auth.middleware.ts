import { ErrorCodeEnum } from "@/enums/error-code.enum";
import { JWTPayload } from "@/modules/user/user.interface";
import { UserUtility } from "@/modules/user/user.utils";
import { UnauthorizedException } from "@/utils/app-error.utils";
import type { NextFunction, Request, Response } from "express";
import { logger } from "./pino-logger";

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export class AuthMiddleware {
  private utility = new UserUtility();

  // verify JWT token and attach user info to request
  authenticate = (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.get("Authorization") || req.get("authorization");

      logger.info(`Auth Header: ${authHeader}`);

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new UnauthorizedException(
          "Access token is required",
          ErrorCodeEnum.AUTH_TOKEN_NOT_FOUND
        );
      }

      const token = authHeader.substring(7);

      const payload = this.utility.verifyAccessToken(token);

      req.user = payload; // Attach user info to request
      next();
    } catch (error) {
      next(error);
    }
  };

  // Role-based authorization middleware
  authorize = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          throw new UnauthorizedException(
            "Authentication required",
            ErrorCodeEnum.AUTH_UNAUTHORIZED_ACCESS
          );
        }

        if (!allowedRoles.includes(req.user.role)) {
          throw new UnauthorizedException(
            "Insufficient permissions",
            ErrorCodeEnum.ACCESS_UNAUTHORIZED
          );
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  };

  authorizeGrantAccess = (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedException(
          "Authentication required",
          ErrorCodeEnum.AUTH_UNAUTHORIZED_ACCESS
        );
      }

      if (req.user.role === "agent" && !req.user.hasGrantAccess) {
        throw new UnauthorizedException(
          "Grant access required for this operation",
          ErrorCodeEnum.ACCESS_UNAUTHORIZED
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const authMiddleware = new AuthMiddleware();
