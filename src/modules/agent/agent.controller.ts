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
import { UserService } from "../user/user.service";
import {
  activateAgentWithLinkSchema,
  agentRegisterSchema,
  agentToggleActiveSchema,
  createAgentProfileSchema,
  getAgentProfileSchema,
  updateAgentProfileSchema,
} from "./agent.schema";
import { AgentService } from "./agent.service";

export class AgentController {
  private service: AgentService;
  private userService: UserService;

  constructor() {
    this.service = new AgentService();
    this.userService = new UserService();
  }

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

  getAgentProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const result = await this.service.getAgentProfile(userId);

    ApiResponse.success(res, result, "Agent profile retrieved successfully");
  });

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

  toggleEmailSubscription = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = req.user!.userId;
      const result = await this.service.toggleEmailSubscription(userId);

      ApiResponse.success(
        res,
        result,
        "Agent email subscription updated successfully"
      );
    }
  );

  toggleAcceptingRequests = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = req.user!.userId;
      const result = await this.service.toggleAcceptingRequests(userId);

      ApiResponse.success(
        res,
        result,
        "Agent accepting requests updated successfully"
      );
    }
  );

  getAcceptingRequestsStatus = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = req.user!.userId;
      const result = await this.service.getAcceptingRequestsStatus(userId);

      ApiResponse.success(
        res,
        result,
        "Agent accepting requests status retrieved successfully"
      );
    }
  );

  getReferralLink = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user!.userId;

      // Get referral stats from service
      const stats = await this.service.getReferralStats(userId);
      const referralCode = stats.referralCode;
      const referralLink = referralCode
        ? `https://beforelisted.com/signup/renter?ref=${referralCode}`
        : null;
      const loginLink = referralCode
        ? `https://beforelisted.com/signin?ref=${referralCode}`
        : null;

      // Return formatted response
      ApiResponse.success(
        res,
        {
          referralCode,
          referralLink,
          loginLink,
          totalReferrals: stats.totalReferrals,
          referredUsersCount: stats.referredUsers?.length || 0,
          referredUsers: stats.referredUsers,
        },
        "Referral information retrieved successfully"
      );
    }
  );

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
   * Query params: page, limit, sort, search, isActive, hasGrantAccess
   */
  adminGetAllAgents = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { page, limit, sort, search, isActive, hasGrantAccess } = req.query;

      const result = await this.service.adminGetAllAgents({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        sort: sort as string | undefined,
        search: search as string | undefined,
        isActive: isActive !== undefined ? isActive === "true" : undefined,
        hasGrantAccess:
          hasGrantAccess !== undefined ? hasGrantAccess === "true" : undefined,
      });

      ApiResponse.paginated(
        res,
        result.data,
        result.pagination,
        "Agents retrieved successfully"
      );
    }
  );

  /**
   * ADMIN: Get specific agent profile
   * GET /agent/admin/:userId
   */
  getSpecificAgent = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId;
    const result = await this.service.adminGetSpecificAgent(userId);

    ApiResponse.success(res, result, "Agents retrieved successfully");
  });

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

      if (!agentId || agentId.trim() === "") {
        throw new BadRequestException("Agent ID is required");
      }

      const result = await this.service.toggleAccess(agentId, adminId, reason);

      const { NotificationService } =
        await import("../notification/notification.service");
      const notificationService = new NotificationService();

      try {
        const agent = await this.service.findAgentById(agentId);

        // The userId is populated with user document, so we cast to access fullName
        const populatedUser = agent?.userId as any;
        const agentName = populatedUser?.fullName || "Agent";

        if (result.hasGrantAccess) {
          await notificationService.notifyAgentAccessGranted({
            agentId: populatedUser?._id?.toString() || agentId,
            agentName,
            grantedBy: adminId,
          });
        } else {
          await notificationService.notifyAgentAccessRevoked({
            agentId: populatedUser?._id?.toString() || agentId,
            agentName,
            reason,
          });
        }
      } catch (error) {
        logger.error({ error, agentId }, "Failed to send access notification");
      }
      // ============ END ADD ============

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
   * GET /agent/:agentId/access-status
   */
  getAccessStatus = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { agentId } = req.params;
      const userRole = req.user!.role;

      if (userRole !== ROLES.ADMIN) {
        throw new ForbiddenException(
          "Only admins can view agent access status"
        );
      }

      if (!agentId || agentId.trim() === "") {
        throw new BadRequestException("Agent ID is required");
      }

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
   * ADMIN: Activate agent account with required link
   * POST /agent/admin/:userId/activate-with-link
   */
  activateAgentWithLink = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(activateAgentWithLinkSchema, req);
    const adminId = req.user!.userId;

    const result = await this.service.activateAgentWithLink(
      validated.params.userId,
      adminId,
      validated.body,
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

  downloadAgentConsolidatedExcel = asyncHandler(
    async (req: Request, res: Response) => {
      const adminId = req.user!.userId;

      const metadata = await this.service.getAgentConsolidatedExcel();

      logger.info({ adminId }, "Admin downloaded Excel metadata");

      ApiResponse.success(
        res,
        {
          fileName: metadata.fileName,
          fileUrl: metadata.fileUrl,
          totalAgents: metadata.totalAgents,
          version: metadata.version,
          lastUpdated: metadata.lastUpdated,
          downloadUrl: metadata.fileUrl,
        },
        "Consolidated Agent Excel file info retrieved"
      );
    }
  );

  /**
   * DELETE /agent/profile
   * Delete own agent profile (soft delete)
   */
  deleteProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const result = await this.service.deleteAgentProfile(userId);

    ApiResponse.success(res, result, "Agent profile deleted successfully");
  });
}
