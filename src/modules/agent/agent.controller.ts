// file: src/modules/agent/agent.controller.ts

import { COOKIE_CONFIG } from "@/config/cookie.config";
import { ROLES } from "@/constants/app.constants";
import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { logger } from "@/middlewares/pino-logger";
import {
  BadRequestException,
  ForbiddenException,
} from "@/utils/app-error.utils";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { NextFunction, Request, Response } from "express";
import {
  adminApproveAgentSchema,
  adminSuspendAgentSchema,
  adminUnsuspendAgentSchema,
  adminVerifyAgentSchema,
  agentRegisterSchema,
  agentToggleActiveSchema,
  createAgentProfileSchema,
  getAgentProfileSchema,
  updateAgentProfileSchema,
} from "./agent.schema";
import { AgentService } from "./agent.service";

/**
 * Agent Controller
 * Handles HTTP requests for agent profiles
 */
export class AgentController {
  private service: AgentService;

  constructor() {
    this.service = new AgentService();
  }

  /**
   * AGENT: Create agent profile (during signup)
   * POST /agent
   */
  createAgentProfile = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(createAgentProfileSchema, req);
      const userId = req.user!.userId;

      const result = await this.service.createAgentProfile(
        userId,
        validated.body
      );

      ApiResponse.created(res, result, "Agent profile created successfully");
    }
  );

  /**
   * AGENT: Get own profile
   * GET /agent/profile
   */
  getAgentProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const result = await this.service.getAgentProfile(userId);

    ApiResponse.success(res, result, "Agent profile retrieved successfully");
  });

  /**
   * AGENT: Update profile
   * PUT /agent/profile
   */
  updateAgentProfile = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(updateAgentProfileSchema, req);
      const userId = req.user!.userId;

      const result = await this.service.updateAgentProfile(
        userId,
        validated.body
      );

      ApiResponse.success(res, result, "Agent profile updated successfully");
    }
  );

  /**
   * AUTHENTICATED: Get agent referral link and statistics
   * GET /agent/referral-link
   * Returns: { referralCode, referralLink, totalReferrals, referredUsersCount }
   */
  getReferralLink = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user!.userId;

      // Get referral stats from service
      const stats = await this.service.getReferralStats(userId);

      // Return formatted response
      ApiResponse.success(
        res,
        {
          referralCode: stats.referralCode,
          referralLink: stats.referralLink,
          totalReferrals: stats.totalReferrals,
          referredUsersCount: stats.referredUsers?.length || 0,
          referredUsers: stats.referredUsers,
        },
        "Referral information retrieved successfully"
      );
    }
  );

  /**
   * ADMIN: Get specific agent profile
   * GET /agent/admin/:userId
   */
  adminGetAgent = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(getAgentProfileSchema, req);
    const result = await this.service.adminGetAgent(validated.params.userId);
    ApiResponse.success(res, result, "Agent profile retrieved successfully");
  });

  /**
   * AGENT: Get own statistics
   * GET /agent/stats
   */
  getAgentStats = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user!.userId;

      const result = await this.service.getAgentStats(userId);

      ApiResponse.success(
        res,
        result,
        "Agent statistics retrieved successfully"
      );
    }
  );

  /**
   * ADMIN: Get all agents
   * GET /agent/admin/all
   */
  adminGetAllAgents = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const result = await this.service.adminGetAllAgents();

      ApiResponse.success(res, result, "Agents retrieved successfully");
    }
  );

  /**
   * ADMIN: Get pending approval agents
   * GET /agent/admin/pending-approval
   */
  adminGetPendingApprovalAgents = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const result = await this.service.adminGetPendingApprovalAgents();

      ApiResponse.success(res, result, "Pending agents retrieved successfully");
    }
  );

  /**
   * ADMIN: Get suspended agents
   * GET /agent/admin/suspended
   */
  adminGetSuspendedAgents = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const result = await this.service.adminGetSuspendedAgents();

      ApiResponse.success(
        res,
        result,
        "Suspended agents retrieved successfully"
      );
    }
  );

  /**
   * ADMIN: Approve agent
   * POST /agent/admin/:userId/approve
   */
  adminApproveAgent = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(adminApproveAgentSchema, req);
      const adminId = req.user!.userId;

      const result = await this.service.adminApproveAgent(
        validated.params.userId,
        adminId,
        validated.body
      );

      ApiResponse.success(res, result, "Agent approved successfully");
    }
  );

  /**
   * ADMIN: Verify agent license
   * POST /agent/admin/:userId/verify
   */
  adminVerifyAgent = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(adminVerifyAgentSchema, req);

      const result = await this.service.adminVerifyAgent(
        validated.params.userId
      );

      ApiResponse.success(res, result, "Agent license verified successfully");
    }
  );

  /**
   * ADMIN: Suspend agent
   * POST /agent/admin/:userId/suspend
   */
  adminSuspendAgent = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(adminSuspendAgentSchema, req);

      const result = await this.service.adminSuspendAgent(
        validated.params.userId,
        validated.body
      );

      ApiResponse.success(res, result, "Agent suspended successfully");
    }
  );

  /**
   * ADMIN: Unsuspend agent
   * POST /agent/admin/:userId/unsuspend
   */
  adminUnsuspendAgent = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(adminUnsuspendAgentSchema, req);

      const result = await this.service.adminUnsuspendAgent(
        validated.params.userId
      );

      ApiResponse.success(res, result, "Agent unsuspended successfully");
    }
  );

  /**
   * ADMIN: Get agent metrics
   * GET /agent/admin/metrics
   */
  adminGetAgentMetrics = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const result = await this.service.adminGetAgentMetrics();

      ApiResponse.success(res, result, "Agent metrics retrieved successfully");
    }
  );

  /**
   * PUBLIC: Register as agent
   * POST /agent/register
   * ✅ Set refresh token in cookie
   */
  registerAgent = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(agentRegisterSchema, req);

    const result = await this.service.registerAgent(validated.body);

    res.cookie(
      COOKIE_CONFIG.REFRESH_TOKEN.name,
      result.tokens.refreshToken,
      COOKIE_CONFIG.REFRESH_TOKEN.options
    );

    const response = {
      user: result.user,
      profile: result.profile,
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn,
    };

    ApiResponse.created(res, response, "Agent registered successfully");
  });

  /**
   * Toggle agent access (grant/revoke)
   * Admin only endpoint
   *
   * POST /agent/:agentId/toggle-access
   * Body: { reason?: string }
   */
  toggleAccess = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { agentId } = req.params;
      const { reason } = req.body;
      const adminId = req.user!.userId;
      const userRole = req.user!.role;

      // Verify admin role
      if (userRole !== ROLES.ADMIN) {
        logger.warn(
          { userId: adminId, agentId, role: userRole },
          "Unauthorized access toggle attempt"
        );
        throw new ForbiddenException("Only admins can toggle agent access");
      }

      // Validate agent ID
      if (!agentId || agentId.trim() === "") {
        throw new BadRequestException("Agent ID is required");
      }

      // Toggle access
      const result = await this.service.toggleAccess(agentId, adminId, reason);

      // Return response
      ApiResponse.success(
        res,
        {
          agentId,
          hasGrantAccess: result.hasGrantAccess,
          previousAccess: result.previousAccess,
        },
        result.message,
        200
      );
    }
  );

  /**
   * Get agent access status
   * Admin only endpoint
   *
   * GET /agent/:agentId/access-status
   */
  getAccessStatus = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { agentId } = req.params;
      const userRole = req.user!.role;

      // Verify admin role
      if (userRole !== ROLES.ADMIN) {
        throw new ForbiddenException(
          "Only admins can view agent access status"
        );
      }

      if (!agentId || agentId.trim() === "") {
        throw new BadRequestException("Agent ID is required");
      }

      // Get status
      const status = await this.service.getAccessStatus(agentId);

      ApiResponse.success(
        res,
        {
          agentId,
          ...status,
        },
        "Access status retrieved",
        200
      );
    }
  );

  /**
   * ADMIN: Toggle agent active/deactive status
   * POST /agent/admin/:userId/toggle-active
   *
   * Automatically switches isActive between true and false
   */
  toggleAgentActive = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(agentToggleActiveSchema, req);
    const adminId = req.user!.userId;

    const result = await this.service.toggleAgentActive(
      validated.params.userId,
      adminId,
      validated.body?.reason
    );

    ApiResponse.success(res, result, result.message);
  });

  /**
   * ADMIN: Get agent activation history
   * GET /agent/admin/:userId/activation-history
   */
  getActivationHistory = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(getAgentProfileSchema, req);

    const result = await this.service.getActivationHistory(
      validated.params.userId
    );

    ApiResponse.success(res, result, "Activation history retrieved");
  });
}
