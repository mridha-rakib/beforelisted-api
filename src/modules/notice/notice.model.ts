// file: src/modules/notice/notice.model.ts

import type { Document, Types } from "mongoose";

import mongoose, { Schema } from "mongoose";

export type INotice = {
  _id: Types.ObjectId;

  content: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  updatedAt: Date;
} & Document;

const noticeSchema = new Schema<INotice>(
  {
    content: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "notices",
  },
);

export const Notice = mongoose.model<INotice>("Notice", noticeSchema);
