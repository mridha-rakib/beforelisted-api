// file: src/modules/notice/notice.model.ts

import mongoose, { Document, Schema } from "mongoose";

export interface INotice extends Document {
  _id: mongoose.Types.ObjectId;

  content: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
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

noticeSchema.index({ _id: 1 }, { unique: true });

export const Notice = mongoose.model<INotice>("Notice", noticeSchema);
