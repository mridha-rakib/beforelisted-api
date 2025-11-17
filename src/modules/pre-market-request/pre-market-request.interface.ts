// file: src/modules/pre-market-request/pre-market-request.interface.ts

import type { Document, Types } from "mongoose";

/**
 * Pre-Market Request Document Interface
 * Represents a renter's pre-market listing preference/request
 */
export interface IPreMarketRequest extends Document {
  _id: Types.ObjectId;
  renterId: string; // User ID of the renter who created this
  requestName: string;
  preferredLocations: string[]; // Neighborhoods/boroughs
  budgetMin: number;
  budgetMax: number;
  bedrooms: string; // e.g., "Studio", "1BR", "2BR"
  bathrooms: string; // e.g., "1", "2", "3", "4+"
  unitFeatures: string[]; // e.g., ["Laundry in unit", "Private outdoor space"]
  buildingFeatures: string[]; // e.g., ["Doorman", "Elevator"]
  petPolicy: string[]; // e.g., ["Cats allowed", "Dogs allowed"]
  acceptGuarantor: string[]; // e.g., ["Personal guarantor", "Third party guarantor"]
  notes?: string;
  moveInDateStart?: Date;
  moveInDateEnd?: Date;
  isActive: boolean;
  matchCount: number; // How many agents have requested to match
  createdAt: Date;
  updatedAt: Date;
}
