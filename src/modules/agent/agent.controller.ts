// file: src/modules/agent/agent.controller.ts

import { COOKIE_CONFIG } from "@/config/cookie.config";
import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { NextFunction, Request, Response } from "express";
import {
  adminApproveAgentSchema,
  adminSuspendAgentSchema,
  adminUnsuspendAgentSchema,
  adminVerifyAgentSchema,
  agentRegisterSchema,
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
  getAgentProfile = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user!.userId;

      const result = await this.service.getAgentProfile(userId);

      ApiResponse.success(res, result, "Agent profile retrieved successfully");
    }
  );

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
}
