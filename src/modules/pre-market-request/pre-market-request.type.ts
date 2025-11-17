// file: src/modules/pre-market-request/pre-market-request.type.ts

/**
 * Create Pre-Market Request payload
 */
export type CreatePreMarketRequestPayload = {
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
 * Update Pre-Market Request payload (renter can only update title)
 */
export type UpdatePreMarketRequestPayload = {
  requestName?: string;
};

/**
 * Pre-Market Request response
 */
export type PreMarketRequestResponse = {
  _id: string;
  renterId: string;
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

/**
 * Pre-Market Request with renter info (for admin view)
 */
export type PreMarketRequestWithRenterInfo = PreMarketRequestResponse & {
  renterInfo?: {
    fullName: string;
    email: string;
    phoneNumber?: string;
  };
};
