// file: src/docs/swagger/pre-market.swagger.ts
// OpenAPI paths for Pre-Market endpoints

export const preMarketPaths = {
  "/pre-market/create": {
    post: {
      tags: ["Pre-Market - Renter"],
      summary: "Create pre-market request",
      operationId: "createPreMarketRequest",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreatePreMarketRequest" },
          },
        },
      },
      responses: {
        "201": { description: "Pre-market request created successfully" },
        "400": { description: "Invalid payload" },
        "401": { description: "Unauthorized" },
      },
    },
  },

  "/pre-market/my-requests": {
    get: {
      tags: ["Pre-Market - Renter"],
      summary: "Get renter's own requests",
      operationId: "getRenterPreMarketRequests",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Requests retrieved successfully" },
        "401": { description: "Unauthorized" },
      },
    },
  },

  "/pre-market/renter/requests/with-agents": {
    get: {
      tags: ["Pre-Market - Renter"],
      summary: "Get renter requests with matched agents",
      operationId: "getRenterRequestsWithAgents",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Requests retrieved successfully" },
        "401": { description: "Unauthorized" },
      },
    },
  },

  "/pre-market/renter/{requestId}": {
    get: {
      tags: ["Pre-Market - Renter"],
      summary: "Get renter request by ID",
      operationId: "getRenterRequestById",
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
        "200": { description: "Request retrieved successfully" },
        "401": { description: "Unauthorized" },
        "404": { description: "Request not found" },
      },
    },
  },

  "/pre-market/agent/all-requests": {
    get: {
      tags: ["Pre-Market - Agent"],
      summary: "Get all requests assigned to agent",
      operationId: "getAllRequestsForAgent",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Requests retrieved successfully" },
        "401": { description: "Unauthorized" },
      },
    },
  },

  "/pre-market/agent/{requestId}": {
    get: {
      tags: ["Pre-Market - Agent"],
      summary: "Get request details for grant-access agent",
      operationId: "getRequestDetailsForGrantAccessAgent",
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
        "200": { description: "Request details retrieved successfully" },
        "401": { description: "Unauthorized" },
        "404": { description: "Request not found" },
      },
    },
  },

  "/pre-market/agent/{requestId}/match": {
    post: {
      tags: ["Pre-Market - Agent"],
      summary: "Match request for agent",
      operationId: "matchRequestForAgent",
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
        "200": { description: "Request matched successfully" },
        "401": { description: "Unauthorized" },
        "404": { description: "Request not found" },
      },
    },
  },

  "/pre-market/all": {
    get: {
      tags: ["Pre-Market - Agent"],
      summary: "Get all available requests",
      operationId: "getAllPreMarketRequestsForAgent",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Requests retrieved successfully" },
        "401": { description: "Unauthorized" },
      },
    },
  },

  "/pre-market/{requestId}": {
    get: {
      tags: ["Pre-Market - Agent"],
      summary: "Get request details by ID",
      description: "Agent endpoint to view a single request.",
      operationId: "getPreMarketRequestDetails",
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
        "200": { description: "Request details retrieved successfully" },
        "401": { description: "Unauthorized" },
        "404": { description: "Request not found" },
      },
    },
    put: {
      tags: ["Pre-Market - Renter"],
      summary: "Update renter request",
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
            schema: { $ref: "#/components/schemas/UpdatePreMarketRequest" },
          },
        },
      },
      responses: {
        "200": { description: "Request updated successfully" },
        "400": { description: "Invalid payload" },
        "401": { description: "Unauthorized" },
        "404": { description: "Request not found" },
      },
    },
    delete: {
      tags: ["Pre-Market - Renter"],
      summary: "Delete renter request",
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
        "200": { description: "Request deleted successfully" },
        "401": { description: "Unauthorized" },
        "404": { description: "Request not found" },
      },
    },
  },

  "/pre-market/{requestId}/details": {
    get: {
      tags: ["Pre-Market - Agent"],
      summary: "Get request details (legacy route)",
      operationId: "getPreMarketRequestDetailsLegacy",
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
        "200": { description: "Request details retrieved successfully" },
        "401": { description: "Unauthorized" },
        "404": { description: "Request not found" },
      },
    },
  },

  "/pre-market/{requestId}/visibility": {
    put: {
      tags: ["Pre-Market - Agent"],
      summary: "Update request visibility",
      operationId: "updatePreMarketRequestVisibility",
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
                visibility: {
                  type: "string",
                  enum: ["PRIVATE", "SHARED"],
                },
              },
            },
          },
        },
      },
      responses: {
        "200": { description: "Visibility updated successfully" },
        "400": { description: "Invalid payload" },
        "401": { description: "Unauthorized" },
        "404": { description: "Request not found" },
      },
    },
  },

  "/pre-market/{requestId}/toggle-share": {
    patch: {
      tags: ["Pre-Market - Agent"],
      summary: "Toggle share visibility (PRIVATE <-> SHARED)",
      operationId: "togglePreMarketRequestShareVisibility",
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
        "200": { description: "Share visibility toggled successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - only registered agent can toggle" },
        "404": { description: "Request not found" },
      },
    },
  },

  "/pre-market/{requestId}/toggle-status": {
    put: {
      tags: ["Pre-Market - Renter"],
      summary: "Toggle listing activation status",
      operationId: "togglePreMarketListingStatus",
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
        "200": { description: "Listing status toggled successfully" },
        "401": { description: "Unauthorized" },
        "404": { description: "Request not found" },
      },
    },
  },

  "/pre-market/grant-access/request": {
    post: {
      tags: ["Pre-Market - Agent"],
      summary: "Request grant access",
      operationId: "requestGrantAccess",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Grant access request submitted successfully" },
        "401": { description: "Unauthorized" },
      },
    },
  },

  "/pre-market/payment/create-intent": {
    post: {
      tags: ["Pre-Market - Agent"],
      summary: "Create payment intent for grant access",
      operationId: "createPreMarketPaymentIntent",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                requestId: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        "200": { description: "Payment intent created successfully" },
        "401": { description: "Unauthorized" },
      },
    },
  },

  "/pre-market/admin/requests": {
    get: {
      tags: ["Pre-Market - Admin"],
      summary: "Get all pre-market requests (Admin only)",
      operationId: "adminGetAllPreMarketRequests",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Requests retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },

  "/pre-market/admin/requests/{requestId}": {
    get: {
      tags: ["Pre-Market - Admin"],
      summary: "Get pre-market request by ID (Admin only)",
      operationId: "adminGetPreMarketRequestById",
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
        "200": { description: "Request retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
        "404": { description: "Request not found" },
      },
    },
    delete: {
      tags: ["Pre-Market - Admin"],
      summary: "Delete pre-market request (Admin only)",
      operationId: "adminDeletePreMarketRequest",
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
        "200": { description: "Request deleted successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
        "404": { description: "Request not found" },
      },
    },
  },

  "/pre-market/grant-access/admin/{requestId}/approve": {
    post: {
      tags: ["Pre-Market - Admin"],
      summary: "Approve grant-access request (Admin only)",
      operationId: "adminApproveGrantAccess",
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
        "200": { description: "Grant access approved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
        "404": { description: "Request not found" },
      },
    },
  },

  "/pre-market/grant-access/admin/{requestId}/charge": {
    post: {
      tags: ["Pre-Market - Admin"],
      summary: "Charge grant-access request (Admin only)",
      operationId: "adminChargeGrantAccess",
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
        "200": { description: "Charge completed successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
        "404": { description: "Request not found" },
      },
    },
  },

  "/pre-market/grant-access/admin/{requestId}/reject": {
    post: {
      tags: ["Pre-Market - Admin"],
      summary: "Reject grant-access request (Admin only)",
      operationId: "adminRejectGrantAccess",
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
        "200": { description: "Grant access rejected successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
        "404": { description: "Request not found" },
      },
    },
  },

  "/pre-market/admin/renters/{renterId}/listings/{listingId}/toggle-status": {
    put: {
      tags: ["Pre-Market - Admin"],
      summary: "Toggle renter listing status (Admin only)",
      operationId: "adminToggleRenterListingStatus",
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
        "200": { description: "Listing status toggled successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
        "404": { description: "Listing not found" },
      },
    },
  },

  "/pre-market/admin/excel-download": {
    get: {
      tags: ["Pre-Market - Admin"],
      summary: "Get consolidated pre-market excel metadata",
      operationId: "downloadPreMarketConsolidatedExcel",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Excel metadata retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },

  "/pre-market/admin/excel-renter-listings": {
    get: {
      tags: ["Pre-Market - Admin"],
      summary: "Get renter listings excel metadata",
      operationId: "downloadPreMarketRenterListingsExcel",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Excel metadata retrieved successfully" },
        "401": { description: "Unauthorized" },
      },
    },
  },

  "/pre-market/admin/excel-stats": {
    get: {
      tags: ["Pre-Market - Admin"],
      summary: "Get pre-market excel stats",
      operationId: "getPreMarketExcelStats",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Stats retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },

  "/pre-market": {
    get: {
      tags: ["Pre-Market - Admin"],
      summary: "Get all listings with complete data",
      operationId: "getAllListingsWithAllData",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Listings retrieved successfully" },
        "401": { description: "Unauthorized" },
      },
    },
  },
};

export default preMarketPaths;
