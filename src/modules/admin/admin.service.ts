// file: src/modules/admin/admin.service.ts

import { logger } from "@/middlewares/pino-logger";
import { AgentService } from "@/modules/agent/agent.service";
import { PreMarketRequestService } from "@/modules/pre-market-request/pre-market-request.service";
import { RenterService } from "@/modules/renter/renter.service";
import { RequestMatchService } from "@/modules/request-match/request-match.service";
import { UserRepository } from "@/modules/user/user.repository";
import { NotFoundException } from "@/utils/app-error.utils";
import { AdminAnalyticsRepository } from "./admin.repository";
import type {
  AdminAgentReportResponse,
  AdminDashboardMetricsResponse,
  AdminRevenueReportResponse,
  AdminSystemHealthResponse,
} from "./admin.type";

/**
 * Admin Service
 * Handles admin dashboard and analytics
 */
export class AdminService {
  private analyticsRepository: AdminAnalyticsRepository;
  private userRepository: UserRepository;
  private agentService: AgentService;
  private renterService: RenterService;
  private preMarketRequestService: PreMarketRequestService;
  private requestMatchService: RequestMatchService;

  constructor() {
    this.analyticsRepository = new AdminAnalyticsRepository();
    this.userRepository = new UserRepository();
    this.agentService = new AgentService();
    this.renterService = new RenterService();
    this.preMarketRequestService = new PreMarketRequestService();
    this.requestMatchService = new RequestMatchService();
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(): Promise<AdminDashboardMetricsResponse> {
    const totalUsers = await this.userRepository.countDocuments({});
    const agents = await this.userRepository.countDocuments({ role: "agent" });
    const renters = await this.userRepository.countDocuments({
      role: "renter",
    });

    const allPreMarketRequests =
      await this.preMarketRequestService.adminGetAllRequests();
    const totalPreMarketRequests = allPreMarketRequests.length;
    const activePreMarketRequests = allPreMarketRequests.filter(
      (r) => r.isActive
    ).length;

    const allMatches = await this.requestMatchService.adminGetAllMatches();
    const totalMatches = allMatches.length;
    const approvedMatches = allMatches.filter(
      (m) => m.status === "approved"
    ).length;

    // Get grant access stats
    const totalGrantAccessRequests = allMatches.filter(
      (m) => m.grantAccessRequested
    ).length;
    const approvedGrantAccessRequests = allMatches.filter(
      (m) => m.grantAccessApproved
    ).length;
    const totalGrantAccessRevenue = allMatches
      .filter((m) => m.grantAccessPaymentStatus === "paid")
      .reduce((sum, m) => sum + (m.grantAccessAmount || 0), 0);

    // Get agent metrics
    const agentMetrics = await this.agentService.adminGetAgentMetrics();

    // Calculate renter stats
    const totalRevenue = totalGrantAccessRevenue;
    const avgResponseTime = 24; // Placeholder - would be calculated from actual data

    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newMatchesToday = allMatches.filter(
      (m) => new Date(m.createdAt).getTime() >= today.getTime()
    ).length;

    return {
      overview: {
        totalUsers,
        totalAgents: agents,
        totalRenters: renters,
        totalRevenue,
      },
      requests: {
        totalPreMarketRequests,
        activePreMarketRequests,
        totalMatches,
        approvedMatches,
      },
      grantAccess: {
        totalRequests: totalGrantAccessRequests,
        approvedRequests: approvedGrantAccessRequests,
        totalRevenue: totalGrantAccessRevenue,
        pendingRequests: totalGrantAccessRequests - approvedGrantAccessRequests,
      },
      agents: {
        totalAgents: agentMetrics.totalAgents,
        verifiedAgents: agentMetrics.verifiedAgents,
        suspendedAgents: agentMetrics.suspendedAgents,
        approvedAgents: agentMetrics.approvedAgents,
        pendingApprovalAgents: agentMetrics.pendingApprovalAgents,
        avgSuccessRate: agentMetrics.avgSuccessRate,
      },
      renters: {
        totalRenters: renters,
        activeRenters: renters, // Would be calculated from actual user activity
        avgRequestsPerRenter:
          totalRenters > 0
            ? Math.round(totalPreMarketRequests / totalRenters)
            : 0,
      },
      todayStats: {
        newUsers: 0, // Would be calculated from createdAt
        newMatches: newMatchesToday,
        newRequests: 0, // Would be calculated from createdAt
        revenueToday: 0, // Would be calculated from today's payments
      },
    };
  }

  /**
   * Get revenue report
   */
  async getRevenueReport(
    startDate: Date,
    endDate: Date,
    period: "daily" | "weekly" | "monthly" | "yearly"
  ): Promise<AdminRevenueReportResponse> {
    const analytics = await this.analyticsRepository.getAnalyticsByDateRange(
      startDate,
      endDate
    );

    const breakdown = analytics.map((a) => ({
      date: a.date.toISOString().split("T")[0],
      revenue: a.grantAccessRevenue,
      transactions: a.approvedGrantAccessRequests,
    }));

    const totalRevenue = analytics.reduce(
      (sum, a) => sum + a.grantAccessRevenue,
      0
    );
    const grantAccessRevenue = totalRevenue;

    return {
      period,
      startDate,
      endDate,
      totalRevenue,
      grantAccessRevenue,
      breakdown,
    };
  }

  /**
   * Get agent performance report
   */
  async getAgentPerformanceReport(): Promise<AdminAgentReportResponse> {
    const allAgents = await this.agentService.adminGetAllAgents();

    // Calculate top performers
    const topPerformers = allAgents
      .map((agent) => ({
        agentId: agent._id.toString(),
        name: agent.brokerageName,
        totalMatches: agent.totalMatches,
        successRate:
          agent.totalMatches > 0
            ? Math.round((agent.successfulMatches / agent.totalMatches) * 100)
            : 0,
        grantAccessCount: agent.grantAccessCount,
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 10);

    // Calculate averages
    const totalAgents = allAgents.length;
    const verifiedAgents = allAgents.filter((a) => a.isVerified).length;
    const approvedAgents = allAgents.filter((a) => a.isApprovedByAdmin).length;
    const suspendedAgents = allAgents.filter((a) => a.isSuspended).length;
    const pendingApproval = totalAgents - approvedAgents;

    const avgMatches =
      totalAgents > 0
        ? Math.round(
            allAgents.reduce((sum, a) => sum + a.totalMatches, 0) / totalAgents
          )
        : 0;

    const avgSuccessRate =
      totalAgents > 0
        ? Math.round(
            allAgents.reduce((sum, a) => {
              const rate =
                a.totalMatches > 0
                  ? (a.successfulMatches / a.totalMatches) * 100
                  : 0;
              return sum + rate;
            }, 0) / totalAgents
          )
        : 0;

    const avgResponseTime = 24; // Placeholder

    return {
      totalAgents,
      verifiedAgents,
      approvedAgents,
      suspendedAgents,
      pendingApproval,
      topPerformers,
      avgMetrics: {
        avgMatches,
        avgSuccessRate,
        avgResponseTime,
      },
    };
  }

  /**
   * Get system health
   */
  async getSystemHealth(): Promise<AdminSystemHealthResponse> {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const memoryPercentage = Math.round(
      (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
    );

    // Placeholder values - would be calculated from actual monitoring
    const status: "healthy" | "warning" | "critical" =
      memoryPercentage > 80
        ? "critical"
        : memoryPercentage > 60
          ? "warning"
          : "healthy";

    return {
      status,
      uptime,
      memoryUsage: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        percentage: memoryPercentage,
      },
      databaseConnection: "connected", // Would check actual connection
      activeConnections: 0, // Would count from connection pool
      lastBackup: new Date(),
      errors24h: 0, // Would count from error logs
      warnings24h: 0, // Would count from warning logs
    };
  }

  /**
   * Delete user and all related data
   */
  async deleteUser(
    userId: string,
    reason: string
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    logger.info(
      { userId, reason, adminAction: true },
      "User deletion initiated"
    );

    // Delete user-specific data based on role
    if (user.role === "agent") {
      // Delete agent profile and related matches
      // Implementation would cascade delete related data
    } else if (user.role === "renter") {
      // Delete renter profile and pre-market requests
      // Implementation would cascade delete related data
    }

    // Delete user
    await this.userRepository.deleteById(userId);

    logger.info({ userId }, "User deleted successfully");

    return { message: "User deleted successfully" };
  }

  /**
   * Generate comprehensive report
   */
  async generateComprehensiveReport(
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const metrics = await this.getDashboardMetrics();
    const revenue = await this.getRevenueReport(startDate, endDate, "monthly");
    const agents = await this.getAgentPerformanceReport();
    const health = await this.getSystemHealth();

    return {
      generatedAt: new Date(),
      period: { startDate, endDate },
      metrics,
      revenue,
      agents,
      systemHealth: health,
    };
  }

  /**
   * Save analytics snapshot
   */
  async saveAnalyticsSnapshot(data: Partial<IAdminAnalytics>): Promise<void> {
    await this.analyticsRepository.upsertAnalytics(new Date(), data);
  }

  /**
   * Get historical analytics
   */
  async getHistoricalAnalytics(startDate: Date, endDate: Date): Promise<any[]> {
    return this.analyticsRepository.getAnalyticsByDateRange(startDate, endDate);
  }
}
