// file: src/modules/moving-discounts/moving-discounts.model.ts

import type { Document } from "mongoose";

import mongoose, { Schema } from "mongoose";

export type IMovingDiscountCategory = {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  order: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
} & Document;

export type IMovingDiscountItem = {
  _id: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  companyName: string;
  discount: string;
  description: string;
  link: string;
  order: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
} & Document;

const movingDiscountCategorySchema = new Schema<IMovingDiscountCategory>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
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
    collection: "moving_discount_categories",
  },
);

movingDiscountCategorySchema.index({ order: 1, createdAt: -1 });
movingDiscountCategorySchema.index({ isActive: 1 });

const movingDiscountItemSchema = new Schema<IMovingDiscountItem>(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "MovingDiscountCategory",
      required: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    discount: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    link: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
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
    collection: "moving_discount_items",
  },
);

movingDiscountItemSchema.index({ categoryId: 1, order: 1, createdAt: -1 });
movingDiscountItemSchema.index({ isActive: 1 });

export const MovingDiscountCategory = mongoose.model<IMovingDiscountCategory>(
  "MovingDiscountCategory",
  movingDiscountCategorySchema,
);

export const MovingDiscountItem = mongoose.model<IMovingDiscountItem>(
  "MovingDiscountItem",
  movingDiscountItemSchema,
);
