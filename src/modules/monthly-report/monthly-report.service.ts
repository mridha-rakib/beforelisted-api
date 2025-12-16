// file: src/modules/monthly-report/monthly-report.service.ts

import { logger } from "@/middlewares/pino-logger";
import {
  BadRequestException,
  NotFoundException,
} from "@/utils/app-error.utils";
import type { IMonthlyReport } from "./monthly-report.model";
import { MonthlyReportRepository } from "./monthly-report.repository";

export class MonthlyReportService {
  private readonly reportRepository: MonthlyReportRepository;

  constructor() {
    this.reportRepository = new MonthlyReportRepository();
  }

  /**
   * Get all active reports (public)
   */
  async getAllPublicReports(): Promise<IMonthlyReport[]> {
    const reports = await this.reportRepository.getAllActiveReports();

    logger.debug({ count: reports.length }, "Public reports retrieved");

    return reports;
  }

  /**
   * Get all reports (admin - including inactive)
   */
  async getAllReports(): Promise<IMonthlyReport[]> {
    const reports = await this.reportRepository.getAllReports();

    logger.debug({ count: reports.length }, "All reports retrieved (admin)");

    return reports;
  }

  /**
   * Get single report by ID
   */
  async getReportById(id: string): Promise<IMonthlyReport> {
    const report = await this.reportRepository.getReportById(id);

    if (!report) {
      throw new NotFoundException("Report not found");
    }

    return report;
  }

  /**
   * Create new report
   */
  async createReport(
    data: Partial<IMonthlyReport>,
    adminId: string
  ): Promise<IMonthlyReport> {
    // Check if report already exists for this month/year
    const exists = await this.reportRepository.reportExists(
      data.year!,
      data.month!
    );

    if (exists) {
      throw new BadRequestException(
        `Report already exists for ${data.month}/${data.year}`
      );
    }

    const report = await this.reportRepository.createReport(data, adminId);

    logger.info(
      { adminId, reportId: report._id, month: report.month, year: report.year },
      "Report created"
    );

    return report;
  }

  /**
   * Update report
   */
  async updateReport(
    id: string,
    data: Partial<IMonthlyReport>,
    adminId: string
  ): Promise<IMonthlyReport> {
    const report = await this.reportRepository.getReportById(id);

    if (!report) {
      throw new NotFoundException("Report not found");
    }

    // If updating month/year, check if combination exists elsewhere
    if (data.month || data.year) {
      const checkMonth = data.month ?? report.month;
      const checkYear = data.year ?? report.year;

      const exists = await this.reportRepository.getReportByYearMonth(
        checkYear,
        checkMonth
      );

      if (exists && exists._id.toString() !== id) {
        throw new BadRequestException(
          `Report already exists for ${checkMonth}/${checkYear}`
        );
      }
    }

    const updated = await this.reportRepository.updateReport(id, data, adminId);

    if (!updated) {
      throw new NotFoundException("Failed to update report");
    }

    logger.info({ adminId, reportId: id }, "Report updated");

    return updated;
  }

  /**
   * Delete report (soft delete)
   */
  async deleteReport(id: string, adminId: string): Promise<IMonthlyReport> {
    const report = await this.reportRepository.getReportById(id);

    if (!report) {
      throw new NotFoundException("Report not found");
    }

    const deleted = await this.reportRepository.deleteReport(id, adminId);

    if (!deleted) {
      throw new NotFoundException("Failed to delete report");
    }

    logger.warn({ adminId, reportId: id }, "Report deleted (soft)");

    return deleted;
  }

  /**
   * Hard delete report
   */
  async hardDeleteReport(id: string, adminId: string): Promise<void> {
    const report = await this.reportRepository.getReportById(id);

    if (!report) {
      throw new NotFoundException("Report not found");
    }

    await this.reportRepository.hardDeleteReport(id);

    logger.warn(
      {
        adminId,
        reportId: id,
        month: report.month,
        year: report.year,
      },
      "Report hard deleted (permanent)"
    );
  }

  /**
   * Get reports by year
   */
  async getReportsByYear(year: number): Promise<IMonthlyReport[]> {
    const reports = await this.reportRepository.getReportsByYear(year);

    logger.debug({ year, count: reports.length }, "Reports by year retrieved");

    return reports;
  }
}
