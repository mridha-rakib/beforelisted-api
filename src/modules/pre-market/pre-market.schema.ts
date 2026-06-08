// file: src/modules/pre-market/pre-market.schema.ts

import { z } from "zod";

import {
  bathroomSchema,
  bedroomSchema,
  movingDateRangeSchema,
  PREMARKET_CONFIG,
  priceRangeSchema,
} from "@/config/pre-market.config";

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
                  .trim(),
              )
              .min(1, "At least one neighborhood required"),
          }),
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
      shareConsent: z.boolean().optional(),
      scope: z.enum(["Upcoming", "All Market"]).default("Upcoming"),
    })
    .refine(
      data => data.movingDateRange.earliest < data.movingDateRange.latest,
      {
        message: "Earliest date must be before latest date",
        path: ["movingDateRange"],
      },
    )
    .refine(data => data.priceRange.min <= data.priceRange.max, {
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
                  .trim(),
              )
              .min(1, "At least one neighborhood required"),
          }),
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
        if (!data.movingDateRange)
          return true;
        return data.movingDateRange.earliest < data.movingDateRange.latest;
      },
      {
        message: "Earliest date must be before latest date",
        path: ["movingDateRange"],
      },
    )
    .refine(
      (data) => {
        if (!data.priceRange)
          return true;
        return data.priceRange.min <= data.priceRange.max;
      },
      {
        message: "Minimum price must be less than maximum price",
        path: ["priceRange"],
      },
    ),
});

export const requestAccessSchema = z.object({
  body: z.object({
    preMarketRequestId: z.string().min(24, "Invalid request ID"),
    representation_type: z
      .enum(["owner_representation", "renter_representation"])
      .optional(),
  }),
});

export const agentMatchRequestSchema = z.object({
  params: z.object({
    requestId: z.string().min(24, "Invalid request ID"),
  }),
  body: z
    .object({
      representation_type: z
        .enum(["owner_representation", "renter_representation"])
        .optional(),
    })
    .optional()
    .default({}),
});

const matchSectionTogglesSchema = z
  .object({
    unitFeatures: z.boolean().default(true),
    buildingFeatures: z.boolean().default(true),
    petPolicy: z.boolean().default(true),
    guarantorsPolicy: z.boolean().default(true),
    priorityBonuses: z.boolean().default(true),
  })
  .default({
    unitFeatures: true,
    buildingFeatures: true,
    petPolicy: true,
    guarantorsPolicy: true,
    priorityBonuses: true,
  });

export const agentMatchSearchSchema = z.object({
  body: z.object({
    page: z.coerce.number().positive().default(1),
    limit: z.coerce.number().positive().max(100).default(10),
    borough: z.enum(["Manhattan", "Brooklyn"]),
    neighborhood: z.string().trim().min(1, "Neighborhood is required"),
    bedrooms: bedroomSchema,
    bathrooms: bathroomSchema,
    rent: z.coerce.number().min(0, "Rent must be zero or greater"),
    movingDateRange: movingDateRangeSchema,
    unitFeatures: z
      .object({
        laundryInUnit: z.boolean().default(false),
        privateOutdoorSpace: z.boolean().default(false),
        dishwasher: z.boolean().default(false),
      })
      .default({
        laundryInUnit: false,
        privateOutdoorSpace: false,
        dishwasher: false,
      }),
    buildingFeatures: z
      .object({
        doorman: z.boolean().default(false),
        elevator: z.boolean().default(false),
        laundryInBuilding: z.boolean().default(false),
      })
      .default({
        doorman: false,
        elevator: false,
        laundryInBuilding: false,
      }),
    petPolicy: z
      .object({
        catsAllowed: z.boolean().default(false),
        dogsAllowed: z.boolean().default(false),
      })
      .default({
        catsAllowed: false,
        dogsAllowed: false,
      }),
    guarantorPolicy: z
      .object({
        personalGuarantor: z.boolean().default(false),
        thirdPartyGuarantor: z.boolean().default(false),
      })
      .default({
        personalGuarantor: false,
        thirdPartyGuarantor: false,
      }),
    availableFeatures: z
      .record(z.string(), z.boolean())
      .default({}),
    toggles: matchSectionTogglesSchema,
  }),
});

export const agentBulkMatchRequestSchema = z.object({
  body: z.object({
    requestIds: z
      .array(z.string().min(24, "Invalid request ID"))
      .min(1, "At least one request is required"),
    representation_type: z
      .enum(["owner_representation", "renter_representation"])
      .optional(),
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
    borough: z.string().optional(),
    bedroomType: z.string().optional(),
    bedrooms: z.string().optional(),
    bathrooms: z.string().optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    rent: z.coerce.number().optional(),
    movingDateEarliest: z.string().optional(),
    movingDateLatest: z.string().optional(),
    unitFeatures: z.string().optional(),
    buildingFeatures: z.string().optional(),
    petPolicy: z.string().optional(),
    guarantorRequired: z.string().optional(),
    availableFeatures: z.string().optional(),
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

export const updateRequestVisibilitySchema = z.object({
  params: z.object({
    requestId: z.string().min(24, "Invalid request ID"),
  }),
  body: z.object({
    visibility: z.enum(["PRIVATE", "SHARED"]),
  }),
});

export const toggleShareVisibilitySchema = z.object({
  params: z.object({
    requestId: z.string().min(24, "Invalid request ID"),
  }),
});

export const confirmRegistrationDisclosureSchema = z.object({
  params: z.object({
    requestId: z.string().min(24, "Invalid request ID"),
  }),
});

export const archiveRequestSchema = z.object({
  params: z.object({
    requestId: z.string().min(24, "Invalid request ID"),
  }),
  body: z.object({
    reason: z.enum([
      "registration_missing",
      "disclosure_missing",
      "search_inactive",
      "client_placed",
    ]),
  }),
});

export const unarchiveRequestSchema = z.object({
  params: z.object({
    requestId: z.string().min(24, "Invalid request ID"),
  }),
});

export const reactivateSearchSchema = z.object({
  params: z.object({
    requestId: z.string().min(24, "Invalid request ID"),
  }),
});

export const confirmActiveSearchSchema = z.object({
  query: z.object({
    token: z.string().min(16, "Invalid confirmation token"),
  }),
});

export const adminToggleListingStatusSchema = z.object({
  params: z.object({
    renterId: z.string().min(24, "Invalid renter ID"),
    listingId: z.string().min(24, "Invalid listing ID"),
  }),
  body: z.object({}),
});
