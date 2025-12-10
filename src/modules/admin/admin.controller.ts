// file: src/modules/admin/controllers/admin-pre-market.controller.ts

import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { logger } from "@/middlewares/pino-logger";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import {
  adminPreMarketDetailSchema,
  adminPreMarketListSchema,
} from "../schemas/admin-pre-market.schema";
import { AdminPreMarketService } from "../services/admin-pre-market.service";

export class AdminPreMarketController {
  private service: AdminPreMarketService;

  constructor() {
    this.service = new AdminPreMarketService();
  }

  /**
   * GET /admin/pre-market/list
   * Get all pre-market requests with filters, pagination, and enriched data
   * Protected: Admins only
   *
   * Query Parameters:
   * - page: number (default: 1)
   * - limit: number (default: 10, max: 100)
   * - borough: string (e.g., "Manhattan", "Brooklyn")
   * - neighborhood: string
   * - minPrice: number
   * - maxPrice: number
   * - bedrooms: string (comma-separated, e.g., "1BR,2BR,3BR")
   * - bathrooms: string (comma-separated, e.g., "1,2,3")
   * - status: "active" | "archived" | "deleted"
   * - registrationType: "normal" | "agent_referral" | "admin_referral"
   * - emailVerified: boolean
   * - dateFrom: ISO date string
   * - dateTo: ISO date string
   * - sort: string (default: "-createdAt")
   */
  getAllPreMarketRequests = asyncHandler(
    async (req: Request, res: Response) => {
      const validated = await zParse(adminPreMarketListSchema, req);
      const adminId = req.user!.userId;

      const result = await this.service.getAllPreMarketRequests(
        validated.query
      );

      logger.info(
        {
          adminId,
          totalRequests: result.data.length,
          page: validated.query.page,
          limit: validated.query.limit,
          filters: {
            borough: validated.query.borough,
            neighborhood: validated.query.neighborhood,
            minPrice: validated.query.minPrice,
            maxPrice: validated.query.maxPrice,
            bedrooms: validated.query.bedrooms,
            bathrooms: validated.query.bathrooms,
          },
        },
        "Admin accessed pre-market list"
      );

      return ApiResponse.paginated(
        res,
        result.data,
        result.pagination,
        "Pre-market requests retrieved"
      );
    }
  );

  /**
   * GET /admin/pre-market/:requestId
   * Get single pre-market request with COMPLETE details:
   * - Renter information (name, email, phone, registration type, email verification, account status)
   * - Referral information (if referred by agent/admin)
   * - Complete request details (location, price, bedrooms, bathrooms, features, pet policy, guarantor, moving dates)
   * - Payment information (charge amount, payment status, payment date)
   * - Agent request statistics (total: 5, approved: 2, pending: 3, rejected: 0)
   * Protected: Admins only
   */
  getPreMarketRequestDetail = asyncHandler(
    async (req: Request, res: Response) => {
      const validated = await zParse(adminPreMarketDetailSchema, req);
      const adminId = req.user!.userId;
      const { requestId } = validated.params;

      const request = await this.service.getPreMarketRequestDetail(requestId);

      logger.info(
        {
          adminId,
          requestId,
          renterId: request.renter._id,
          agentRequests: request.agentRequests.total,
          paymentStatus: request.payment.paymentStatus,
        },
        "Admin viewed pre-market request details"
      );

      return ApiResponse.success(
        res,
        request,
        "Pre-market request details retrieved"
      );
    }
  );

  /**
   * GET /admin/pre-market/statistics
   * Get summary statistics for admin dashboard
   * Returns:
   * - Total pre-market requests
   * - Active requests count
   * - Archived requests count
   * - Total agents requesting
   * - Payment pending count
   * - Payment succeeded count
   * Protected: Admins only
   */
  getSummaryStatistics = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.userId;

    const stats = await this.service.getSummaryStatistics();

    logger.info({ adminId, stats }, "Admin accessed pre-market statistics");

    return ApiResponse.success(res, stats, "Summary statistics retrieved");
  });
}
