// file: src/docs/swagger/pre-market.schemas.ts
// OpenAPI schema definitions for Pre-Market module

export const preMarketSchemas = {
  // ==========================================
  // REQUEST SCHEMAS
  // ==========================================

  CreatePreMarketRequestPayload: {
    type: "object",
    required: ["movingDateRange", "priceRange", "locations", "bathrooms"],
    properties: {
      movingDateRange: {
        type: "object",
        required: ["earliest", "latest"],
        properties: {
          earliest: {
            type: "string",
            format: "date",
            example: "2024-06-01",
            description: "Earliest preferred moving date",
          },
          latest: {
            type: "string",
            format: "date",
            example: "2024-08-31",
            description: "Latest preferred moving date",
          },
        },
      },
      priceRange: {
        type: "object",
        required: ["min", "max"],
        properties: {
          min: {
            type: "number",
            example: 2500,
            description: "Minimum monthly rent",
          },
          max: {
            type: "number",
            example: 4500,
            description: "Maximum monthly rent",
          },
        },
      },
      locations: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            borough: {
              type: "string",
              example: "Manhattan",
            },
            neighborhoods: {
              type: "array",
              minItems: 1,
              items: { type: "string" },
              example: ["Upper West Side", "Upper East Side"],
            },
          },
        },
      },
      bedrooms: {
        type: "array",
        items: {
          type: "string",
          enum: ["Studio", "1", "2", "3", "4+"],
        },
        example: ["1", "2"],
        nullable: true,
      },
      bathrooms: {
        type: "array",
        minItems: 1,
        items: {
          type: "string",
          enum: ["1", "1.5", "2", "2.5", "3+"],
        },
        example: ["1", "1.5", "2"],
      },
      unitFeatures: {
        type: "object",
        nullable: true,
        properties: {
          laundryInUnit: { type: "boolean" },
          privateOutdoorSpace: { type: "boolean" },
          dishwasher: { type: "boolean" },
        },
      },
      buildingFeatures: {
        type: "object",
        nullable: true,
        properties: {
          doorman: { type: "boolean" },
          elevator: { type: "boolean" },
          laundryInBuilding: { type: "boolean" },
        },
      },
      petPolicy: {
        type: "object",
        nullable: true,
        properties: {
          catsAllowed: { type: "boolean" },
          dogsAllowed: { type: "boolean" },
        },
      },
      guarantorRequired: {
        type: "object",
        nullable: true,
        properties: {
          personalGuarantor: { type: "boolean" },
          thirdPartyGuarantor: { type: "boolean" },
        },
      },
      preferences: {
        type: "array",
        items: { type: "string" },
        nullable: true,
        example: ["quiet neighborhood", "near subway"],
      },
    },
  },

  UpdatePreMarketRequestPayload: {
    type: "object",
    properties: {
      movingDateRange: {
        type: "object",
        properties: {
          earliest: { type: "string", format: "date" },
          latest: { type: "string", format: "date" },
        },
      },
      priceRange: {
        type: "object",
        properties: {
          min: { type: "number" },
          max: { type: "number" },
        },
      },
      bedrooms: {
        type: "array",
        items: { type: "string" },
      },
      bathrooms: {
        type: "array",
        items: { type: "string" },
      },
      locations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            borough: { type: "string" },
            neighborhoods: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
      unitFeatures: {
        type: "object",
        properties: {
          laundryInUnit: { type: "boolean" },
          privateOutdoorSpace: { type: "boolean" },
          dishwasher: { type: "boolean" },
        },
      },
      buildingFeatures: {
        type: "object",
        properties: {
          doorman: { type: "boolean" },
          elevator: { type: "boolean" },
          laundryInBuilding: { type: "boolean" },
        },
      },
      petPolicy: {
        type: "object",
        properties: {
          catsAllowed: { type: "boolean" },
          dogsAllowed: { type: "boolean" },
        },
      },
    },
  },

  // ==========================================
  // RESPONSE SCHEMAS
  // ==========================================

  PreMarketRequestResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      statusCode: { type: "integer", example: 201 },
      message: {
        type: "string",
        example: "Pre-market request created successfully",
      },
      data: {
        $ref: "#/components/schemas/PreMarketRequestData",
      },
    },
  },

  PaginatedPreMarketResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      statusCode: { type: "integer", example: 200 },
      message: { type: "string" },
      data: {
        type: "array",
        items: { $ref: "#/components/schemas/PreMarketRequestData" },
      },
      pagination: {
        type: "object",
        properties: {
          currentPage: { type: "integer" },
          totalPages: { type: "integer" },
          pageSize: { type: "integer" },
          totalCount: { type: "integer" },
        },
      },
    },
  },

  PreMarketRequestDetailsResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      statusCode: { type: "integer", example: 200 },
      message: { type: "string" },
      data: {
        allOf: [
          { $ref: "#/components/schemas/PreMarketRequestData" },
          {
            type: "object",
            properties: {
              renterInfo: {
                type: "object",
                nullable: true,
                properties: {
                  renterId: { type: "string" },
                  fullName: { type: "string" },
                  email: { type: "string", format: "email" },
                  phoneNumber: { type: "string", nullable: true },
                  registrationType: {
                    type: "string",
                    enum: ["normal", "agent_referral", "admin_referral"],
                  },
                },
              },
              canRequestAccess: { type: "boolean" },
              accessType: {
                type: "string",
                enum: ["none", "grant_access", "normal"],
              },
            },
          },
        ],
      },
    },
  },

  PaginatedPreMarketWithAgentsResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      data: {
        type: "array",
        items: {
          allOf: [
            { $ref: "#/components/schemas/PreMarketRequestData" },
            {
              type: "object",
              properties: {
                agentMatches: {
                  type: "object",
                  properties: {
                    totalCount: { type: "integer" },
                    grantAccessCount: { type: "integer" },
                    normalAccessCount: { type: "integer" },
                    agents: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/AgentMatchInfo",
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      },
      pagination: {
        type: "object",
        properties: {
          currentPage: { type: "integer" },
          totalPages: { type: "integer" },
          pageSize: { type: "integer" },
          totalCount: { type: "integer" },
        },
      },
    },
  },

  GrantAccessResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      statusCode: { type: "integer", example: 201 },
      message: { type: "string", example: "Access request created" },
      data: {
        $ref: "#/components/schemas/GrantAccessRequestData",
      },
    },
  },

  GrantAccessStatistics: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      statusCode: { type: "integer", example: 200 },
      data: {
        type: "object",
        properties: {
          totalRequests: { type: "integer", example: 45 },
          pendingRequests: { type: "integer", example: 12 },
          approvedRequests: { type: "integer", example: 20 },
          rejectedRequests: { type: "integer", example: 5 },
          paidRequests: { type: "integer", example: 8 },
          totalRevenue: { type: "number", example: 1299.92 },
          averageChargeAmount: { type: "number", example: 162.49 },
          pendingPayments: { type: "number", example: 599.97 },
          successRate: { type: "number", example: 88.5 },
        },
      },
    },
  },

  // ==========================================
  // DATA SCHEMAS
  // ==========================================

  PreMarketRequestData: {
    type: "object",
    properties: {
      _id: { type: "string" },
      requestId: {
        type: "string",
        example: "BeforeListed-abc123",
        description: "Unique request identifier",
      },
      renterId: { type: "string" },
      renterName: { type: "string", nullable: true },
      movingDateRange: {
        type: "object",
        properties: {
          earliest: { type: "string", format: "date-time" },
          latest: { type: "string", format: "date-time" },
        },
      },
      priceRange: {
        type: "object",
        properties: {
          min: { type: "number" },
          max: { type: "number" },
        },
      },
      locations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            borough: { type: "string" },
            neighborhoods: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
      bedrooms: {
        type: "array",
        items: { type: "string" },
      },
      bathrooms: {
        type: "array",
        items: { type: "string" },
      },
      status: {
        type: "string",
        enum: ["active", "completed", "deleted"],
        example: "active",
      },
      isActive: {
        type: "boolean",
        description: "Whether the listing is accepting requests",
        example: true,
      },
      viewedBy: {
        type: "object",
        properties: {
          grantAccessAgents: {
            type: "array",
            items: { type: "string" },
            description: "Agent IDs with grant access who viewed",
          },
          normalAgents: {
            type: "array",
            items: { type: "string" },
            description: "Agent IDs without grant access who viewed",
          },
        },
      },
      unitFeatures: { type: "object" },
      buildingFeatures: { type: "object" },
      petPolicy: { type: "object" },
      guarantorRequired: { type: "object" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  GrantAccessRequestData: {
    type: "object",
    properties: {
      _id: { type: "string" },
      preMarketRequestId: { type: "string" },
      agentId: { type: "string" },
      status: {
        type: "string",
        enum: ["pending", "free", "rejected", "paid"],
        example: "pending",
      },
      payment: {
        type: "object",
        properties: {
          amount: { type: "number", example: 99.99 },
          currency: { type: "string", example: "USD" },
          paymentStatus: {
            type: "string",
            enum: ["pending", "succeeded", "failed"],
          },
          stripePaymentIntentId: { type: "string", nullable: true },
          failureCount: { type: "integer" },
          failedAt: {
            type: "array",
            items: { type: "string", format: "date-time" },
          },
          succeededAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
        },
      },
      adminDecision: {
        type: "object",
        nullable: true,
        properties: {
          decidedBy: { type: "string" },
          decidedAt: { type: "string", format: "date-time" },
          notes: { type: "string", nullable: true },
          chargeAmount: { type: "number", nullable: true },
          isFree: { type: "boolean", example: false },
        },
      },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },

  AgentMatchInfo: {
    type: "object",
    properties: {
      agentId: { type: "string" },
      fullName: { type: "string" },
      email: { type: "string", format: "email" },
      accessType: {
        type: "string",
        enum: ["grant_access", "normal_access"],
      },
      requestedAt: { type: "string", format: "date-time" },
      status: {
        type: "string",
        enum: ["pending", "free", "rejected", "paid"],
      },
    },
  },
};

export default preMarketSchemas;
