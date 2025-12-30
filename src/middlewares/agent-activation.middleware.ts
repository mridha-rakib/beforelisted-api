// file: src/middlewares/agent-activation.middleware.ts

import { ROLES } from "@/constants/app.constants";
import { ErrorCodeEnum } from "@/enums/error-code.enum";
import { logger } from "@/middlewares/pino-logger";
import { AgentProfileRepository } from "@/modules/agent/agent.repository";
import { ForbiddenException } from "@/utils/app-error.utils";
import type { NextFunction, Request, Response } from "express";

export class AgentActivationMiddleware {
  private agentRepository: AgentProfileRepository;

  constructor() {
    this.agentRepository = new AgentProfileRepository();
  }

  verify = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const requestId = req.id || req.headers["x-request-id"];

      if (req.user?.role !== ROLES.AGENT) {
        logger.debug(
          { userId: req.user?.userId, role: req.user?.role, requestId },
          "Non-agent request, skipping activation check"
        );
        return next();
      }

      const userId = req.user!.userId;
      const agent = await this.agentRepository.findByUserId(userId);

      if (!agent) {
        throw new ForbiddenException(
          "Agent profile not found. Please contact support.",
          ErrorCodeEnum.ACCESS_UNAUTHORIZED
        );
      }

      if (!agent.isActive) {
        throw new ForbiddenException(
          "Your account has not been activated yet. Please wait for admin approval.",
          ErrorCodeEnum.ACCESS_UNAUTHORIZED
        );
      }

      if (req.user?.accountStatus !== "active") {
        throw new ForbiddenException(
          "Your account status is not active. Please contact support.",
          ErrorCodeEnum.ACCESS_UNAUTHORIZED
        );
      }

      next();
    } catch (error) {
      logger.error(
        {
          userId: req.user?.userId,
          error: (error as any).message,
          requestId: req.id,
        },
        "Agent activation middleware error"
      );
      next(error);
    }
  };
}

export const agentActivationMiddleware = new AgentActivationMiddleware();
