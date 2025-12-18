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

export type NotificationType =
  | "agent_pending_approval"
  | "agent_activated"
  | "agent_deactivated"
  | "agent_access_granted"
  | "agent_access_revoked"
  | "admin_new_agent_registered"
  | "general_info"
  | "general_alert";
