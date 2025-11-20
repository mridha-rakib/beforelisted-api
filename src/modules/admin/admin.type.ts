// file: src/modules/admin/admin.type.ts

/**
 * Dashboard metrics response
 */
export type AdminDashboardMetricsResponse = {
  overview: {
    totalUsers: number;
    totalAgents: number;
    totalRenters: number;
    totalRevenue: number;
  };
  requests: {
    totalPreMarketRequests: number;
    activePreMarketRequests: number;
    totalMatches: number;
    approvedMatches: number;
  };
  grantAccess: {
    totalRequests: number;
    approvedRequests: number;
    totalRevenue: number;
    pendingRequests: number;
  };
  agents: {
    totalAgents: number;
    verifiedAgents: number;
    suspendedAgents: number;
    approvedAgents: number;
    pendingApprovalAgents: number;
    avgSuccessRate: number;
  };
  renters: {
    totalRenters: number;
    activeRenters: number;
    avgRequestsPerRenter: number;
  };
  todayStats: {
    newUsers: number;
    newMatches: number;
    newRequests: number;
    revenueToday: number;
  };
};

/**
 * Revenue report response
 */
export type AdminRevenueReportResponse = {
  period: "daily" | "weekly" | "monthly" | "yearly";
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  grantAccessRevenue: number;
  breakdown: Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>;
};

/**
 * Agent report response
 */
export type AdminAgentReportResponse = {
  totalAgents: number;
  verifiedAgents: number;
  approvedAgents: number;
  suspendedAgents: number;
  pendingApproval: number;
  topPerformers: Array<{
    agentId: string;
    name: string;
    totalMatches: number;
    successRate: number;
    grantAccessCount: number;
  }>;
  avgMetrics: {
    avgMatches: number;
    avgSuccessRate: number;
    avgResponseTime: number;
  };
};

/**
 * Delete user payload
 */
export type AdminDeleteUserPayload = {
  reason: string;
};

/**
 * Generate report payload
 */
export type AdminGenerateReportPayload = {
  reportType: "revenue" | "agents" | "renters" | "matches" | "comprehensive";
  startDate: Date;
  endDate: Date;
  format: "json" | "csv" | "pdf";
};

/**
 * System health response
 */
export type AdminSystemHealthResponse = {
  status: "healthy" | "warning" | "critical";
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  databaseConnection: "connected" | "disconnected";
  activeConnections: number;
  lastBackup: Date;
  errors24h: number;
  warnings24h: number;
};
