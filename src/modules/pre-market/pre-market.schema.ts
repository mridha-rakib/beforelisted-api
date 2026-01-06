// file: src/modules/pre-market/pre-market.schema.ts

import {
  PREMARKET_CONFIG,
  bathroomSchema,
  bedroomSchema,
  movingDateRangeSchema,
  priceRangeSchema,
} from "@/config/pre-market.config";
import { z } from "zod";

export const createPreMarketRequestSchema = z.object({
  body: z
    .object({
      movingDateRange: movingDateRangeSchema,
      priceRange: priceRangeSchema,
      locations: z
        .array(
          z.object({
            borough: z.string(),
            neighborhoods: z
              .array(
                z
                  .string()
                  .min(1, "Neighborhood cannot be empty")
                  .max(100)
                  .trim()
              )
              .min(1, "At least one neighborhood required"),
          })
        )
        .min(1, "At least one location required"),
      bedrooms: z.array(bedroomSchema).optional(),
      bathrooms: z
        .array(bathroomSchema)
        .min(1, "At least one bathroom type required"),
      description: z
        .string()
        .max(PREMARKET_CONFIG.DESCRIPTION_MAX_LENGTH)
        .optional(),
      unitFeatures: z
        .object({
          laundryInUnit: z.boolean().optional(),
          privateOutdoorSpace: z.boolean().optional(),
          dishwasher: z.boolean().optional(),
        })
        .optional(),
      buildingFeatures: z
        .object({
          doorman: z.boolean().optional(),
          elevator: z.boolean().optional(),
          laundryInBuilding: z.boolean().optional(),
        })
        .optional(),
      petPolicy: z
        .object({
          catsAllowed: z.boolean().optional(),
          dogsAllowed: z.boolean().optional(),
        })
        .optional(),
      guarantorRequired: z
        .object({
          personalGuarantor: z.boolean().default(false),
          thirdPartyGuarantor: z.boolean().default(false),
        })
        .optional(),
      preferences: z.array(z.string().trim()).optional(),
    })
    .refine(
      (data) => data.movingDateRange.earliest < data.movingDateRange.latest,
      {
        message: "Earliest date must be before latest date",
        path: ["movingDateRange"],
      }
    )
    .refine((data) => data.priceRange.min <= data.priceRange.max, {
      message: "Minimum price must be less than maximum price",
      path: ["priceRange"],
    }),
});



export const updatePreMarketRequestSchema = z.object({
  body: z
    .object({
      movingDateRange: movingDateRangeSchema.optional(),
      priceRange: priceRangeSchema.optional(),
      locations: z
        .array(
          z.object({
            borough: z.string(),
            neighborhoods: z
              .array(
                z
                  .string()
                  .min(1, "Neighborhood cannot be empty")
                  .max(100)
                  .trim()
              )
              .min(1, "At least one neighborhood required"),
          })
        )
        .optional(),
      bedrooms: z.array(bedroomSchema).optional(),
      bathrooms: z.array(bathroomSchema).optional(),
      unitFeatures: z
        .object({
          laundryInUnit: z.boolean().default(false),
          privateOutdoorSpace: z.boolean().default(false),
          dishwasher: z.boolean().default(false),
        })
        .optional(),
      buildingFeatures: z
        .object({
          doorman: z.boolean().default(false),
          elevator: z.boolean().default(false),
          laundryInBuilding: z.boolean().default(false),
        })
        .optional(),
      petPolicy: z
        .object({
          catsAllowed: z.boolean().optional(),
          dogsAllowed: z.boolean().optional(),
        })
        .optional(),
      guarantorRequired: z
        .object({
          personalGuarantor: z.boolean().optional(),
          thirdPartyGuarantor: z.boolean().optional(),
        })
        .optional(),
    })
    .refine(
      (data) => {
        if (!data.movingDateRange) return true;
        return data.movingDateRange.earliest < data.movingDateRange.latest;
      },
      {
        message: "Earliest date must be before latest date",
        path: ["movingDateRange"],
      }
    )
    .refine(
      (data) => {
        if (!data.priceRange) return true;
        return data.priceRange.min <= data.priceRange.max;
      },
      {
        message: "Minimum price must be less than maximum price",
        path: ["priceRange"],
      }
    ),
});


export const requestAccessSchema = z.object({
  body: z.object({
    preMarketRequestId: z.string().min(24, "Invalid request ID"),
  }),
});

export const agentMatchRequestSchema = z.object({
  params: z.object({
    requestId: z.string().min(24, "Invalid request ID"),
  }),
});


export const adminApproveSchema = z.object({
  params: z.object({
    requestId: z.string().min(24, "Invalid request ID"),
  }),
  body: z.object({
    notes: z.string().optional(),
  }),
});

export const adminChargeSchema = z.object({
  params: z.object({
    requestId: z.string().min(24, "Invalid request ID"),
  }),
  body: z.object({
    chargeAmount: z.number().min(0, "Invalid charge amount"),
    notes: z.string().optional(),
  }),
});

export const adminRejectSchema = z.object({
  params: z.object({
    requestId: z.string().min(24, "Invalid request ID"),
  }),
  body: z.object({
    notes: z.string().optional(),
  }),
});

export const preMarketListSchema = z.object({
  query: z.object({
    page: z.coerce.number().positive().default(1),
    limit: z.coerce
      .number()
      .positive()
      .max(PREMARKET_CONFIG.MAX_LIMIT)
      .default(PREMARKET_CONFIG.DEFAULT_LIMIT),
    sort: z.string().default("-createdAt"),
    locations: z.string().optional(),
    bedroomType: z.string().optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
  }),
});

export const toggleListingActivationSchema = z.object({
  params: z.object({
    requestId: z.string().min(24, "Invalid request ID"),
  }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

export const adminToggleListingStatusSchema = z.object({
  params: z.object({
    renterId: z.string().min(24, "Invalid renter ID"),
    listingId: z.string().min(24, "Invalid listing ID"),
  }),
  body: z.object({}),
});
