// file: src/docs/swagger/pre-market.swagger.ts
// OpenAPI endpoint definitions for Pre-Market module

export const preMarketPaths = {
  // ==========================================
  // RENTER ENDPOINTS
  // ==========================================

  "/pre-market/create": {
    post: {
      tags: ["Pre-Market Management"],
      summary: "Create pre-market request",
      description:
        "Create a new pre-market request to find properties before they're listed",
      operationId: "createPreMarketRequest",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/CreatePreMarketRequestPayload",
            },
            example: {
              movingDateRange: {
                earliest: "2024-06-01",
                latest: "2024-08-31",
              },
              priceRange: { min: 2500, max: 4500 },
              locations: [
                {
                  borough: "Manhattan",
                  neighborhoods: ["Upper West Side", "Upper East Side"],
                },
              ],
              bedrooms: ["1", "2"],
              bathrooms: ["1", "1.5", "2"],
              unitFeatures: {
                laundryInUnit: true,
                dishwasher: true,
              },
              buildingFeatures: {
                doorman: true,
                elevator: true,
              },
              petPolicy: {
                catsAllowed: true,
                dogsAllowed: true,
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Pre-market request created successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PreMarketRequestResponse" },
            },
          },
        },
        400: {
          description: "Invalid request data",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/pre-market/my-requests": {
    get: {
      tags: ["Pre-Market Management"],
      summary: "Get renter's pre-market requests",
      description:
        "Get all pre-market requests created by the authenticated renter",
      operationId: "getRenterRequests",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "page",
          in: "query",
          schema: { type: "integer", default: 1 },
          description: "Page number",
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
          description: "Items per page",
        },
        {
          name: "sort",
          in: "query",
          schema: { type: "string", default: "-createdAt" },
          description: "Sort field",
        },
      ],
      responses: {
        200: {
          description: "Renter requests retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/PaginatedPreMarketResponse",
              },
            },
          },
        },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/pre-market/{requestId}": {
    get: {
      tags: ["Pre-Market Management"],
      summary: "Get renter's request details",
      description: "Get specific pre-market request details created by renter",
      operationId: "getRenterRequestById",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "requestId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Pre-market request ID",
        },
      ],
      responses: {
        200: {
          description: "Request details retrieved",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PreMarketRequestData" },
            },
          },
        },
        404: { description: "Request not found" },
      },
    },
    put: {
      tags: ["Pre-Market Management"],
      summary: "Update pre-market request",
      description: "Update an existing pre-market request",
      operationId: "updatePreMarketRequest",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "requestId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/UpdatePreMarketRequestPayload",
            },
          },
        },
      },
      responses: {
        200: {
          description: "Request updated successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PreMarketRequestData" },
            },
          },
        },
        400: { description: "Invalid update data" },
        404: { description: "Request not found" },
      },
    },
    delete: {
      tags: ["Pre-Market Management"],
      summary: "Delete pre-market request",
      description: "Soft delete a pre-market request",
      operationId: "deletePreMarketRequest",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "requestId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "Request deleted successfully",
        },
        404: { description: "Request not found" },
      },
    },
  },

  "/pre-market/{requestId}/toggle-status": {
    put: {
      tags: ["Pre-Market Management"],
      summary: "Toggle listing activation status",
      description: "Activate or deactivate a pre-market listing",
      operationId: "toggleListingActivation",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "requestId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                isActive: {
                  type: "boolean",
                  description: "True to activate, false to deactivate",
                },
              },
              required: ["isActive"],
            },
          },
        },
      },
      responses: {
        200: {
          description: "Listing status toggled successfully",
        },
        404: { description: "Listing not found" },
      },
    },
  },

  "/pre-market/renter/requests/with-agents": {
    get: {
      tags: ["Pre-Market Management"],
      summary: "Get renter's requests with agent matches",
      description:
        "Get all renter's pre-market requests including matched agents",
      operationId: "getRenterRequestsWithAgents",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "page",
          in: "query",
          schema: { type: "integer", default: 1 },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
        },
      ],
      responses: {
        200: {
          description: "Requests with agents retrieved",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/PaginatedPreMarketWithAgentsResponse",
              },
            },
          },
        },
      },
    },
  },

  // ==========================================
  // AGENT ENDPOINTS
  // ==========================================

  "/pre-market/all": {
    get: {
      tags: ["Pre-Market - Agent"],
      summary: "Get all pre-market requests",
      description:
        "Get all available pre-market requests (agents can see property details)",
      operationId: "getAllPreMarketRequests",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "page",
          in: "query",
          schema: { type: "integer", default: 1 },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
        },
        {
          name: "locations",
          in: "query",
          schema: { type: "string" },
          description: "Filter by locations (comma-separated)",
        },
        {
          name: "minPrice",
          in: "query",
          schema: { type: "number" },
        },
        {
          name: "maxPrice",
          in: "query",
          schema: { type: "number" },
        },
      ],
      responses: {
        200: {
          description: "All requests retrieved",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/PaginatedPreMarketResponse",
              },
            },
          },
        },
      },
    },
  },

  "/pre-market/{requestId}/details": {
    get: {
      tags: ["Pre-Market - Agent"],
      summary: "Get pre-market request details",
      description:
        "Get detailed information about a pre-market request. Returns full details if agent has grant access, otherwise limited information",
      operationId: "getRequestDetails",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "requestId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "Request details retrieved",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/PreMarketRequestDetailsResponse",
              },
            },
          },
        },
        404: { description: "Request not found" },
      },
    },
  },

  // ==========================================
  // GRANT ACCESS ENDPOINTS
  // ==========================================

  "/pre-market/grant-access/request": {
    post: {
      tags: ["Pre-Market - Grant Access"],
      summary: "Request access to pre-market details",
      description: "Agent requests access to view renter information",
      operationId: "requestGrantAccess",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                preMarketRequestId: {
                  type: "string",
                  example: "507f1f77bcf86cd799439011",
                },
              },
              required: ["preMarketRequestId"],
            },
          },
        },
      },
      responses: {
        201: {
          description: "Access request created",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GrantAccessResponse" },
            },
          },
        },
        409: { description: "Access already requested or granted" },
      },
    },
  },

  "/pre-market/payment/create-intent": {
    post: {
      tags: ["Pre-Market - Grant Access"],
      summary: "Create payment intent for grant access",
      description:
        "Create Stripe payment intent for accessing pre-market request",
      operationId: "createPaymentIntent",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                grantAccessId: {
                  type: "string",
                  description: "Grant access request ID",
                },
              },
              required: ["grantAccessId"],
            },
          },
        },
      },
      responses: {
        200: {
          description: "Payment intent created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  clientSecret: { type: "string" },
                  amount: { type: "number" },
                },
              },
            },
          },
        },
        400: { description: "Invalid payment request" },
      },
    },
  },

  // ==========================================
  // ADMIN ENDPOINTS
  // ==========================================

  "/pre-market/admin/{requestId}/approve": {
    post: {
      tags: ["Pre-Market - Admin"],
      summary: "Approve grant access (free)",
      description: "Admin approves access request for free",
      operationId: "adminApproveAccess",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "requestId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                notes: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Access approved",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GrantAccessResponse" },
            },
          },
        },
      },
    },
  },

  "/pre-market/admin/{requestId}/charge": {
    post: {
      tags: ["Pre-Market - Admin"],
      summary: "Charge agent for grant access",
      description: "Admin sets charge amount and sends payment link to agent",
      operationId: "adminChargeAccess",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "requestId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                chargeAmount: {
                  type: "number",
                  minimum: 0,
                  example: 99.99,
                },
                notes: { type: "string" },
              },
              required: ["chargeAmount"],
            },
          },
        },
      },
      responses: {
        200: {
          description: "Charge set and payment link sent",
        },
      },
    },
  },

  "/pre-market/admin/{requestId}/reject": {
    post: {
      tags: ["Pre-Market - Admin"],
      summary: "Reject grant access request",
      description: "Admin rejects agent's request for access",
      operationId: "adminRejectAccess",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "requestId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                notes: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Access rejected",
        },
      },
    },
  },

  "/pre-market/admin/renter/{renterId}/listing/{listingId}/toggle": {
    put: {
      tags: ["Pre-Market - Admin"],
      summary: "Toggle listing status (admin)",
      description:
        "Admin activates or deactivates a renter's pre-market listing",
      operationId: "adminToggleListingStatus",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "renterId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "listingId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "Listing status toggled",
        },
      },
    },
  },

  "/grant-access/statistics": {
    get: {
      tags: ["Pre-Market - Admin"],
      summary: "Get grant access statistics",
      description: "Get statistics on grant access requests and payments",
      operationId: "getGrantAccessStatistics",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Statistics retrieved",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GrantAccessStatistics" },
            },
          },
        },
      },
    },
  },
};

export default preMarketPaths;
