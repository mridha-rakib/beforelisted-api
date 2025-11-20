// file: src/modules/admin/admin.controller.ts

import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { NextFunction, Request, Response } from "express";
import {
  deleteUserSchema,
  generateReportSchema,
  getDateRangeSchema,
  getRevenueReportSchema,
} from "./admin.schema";
import { AdminService } from "./admin.service";

/**
 * Admin Controller
 * Handles admin dashboard and operations
 */
export class AdminController {
  private service: AdminService;

  constructor() {
    this.service = new AdminService();
  }

  /**
   * ADMIN: Get dashboard metrics
   * GET /admin/dashboard/metrics
   */
  getDashboardMetrics = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const result = await this.service.getDashboardMetrics();

      ApiResponse.success(
        res,
        result,
        "Dashboard metrics retrieved successfully"
      );
    }
  );

  /**
   * ADMIN: Get revenue report
   * GET /admin/reports/revenue
   */
  getRevenueReport = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(getRevenueReportSchema, req);
      const { period, startDate, endDate } = validated.query;

      const result = await this.service.getRevenueReport(
        startDate,
        endDate,
        period
      );

      ApiResponse.success(res, result, "Revenue report retrieved successfully");
    }
  );

  /**
   * ADMIN: Get agent performance report
   * GET /admin/reports/agents
   */
  getAgentPerformanceReport = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const result = await this.service.getAgentPerformanceReport();

      ApiResponse.success(res, result, "Agent report retrieved successfully");
    }
  );

  /**
   * ADMIN: Get system health
   * GET /admin/system/health
   */
  getSystemHealth = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const result = await this.service.getSystemHealth();

      ApiResponse.success(res, result, "System health retrieved successfully");
    }
  );

  /**
   * ADMIN: Generate comprehensive report
   * POST /admin/reports/generate
   */
  generateComprehensiveReport = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(generateReportSchema, req);
      const { startDate, endDate } = validated.body;

      const result = await this.service.generateComprehensiveReport(
        startDate,
        endDate
      );

      ApiResponse.success(res, result, "Report generated successfully");
    }
  );

  /**
   * ADMIN: Get historical analytics
   * GET /admin/analytics/history
   */
  getHistoricalAnalytics = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(getDateRangeSchema, req);
      const { startDate, endDate } = validated.query;

      const result = await this.service.getHistoricalAnalytics(
        startDate,
        endDate
      );

      ApiResponse.success(
        res,
        result,
        "Historical analytics retrieved successfully"
      );
    }
  );

  /**
   * ADMIN: Delete user
   * DELETE /admin/users/:userId
   */
  deleteUser = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(deleteUserSchema, req);

      const result = await this.service.deleteUser(
        validated.params.userId,
        validated.body.reason
      );

      ApiResponse.success(res, result, "User deleted successfully");
    }
  );
}
