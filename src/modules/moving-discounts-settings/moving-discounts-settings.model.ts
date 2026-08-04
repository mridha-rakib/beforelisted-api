// file: src/modules/moving-discounts-settings/moving-discounts-settings.model.ts

import type { Document } from "mongoose";

import mongoose, { Schema } from "mongoose";

export type IMovingDiscountSettings = {
  _id: string;
  disclaimer: string;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
} & Document;

const movingDiscountSettingsSchema = new Schema<IMovingDiscountSettings>(
  {
    _id: {
      type: String,
      default: "singleton",
    },
    disclaimer: {
      type: String,
      default: "",
      maxlength: 5000,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "moving_discount_settings",
  },
);

movingDiscountSettingsSchema.statics.getSingleton = async function () {
  const doc = await this.findById("singleton");
  if (doc) return doc;
  return this.create({ _id: "singleton", disclaimer: "" });
};

export const MovingDiscountSettings = mongoose.model<IMovingDiscountSettings>(
  "MovingDiscountSettings",
  movingDiscountSettingsSchema,
);
