// file: src/modules/monthly-report/monthly-report.repository.ts

import { BaseRepository } from "@/modules/base/base.repository";
import { MonthlyReport, type IMonthlyReport } from "./monthly-report.model";

export class MonthlyReportRepository extends BaseRepository<IMonthlyReport> {
  constructor() {
    super(MonthlyReport);
  }

  /**
   * Get all active reports (public view)
   */
  async getAllActiveReports(): Promise<IMonthlyReport[]> {
    return this.model
      .find({ isActive: true })
      .sort({ year: -1, month: -1 })
      .populate("createdBy", "fullName email");
  }

  /**
   * Get all reports (including inactive)
   */
  async getAllReports(): Promise<IMonthlyReport[]> {
    return this.model
      .find()
      .sort({ year: -1, month: -1 })
      .populate("createdBy", "fullName email")
      .populate("updatedBy", "fullName email");
  }

  /**
   * Get single report by ID
   */
  async getReportById(id: string): Promise<IMonthlyReport | null> {
    return this.model
      .findById(id)
      .populate("createdBy", "fullName email")
      .populate("updatedBy", "fullName email");
  }

  /**
   * Get report by year and month
   */
  async getReportByYearMonth(
    year: number,
    month: number
  ): Promise<IMonthlyReport | null> {
    return this.model
      .findOne({ year, month })
      .populate("createdBy", "fullName email");
  }

  /**
   * Create new report
   */
  async createReport(
    data: Partial<IMonthlyReport>,
    createdBy: string
  ): Promise<IMonthlyReport> {
    const report = new this.model({
      ...data,
      createdBy,
    });
    return report.save();
  }

  /**
   * Update report
   */
  async updateReport(
    id: string,
    data: Partial<IMonthlyReport>,
    updatedBy: string
  ): Promise<IMonthlyReport | null> {
    return this.model.findByIdAndUpdate(
      id,
      {
        ...data,
        updatedBy,
        updatedAt: new Date(),
      },
      { new: true }
    );
  }

  /**
   * Delete report (soft delete)
   */
  async deleteReport(
    id: string,
    updatedBy: string
  ): Promise<IMonthlyReport | null> {
    return this.model.findByIdAndUpdate(
      id,
      {
        isActive: false,
        updatedBy,
        updatedAt: new Date(),
      },
      { new: true }
    );
  }

  /**
   * Hard delete report
   */
  async hardDeleteReport(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id);
  }

  /**
   * Get reports by year
   */
  async getReportsByYear(year: number): Promise<IMonthlyReport[]> {
    return this.model
      .find({ year, isActive: true })
      .sort({ month: -1 })
      .populate("createdBy", "fullName email");
  }

  /**
   * Check if report exists for year/month
   */
  async reportExists(year: number, month: number): Promise<boolean> {
    const count = await this.model.countDocuments({ year, month });
    return count > 0;
  }
}
