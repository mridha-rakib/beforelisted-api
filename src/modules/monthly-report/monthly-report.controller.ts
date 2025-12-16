// file: src/modules/monthly-report/monthly-report.controller.ts

import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { logger } from "@/middlewares/pino-logger";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import {
  createMonthlyReportSchema,
  deleteReportSchema,
  getReportByIdSchema,
  updateMonthlyReportSchema,
} from "./monthly-report.schema";
import { MonthlyReportService } from "./monthly-report.service";

export class MonthlyReportController {
  private readonly reportService: MonthlyReportService;

  constructor() {
    this.reportService = new MonthlyReportService();
  }

  /**
   * GET /monthly-report
   * Get all active reports (public)
   * Anyone can access
   */
  getAllPublicReports = asyncHandler(async (req: Request, res: Response) => {
    const reports = await this.reportService.getAllPublicReports();

    ApiResponse.success(res, reports, "All reports retrieved");
  });

  /**
   * GET /monthly-report/:id
   * Get single report by ID (public)
   */
  getReportById = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(getReportByIdSchema, req);
    const { id } = validated.params;

    const report = await this.reportService.getReportById(id);

    ApiResponse.success(res, report, "Report retrieved");
  });

  // =============================================
  // ADMIN ROUTES (Below)
  // =============================================

  /**
   * GET /monthly-report/admin/all
   * Get all reports (including inactive)
   * Protected: Admin only
   */
  getAllReports = asyncHandler(async (req: Request, res: Response) => {
    const reports = await this.reportService.getAllReports();

    ApiResponse.success(res, reports, "All reports retrieved (admin)");
  });

  /**
   * POST /monthly-report/admin
   * Create new report
   * Protected: Admin only
   */
  createReport = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createMonthlyReportSchema, req);
    const adminId = req.user!.userId;

    const report = await this.reportService.createReport(
      validated.body,
      adminId
    );

    logger.info({ adminId, reportId: report._id }, "Report created");

    ApiResponse.created(res, report, "Report created successfully");
  });

  /**
   * PUT /monthly-report/admin/:id
   * Update report
   * Protected: Admin only
   */
  updateReport = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateMonthlyReportSchema, req);
    const { id } = req.params;
    const adminId = req.user!.userId;

    const report = await this.reportService.updateReport(
      id,
      validated.body,
      adminId
    );

    logger.info({ adminId, reportId: id }, "Report updated");

    ApiResponse.success(res, report, "Report updated successfully");
  });

  /**
   * DELETE /monthly-report/admin/:id
   * Delete report (soft delete)
   * Protected: Admin only
   */
  deleteReport = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(deleteReportSchema, req);
    const { id } = validated.params;
    const adminId = req.user!.userId;

    const report = await this.reportService.deleteReport(id, adminId);

    logger.warn({ adminId, reportId: id }, "Report deleted");

    ApiResponse.success(res, report, "Report deleted successfully");
  });

  /**
   * DELETE /monthly-report/admin/:id/hard-delete
   * Hard delete report (permanent)
   * Protected: Admin only
   */
  hardDeleteReport = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(deleteReportSchema, req);
    const { id } = validated.params;
    const adminId = req.user!.userId;

    await this.reportService.hardDeleteReport(id, adminId);

    logger.warn({ adminId, reportId: id }, "Report hard deleted");

    ApiResponse.success(
      res,
      { message: "Report permanently deleted" },
      "Report permanently deleted successfully"
    );
  });

  /**
   * GET /monthly-report/year/:year
   * Get reports by year (public)
   */
  getReportsByYear = asyncHandler(async (req: Request, res: Response) => {
    const { year } = req.params;
    const yearNum = parseInt(year);

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return ApiResponse.error(res, 400, "Invalid year");
    }

    const reports = await this.reportService.getReportsByYear(yearNum);

    ApiResponse.success(res, reports, `Reports for year ${yearNum} retrieved`);
  });
}
