// file: src/modules/notice/notice.model.ts

import mongoose, { Document, Schema, Types } from "mongoose";

export interface INotice extends Document {
  _id: Types.ObjectId;

  content: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  updatedAt: Date;
}

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
  }
);

export const Notice = mongoose.model<INotice>("Notice", noticeSchema);
