// file: src/modules/monthly-report/monthly-report.model.ts

import mongoose, { Document, Schema } from "mongoose";

export interface IMonthlyReport extends Document {
  _id: mongoose.Types.ObjectId;
  link: string;
  month: string;
  year: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const monthlyReportSchema = new Schema<IMonthlyReport>(
  {
    link: {
      type: String,
      required: true,
      trim: true,
    },
    month: {
      type: String,
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
  }
);

// Index for sorting by year and month
monthlyReportSchema.index({ year: -1, month: -1 });
monthlyReportSchema.index({ isActive: 1 });
monthlyReportSchema.index({ year: 1, month: 1, isActive: 1 });

export const MonthlyReport = mongoose.model<IMonthlyReport>(
  "MonthlyReport",
  monthlyReportSchema
);
