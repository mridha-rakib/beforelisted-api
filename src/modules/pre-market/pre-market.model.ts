// file: src/modules/pre-market/pre-market.model.ts

import { BaseSchemaUtil } from "@/utils/base-schema.utils";
import { model, Types, type Document, type Query } from "mongoose";

export interface IPreMarketRequest extends Document {
  requestId: string;
  renterId: Types.ObjectId | string;
  requestName: string;
  description?: string;

  movingDateRange: {
    earliest: Date;
    latest: Date;
  };

  priceRange: {
    min: number;
    max: number;
  };

  locations: Array<{
    borough: string;
    neighborhoods: string[];
  }>;
  bedrooms: string[];
  bathrooms: string[];

  unitFeatures?: {
    laundryInUnit: boolean;
    privateOutdoorSpace: boolean;
    dishwasher: boolean;
  };

  buildingFeatures?: {
    doorman: boolean;
    elevator: boolean;
    laundryInBuilding: boolean;
  };

  petPolicy?: {
    catsAllowed: boolean;
    dogsAllowed: boolean;
  };

  guarantorRequired?: {
    personalGuarantor: boolean;
    thirdPartyGuarantor: boolean;
  };

  preferences: string[];

  shareConsent: boolean;
  scope: "Upcoming" | "All Market";
  visibility: "PRIVATE" | "SHARED";
  referralAgentId?: Types.ObjectId | string;

  status: "Available" | "match" | "matched" | "deleted";
  isActive: boolean;
  viewedBy: {
    grantAccessAgents: Types.ObjectId[];
    normalAgents: Types.ObjectId[];
  };

  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  requestNumber: number;
}

const preMarketSchema = BaseSchemaUtil.createSchema({
  requestId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  requestNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 1,
  },
  renterId: {
    type: Types.ObjectId,
    ref: "Renter",
    required: true,
    index: true,
  },

  requestName: {
    type: String,
    required: true,
    index: true,
  },

  description: {
    type: String,
    maxlength: 500,
  },

  movingDateRange: {
    earliest: { type: Date, required: true },
    latest: { type: Date, required: true },
  },

  priceRange: {
    min: { type: Number, required: true, min: 0 },
    max: { type: Number, required: true, min: 0 },
  },

  locations: [
    {
      borough: {
        type: String,
        required: true,
        index: true,
      },
      neighborhoods: [
        {
          type: String,
          required: true,
        },
      ],
      _id: false,
    },
  ],
  bedrooms: [],
  bathrooms: [
    {
      type: String,
      enum: ["1", "2", "3", "4+"],
    },
  ],

  unitFeatures: {
    laundryInUnit: { type: Boolean, default: false, required: false },
    privateOutdoorSpace: { type: Boolean, default: false, required: false },
    dishwasher: { type: Boolean, default: false, required: false },
  },

  buildingFeatures: {
    doorman: { type: Boolean, default: false },
    elevator: { type: Boolean, default: false },
    laundryInBuilding: { type: Boolean, default: false },
  },

  petPolicy: {
    catsAllowed: { type: Boolean, default: false },
    dogsAllowed: { type: Boolean, default: false },
  },

  guarantorRequired: {
    personalGuarantor: { type: Boolean, default: false },
    thirdPartyGuarantor: { type: Boolean, default: false },
  },

  status: {
    type: String,
    enum: ["Available", "match", "matched", "deleted"],
    default: "Available",
    index: true,
  } as any,

  isActive: {
    type: Boolean,
    default: true,
    index: true,
  } as any,
  preferences: [],

  shareConsent: {
    type: Boolean,
    default: false,
    index: true,
  } as any,
  scope: {
    type: String,
    enum: ["Upcoming", "All Market"],
    default: "Upcoming",
    index: true,
  } as any,
  visibility: {
    type: String,
    enum: ["PRIVATE", "SHARED"],
    default: "PRIVATE",
    index: true,
  } as any,
  referralAgentId: {
    type: Types.ObjectId,
    ref: "User",
    index: true,
    sparse: true,
  } as any,

  viewedBy: {
    grantAccessAgents: [
      {
        type: Types.ObjectId,
        ref: "User",
      },
    ],
    normalAgents: [
      {
        type: Types.ObjectId,
        ref: "User",
      },
    ],
  },

  ...BaseSchemaUtil.mergeDefinitions(BaseSchemaUtil.softDeleteFields()),
});

// INDEXES

preMarketSchema.index({ renterId: 1, status: 1 });
preMarketSchema.index({ renterId: 1, isActive: 1 });
preMarketSchema.index({ status: 1, createdAt: -1 });
preMarketSchema.index({ locations: 1 });
preMarketSchema.index({ "priceRange.min": 1, "priceRange.max": 1 });
preMarketSchema.index({ "viewedBy.grantAccessAgents": 1 });
preMarketSchema.index({ "viewedBy.normalAgents": 1 });
preMarketSchema.index({ referralAgentId: 1 });
preMarketSchema.index({ visibility: 1 });
preMarketSchema.index({ referralAgentId: 1, visibility: 1, createdAt: -1 });

// MIDDLEWARE

preMarketSchema.pre(/^find/, function (this: Query<any, any>) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
});

export const PreMarketRequestModel = model<IPreMarketRequest>(
  "PreMarketRequest",
  preMarketSchema as any
);
