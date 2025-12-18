// file: src/modules/notification/notification.model.ts

import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Schema } from "mongoose";
import type { INotification } from "./notification.interface";

const notificationSchema = BaseSchemaUtil.createSchema<INotification>({
  recipientId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  recipientRole: {
    type: String,
    enum: ["Admin", "Agent", "Renter"],
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["info", "warning", "success", "alert"],
    default: "info",
    index: true,
  } as any,
  relatedEntityType: {
    type: String,
    enum: ["Agent", "Renter", "Request", "Payment"],
    sparse: true,
  },
  relatedEntityId: {
    type: Schema.Types.ObjectId,
    sparse: true,
    index: true,
  },
  actionUrl: {
    type: String,
    sparse: true,
  },
  actionData: {
    type: Schema.Types.Mixed,
    sparse: true,
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  readAt: {
    type: Date,
    sparse: true,
  },
});

notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ recipientId: 1, type: 1 });
notificationSchema.index({ createdAt: -1 });

export const Notification = model<INotification>(
  "Notification",
  notificationSchema
);
