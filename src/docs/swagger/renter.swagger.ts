// file: src/docs/swagger/renter.swagger.ts
// OpenAPI paths for Renter endpoints

export const renterPaths = {
  "/renter/register": {
    post: {
      tags: ["Renter Management"],
      summary: "Register renter (auto-detect type)",
      description:
        "Register a renter and auto-detect flow (normal, agent referral, or admin referral).",
      operationId: "registerRenter",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/RenterRegisterRequest" },
          },
        },
      },
      responses: {
        "201": { description: "Renter registered successfully" },
        "400": { description: "Invalid input" },
        "409": { description: "Conflict - email already exists" },
      },
    },
  },

  "/renter/register/normal": {
    post: {
      tags: ["Renter Management"],
      summary: "Register normal renter",
      description: "Register renter without referral code.",
      operationId: "registerNormalRenter",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/NormalRenterRegisterRequest" },
          },
        },
      },
      responses: {
        "201": { description: "Normal renter registered successfully" },
        "400": { description: "Invalid input" },
        "409": { description: "Conflict - email already exists" },
      },
    },
  },

  "/renter/register/agent-referral": {
    post: {
      tags: ["Renter Management"],
      summary: "Register renter with agent referral",
      description: "Register renter using an agent referral code.",
      operationId: "registerAgentReferralRenter",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/AgentReferralRenterRegisterRequest",
            },
          },
        },
      },
      responses: {
        "201": { description: "Renter registered via agent referral" },
        "400": { description: "Invalid input" },
        "409": { description: "Conflict - email already exists" },
      },
    },
  },

  "/renter/register/admin-referral": {
    post: {
      tags: ["Renter Management"],
      summary: "Register renter with admin referral",
      description:
        "Register renter using an admin referral code (passwordless flow).",
      operationId: "registerAdminReferralRenter",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/AdminReferralRenterRegisterRequest",
            },
          },
        },
      },
      responses: {
        "201": { description: "Renter registered via admin referral" },
        "400": { description: "Invalid input" },
        "409": { description: "Conflict - email already exists" },
      },
    },
  },

  "/renter/profile": {
    get: {
      tags: ["Renter Management"],
      summary: "Get renter profile",
      description: "Retrieve authenticated renter profile.",
      operationId: "getRenterProfile",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Profile retrieved successfully" },
        "401": { description: "Unauthorized" },
      },
    },
    put: {
      tags: ["Renter Management"],
      summary: "Update renter profile",
      description: "Update authenticated renter profile.",
      operationId: "updateRenterProfile",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateRenterProfileRequest" },
          },
        },
      },
      responses: {
        "200": { description: "Profile updated successfully" },
        "400": { description: "Invalid input data" },
        "401": { description: "Unauthorized" },
      },
    },
    delete: {
      tags: ["Renter Management"],
      summary: "Delete renter profile",
      description: "Soft-delete authenticated renter profile.",
      operationId: "deleteRenterProfile",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Profile deleted successfully" },
        "401": { description: "Unauthorized" },
      },
    },
  },

  "/renter/email-subscription/toggle": {
    post: {
      tags: ["Renter Management"],
      summary: "Toggle renter email subscription",
      description: "Enable or disable email notifications for the renter.",
      operationId: "toggleRenterEmailSubscription",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Email subscription updated successfully" },
        "401": { description: "Unauthorized" },
      },
    },
  },

  "/renter/admin/excel-download": {
    get: {
      tags: ["Renter Management - Admin"],
      summary: "Get renters consolidated excel metadata",
      description:
        "Retrieve downloadable metadata for renters consolidated excel file.",
      operationId: "downloadRentersConsolidatedExcel",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Excel metadata retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },

  "/renter/admin/renters": {
    get: {
      tags: ["Renter Management - Admin"],
      summary: "Get all renters (Admin only)",
      description:
        "Retrieve renters with pagination and optional account-status filter.",
      operationId: "getAllRentersForAdmin",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "page",
          in: "query",
          schema: { type: "integer", example: 1 },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", example: 10 },
        },
        {
          name: "accountStatus",
          in: "query",
          schema: { type: "string", example: "active" },
        },
      ],
      responses: {
        "200": { description: "Renters retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },

  "/renter/admin/renters/{renterId}": {
    get: {
      tags: ["Renter Management - Admin"],
      summary: "Get renter details (Admin only)",
      description: "Get renter details, referral data, and listings by renter ID.",
      operationId: "getRenterDetailsForAdmin",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "renterId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": { description: "Renter details retrieved successfully" },
        "400": { description: "Invalid renter ID format" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
        "404": { description: "Renter not found" },
      },
    },
  },

  "/renter/admin/{userId}": {
    get: {
      tags: ["Renter Management - Admin"],
      summary: "Get renter profile by user ID (Admin only)",
      description: "Retrieve renter profile by user ID.",
      operationId: "adminGetRenterProfile",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "userId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": { description: "Renter profile retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
        "404": { description: "Renter not found" },
      },
    },
  },
};

export default renterPaths;
