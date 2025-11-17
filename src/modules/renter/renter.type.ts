// file: src/modules/renter/renter.type.ts

/**
 * Renter profile creation payload
 */
export type CreateRenterProfilePayload = {
  preferredLocations?: string[];
  budgetMin?: number;
  budgetMax?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  petPreferences?: string;
  moveInFlexibilityWeeks?: number;
};

/**
 * Renter profile update payload
 */
export type UpdateRenterProfilePayload = {
  preferredLocations?: string[];
  budgetMin?: number;
  budgetMax?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  petPreferences?: string;
  moveInFlexibilityWeeks?: number;
};

/**
 * Saved request creation payload
 */
export type CreateSavedRequestPayload = {
  requestName: string;
  preferredLocations: string[];
  budgetMin: number;
  budgetMax: number;
  bedrooms: string;
  bathrooms: string;
  unitFeatures?: string[];
  buildingFeatures?: string[];
  petPolicy?: string[];
  acceptGuarantor?: string[];
  notes?: string;
  moveInDateStart?: Date;
  moveInDateEnd?: Date;
};

/**
 * Update saved request payload
 */
export type UpdateSavedRequestPayload = {
  requestName?: string;
  preferredLocations?: string[];
  budgetMin?: number;
  budgetMax?: number;
  bedrooms?: string;
  bathrooms?: string;
  unitFeatures?: string[];
  buildingFeatures?: string[];
  petPolicy?: string[];
  acceptGuarantor?: string[];
  notes?: string;
  moveInDateStart?: Date;
  moveInDateEnd?: Date;
  isActive?: boolean;
};

/**
 * Renter profile response
 */
export type RenterProfileResponse = {
  _id: string;
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
};

/**
 * Saved request response
 */
export type SavedRequestResponse = {
  _id: string;
  userId: string;
  requestName: string;
  preferredLocations: string[];
  budgetMin: number;
  budgetMax: number;
  bedrooms: string;
  bathrooms: string;
  unitFeatures: string[];
  buildingFeatures: string[];
  petPolicy: string[];
  acceptGuarantor: string[];
  notes?: string;
  moveInDateStart?: Date;
  moveInDateEnd?: Date;
  isActive: boolean;
  matchCount: number;
  createdAt: Date;
  updatedAt: Date;
};
