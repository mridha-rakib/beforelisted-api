// file: src/modules/pre-market/pre-market-notification.types.ts

import type { Types } from "mongoose";

export interface IPreMarketNotificationPayloadAgent {
  agentId: string | Types.ObjectId;
  agentName: string;
  preMarketRequestId: string | Types.ObjectId;
  requestName: string;
  listingTitle: string;
  location: string;
  serviceType: string;

  actionUrl: string;
}

/**
 * Pre-market in-app notification payload for admin
 * Includes renter information
 */
export interface IPreMarketNotificationPayloadAdmin {
  adminId: string | Types.ObjectId;
  preMarketRequestId: string | Types.ObjectId;
  requestName: string;
  listingTitle: string;
  location: string;
  serviceType: string;
  renterName: string;
  renterEmail: string;
  renterPhone: string;
  renterUserId: string | Types.ObjectId;
  actionUrl: string;
}

/**
 * Combined payload for notifying all agents and admin
 */
export interface IPreMarketNotificationBatchPayload {
  agentNotifications: IPreMarketNotificationPayloadAgent[];
  adminNotification: IPreMarketNotificationPayloadAdmin;
}

/**
 * Response from creating pre-market notifications
 */
export interface IPreMarketNotificationCreateResponse {
  agentNotificationsCreated: number;
  adminNotificationCreated: boolean;
  success: boolean;
  message: string;
}
