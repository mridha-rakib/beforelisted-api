// file: src/modules/monthly-report/monthly-report.model.ts

import type { Document } from "mongoose";

import mongoose, { Schema } from "mongoose";

export type IMonthlyReport = {
  _id: mongoose.Types.ObjectId;
  link: string;
  month: number;
  year: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
} & Document;

const monthlyReportSchema = new Schema<IMonthlyReport>(
  {
    link: {
      type: String,
      required: true,
      trim: true,
    },
    month: {
      type: Number,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "monthly_reports",
  },
);

// Index for sorting by year and month
monthlyReportSchema.index({ year: -1, month: -1 });
monthlyReportSchema.index({ isActive: 1 });
monthlyReportSchema.index({ year: 1, month: 1, isActive: 1 });

export const MonthlyReport = mongoose.model<IMonthlyReport>(
  "MonthlyReport",
  monthlyReportSchema,
);
