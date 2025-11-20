// file: src/modules/admin/admin.model.ts

import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model } from "mongoose";
import type { IAdminAnalytics } from "./admin.interface";

/**
 * Admin Analytics Schema
 */
const adminAnalyticsSchema = BaseSchemaUtil.createSchema<IAdminAnalytics>({
  date: {
    type: Date,
    required: true,
    unique: true,
    index: true,
  },
  totalUsers: {
    type: Number,
    default: 0,
  },
  totalAgents: {
    type: Number,
    default: 0,
  },
  totalRenters: {
    type: Number,
    default: 0,
  },
  totalPreMarketRequests: {
    type: Number,
    default: 0,
  },
  activePreMarketRequests: {
    type: Number,
    default: 0,
  },
  totalMatches: {
    type: Number,
    default: 0,
  },
  approvedMatches: {
    type: Number,
    default: 0,
  },
  totalRevenue: {
    type: Number,
    default: 0,
  },
  grantAccessRevenue: {
    type: Number,
    default: 0,
  },
  totalGrantAccessRequests: {
    type: Number,
    default: 0,
  },
  approvedGrantAccessRequests: {
    type: Number,
    default: 0,
  },
  averageResponseTime: {
    type: Number,
    default: 0,
  },
  suspendedAgents: {
    type: Number,
    default: 0,
  },
  newUsersToday: {
    type: Number,
    default: 0,
  },
  newMatchesToday: {
    type: Number,
    default: 0,
  },
});

// Index for efficient queries
adminAnalyticsSchema.index({ date: -1 });

export const AdminAnalytics = model<IAdminAnalytics>(
  "AdminAnalytics",
  adminAnalyticsSchema
);
