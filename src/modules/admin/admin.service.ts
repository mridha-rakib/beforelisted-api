// file: src/modules/admin/services/admin-pre-market.service.ts

import { logger } from "@/middlewares/pino-logger";
import { NotFoundException } from "@/utils/app-error.utils";
import { AdminPreMarketRepository } from "../repositories/admin-pre-market.repository";
import type {
  AdminPreMarketDetail,
  AdminPreMarketFilterQuery,
  AdminPreMarketListResponse,
} from "../types/admin-pre-market.type";

export class AdminPreMarketService {
  private repository: AdminPreMarketRepository;

  constructor() {
    this.repository = new AdminPreMarketRepository();
  }

  /**
   * Get all pre-market requests for admin dashboard
   * Includes comprehensive details: renter, referral, payment, agent requests
   */
  async getAllPreMarketRequests(
    filters: AdminPreMarketFilterQuery
  ): Promise<AdminPreMarketListResponse> {
    logger.info(
      { filters },
      "🔍 Admin fetching all pre-market requests with filters"
    );

    const result =
      await this.repository.getAllPreMarketRequestsForAdmin(filters);

    logger.info(
      {
        totalRequests: result.data.length,
        totalCount: result.pagination.total,
        page: result.pagination.page,
      },
      "✅ Pre-market requests retrieved for admin"
    );

    return {
      ...result,
      summary: {
        totalRequests: result.pagination.total,
        activeRequests: result.data.filter((r) => r.status === "active").length,
        archivedRequests: result.data.filter((r) => r.status === "archived")
          .length,
        totalAgentsRequesting: result.data.reduce(
          (sum, r) => sum + r.agentRequests.total,
          0
        ),
      },
    };
  }

  /**
   * Get single pre-market request details for admin
   */
  async getPreMarketRequestDetail(
    requestId: string
  ): Promise<AdminPreMarketDetail> {
    logger.info({ requestId }, "🔍 Admin fetching pre-market request details");

    try {
      const request =
        await this.repository.getPreMarketRequestDetailForAdmin(requestId);

      if (!request) {
        throw new NotFoundException("Pre-market request not found");
      }

      logger.info({ requestId }, "✅ Pre-market request details retrieved");
      return request;
    } catch (error) {
      logger.error(
        { error, requestId },
        "Error fetching pre-market request details"
      );
      throw error;
    }
  }

  /**
   * Get summary statistics for admin dashboard
   * Aggregates data from all pre-market requests
   */
  async getSummaryStatistics(): Promise<{
    totalRequests: number;
    activeRequests: number;
    archivedRequests: number;
    totalAgentsRequesting: number;
    totalPaymentPending: number;
    totalPaymentSucceeded: number;
  }> {
    logger.info({}, "📊 Fetching admin summary statistics");

    try {
      // Get all requests without pagination for statistics
      const allRequests = await this.repository.getAllPreMarketRequestsForAdmin(
        {
          page: 1,
          limit: 10000, // Get all
        }
      );

      const stats = {
        totalRequests: allRequests.pagination.total,
        activeRequests: allRequests.data.filter((r) => r.status === "active")
          .length,
        archivedRequests: allRequests.data.filter(
          (r) => r.status === "archived"
        ).length,
        totalAgentsRequesting: allRequests.data.reduce(
          (sum, r) => sum + r.agentRequests.total,
          0
        ),
        totalPaymentPending: allRequests.data.filter(
          (r) => r.payment.paymentStatus === "pending"
        ).length,
        totalPaymentSucceeded: allRequests.data.filter(
          (r) => r.payment.paymentStatus === "succeeded"
        ).length,
      };

      logger.info(stats, "✅ Summary statistics retrieved");
      return stats;
    } catch (error) {
      logger.error({ error }, "Error fetching summary statistics");
      throw error;
    }
  }
}
