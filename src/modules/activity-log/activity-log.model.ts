import type { Document, Types } from "mongoose";

import { model, models } from "mongoose";

import { BaseSchemaUtil } from "@/utils/base-schema.utils";

import type { ActivityLogActionType } from "./activity-log.type";

import {
  ACTIVITY_LOG_ACTION_TYPES,

} from "./activity-log.type";

export type IActivityLog = {
  _id: Types.ObjectId;
  email: string;
  actionType: ActivityLogActionType;
  reason?: string | null;
  ipAddress?: string | null;
  createdAt: Date;
  updatedAt: Date;
} & Document;

const activityLogSchema = BaseSchemaUtil.createSchema<IActivityLog>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    actionType: {
      type: String,
      enum: ACTIVITY_LOG_ACTION_TYPES,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
  },
  {
    collection: "activity_logs",
  },
);

activityLogSchema.index({ email: 1, createdAt: -1 });
activityLogSchema.index({ actionType: 1, createdAt: -1 });

export const ActivityLog
  = models.ActivityLog
    || model<IActivityLog>("ActivityLog", activityLogSchema);
