// file: src/modules/renter/renter.interface.ts

import type { Document, Types } from "mongoose";

/**
 * Renter Profile Document Interface
 */
export interface IRenterProfile extends Document {
  _id: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  // Notification Preferences
  savedRequestsAlerts: boolean;
  emailNotificationsSubscribed: boolean;
  matchNotifications: boolean;
  weeklyReportDigest: boolean;
  referrerName?: string;
  referrerEmail?: string;
  acknowledgedAutoPassword?: boolean;
  // Profile Stats
  totalPreMarketRequests: number;
  activePreMarketRequests: number;
  totalMatches: number;
  approvedMatches: number;
  profileCompleteness: number;
  createdAt: Date;
  updatedAt: Date;
}
