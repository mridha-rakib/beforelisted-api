// file: src/modules/admin/admin.interface.ts

import type { Document } from "mongoose";

/**
 * Admin Dashboard Analytics Document Interface
 */
export interface IAdminAnalytics extends Document {
  date: Date;
  totalUsers: number;
  totalAgents: number;
  totalRenters: number;
  totalPreMarketRequests: number;
  activePreMarketRequests: number;
  totalMatches: number;
  approvedMatches: number;
  totalRevenue: number;
  grantAccessRevenue: number;
  totalGrantAccessRequests: number;
  approvedGrantAccessRequests: number;
  averageResponseTime: number;
  suspendedAgents: number;
  newUsersToday: number;
  newMatchesToday: number;
  createdAt: Date;
  updatedAt: Date;
}
