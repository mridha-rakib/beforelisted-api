// file: src/modules/renter/renter.interface.ts

import type { Document, Types } from "mongoose";

/**
 * Renter Profile Document Interface
 */
export interface IRenterProfile extends Document {
  _id: Types.ObjectId;
  userId: string;
  preferredLocations?: string[];
  budgetMin?: number;
  budgetMax?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  petPreferences?: string;
  moveInFlexibilityWeeks: number;
  activeRequestsCount: number;
  totalSavedRequests: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Renter Saved Request Interface
 * Represents a saved pre-market search
 */
export interface IRenterSavedRequest extends Document {
  userId: string;
  requestName: string;
  preferredLocations: string[];
  budgetMin: number;
  budgetMax: number;
  bedrooms: string; // e.g., "2BR", "3BR", "Studio"
  bathrooms: string; // e.g., "1", "2", "3", "4+"
  unitFeatures: string[]; // e.g., ["Laundry", "Private outdoor space"]
  buildingFeatures: string[]; // e.g., ["Doorman", "Elevator"]
  petPolicy: string[]; // e.g., ["Cats allowed", "Dogs allowed"]
  acceptGuarantor: string[]; // e.g., ["Personal guarantor", "Third party guarantor"]
  notes?: string;
  moveInDateStart?: Date;
  moveInDateEnd?: Date;
  isActive: boolean;
  matchCount: number; // How many properties match this request
  createdAt: Date;
  updatedAt: Date;
}
