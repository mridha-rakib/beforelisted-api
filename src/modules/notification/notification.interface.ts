//  file: src/modules/notification/notification.interface.ts

import type { Document, Types } from "mongoose";

export interface INotification extends Document {
  _id: Types.ObjectId;
  recipientId: Types.ObjectId | string;
  recipientRole: "Admin" | "Agent" | "Renter";
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "alert";
  relatedEntityType?: "Agent" | "Renter" | "Request" | "Payment";
  relatedEntityId?: Types.ObjectId | string;
  actionUrl?: string;
  actionData?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInAppNotification extends Document {
  _id: any;
  recipientRole: "Admin" | "Agent" | "Renter";
  type: string;
  title: string;
  description: string;
  relatedUserId?: string;
  relatedPreMarketRequestId?: string;
  relatedGrantAccessId?: string;
  metadata: {
    agentId?: string;
    agentName?: string;
    agentEmail?: string;
    agentPhone?: string;
    agentLicense?: string;
    propertyTitle?: string;
    renterName?: string;
    renterEmail?: string;
    location?: string;
    requestDate?: string;
    approvedAt?: string;
    rejectedAt?: string;
    reason?: string;
    [key: string]: any;
  };
  actionUrl: string;
  priority: "low" | "normal" | "high";
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationType =
  | "agent_pending_approval"
  | "agent_activated"
  | "agent_deactivated"
  | "agent_access_granted"
  | "agent_access_revoked"
  | "new_pre_market_listing"
  | "new_pre_market_listing_admin"
  | "grant_access_request"
  | "grant_access_approved"
  | "grant_access_rejected"
  | "grant_access_agent_approved"
  | "grant_access_agent_charged"
  | "grant_access_agent_rejected"
  | "pre_market_listing_deleted_by_admin"
  | "pre_market_agent_matched"
  | "pre_market_request_created";
