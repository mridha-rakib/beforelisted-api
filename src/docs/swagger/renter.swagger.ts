// file: src/docs/swagger/renter.swagger.ts
// Complete OpenAPI paths for Renter endpoints

export const renterPaths = {
  "/renter/register": {
    post: {
      tags: ["Renter Management"],
      summary: "Register renter (auto-detect type)",
      description:
        "Register as renter. Auto-detects: Normal, Agent Referral, or Admin Referral.",
      operationId: "registerRenter",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/RenterRegisterRequest",
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Renter registered successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RenterRegisterResponse",
              },
            },
          },
        },
        "400": {
          description: "Invalid input or invalid referral code",
        },
        "409": {
          description: "Email already exists",
        },
      },
    },
  },

  "/renter/register/normal": {
    post: {
      tags: ["Renter Management"],
      summary: "Register as normal renter",
      description: "Register as renter without any referral code (explicit).",
      operationId: "registerNormalRenter",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/NormalRenterRegisterRequest",
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Normal renter registered successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RenterRegisterResponse",
              },
            },
          },
        },
        "400": {
          description: "Invalid input",
        },
        "409": {
          description: "Email already exists",
        },
      },
    },
  },

  "/renter/register/agent-referral": {
    post: {
      tags: ["Renter Management"],
      summary: "Register with agent referral",
      description: "Register as renter via agent referral code (AGT-xxxxxxxx).",
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
        "201": {
          description: "Renter registered via agent referral",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RenterRegisterResponse",
              },
            },
          },
        },
        "400": {
          description: "Invalid referral code or input",
        },
        "409": {
          description: "Email already exists",
        },
      },
    },
  },

  "/renter/register/admin-referral": {
    post: {
      tags: ["Renter Management"],
      summary: "Register with admin referral (passwordless)",
      description:
        "Register as renter via admin referral code (ADM-xxxxxxxx). Password auto-generated.",
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
        "201": {
          description: "Renter registered via admin referral",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AdminReferralRegisterResponse",
              },
            },
          },
        },
        "400": {
          description: "Invalid referral code or input",
        },
        "409": {
          description: "Email already exists",
        },
      },
    },
  },

  "/renter/profile": {
    get: {
      tags: ["Renter Management"],
      summary: "Get renter profile",
      description: "Retrieve authenticated renter's profile.",
      operationId: "getRenterProfile",
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        "200": {
          description: "Profile retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/GetRenterProfileResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
        },
        "404": {
          description: "Renter profile not found",
        },
      },
    },

    put: {
      tags: ["Renter Management"],
      summary: "Update renter profile",
      description: "Update authenticated renter's profile information.",
      operationId: "updateRenterProfile",
      security: [
        {
          bearerAuth: [],
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/UpdateRenterProfileRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Profile updated successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateRenterProfileResponse",
              },
            },
          },
        },
        "400": {
          description: "Invalid input data",
        },
        "401": {
          description: "Unauthorized",
        },
      },
    },
  },

  "/admin/renters": {
    get: {
      tags: ["Renter Management - Admin"],
      summary: "Get all renters (Admin only)",
      description:
        "Retrieve list of renters with pagination and optional filtering.",
      operationId: "getAllRenters",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "page",
          in: "query",
          schema: {
            type: "integer",
            example: 1,
          },
          description: "Page number (1-indexed)",
        },
        {
          name: "limit",
          in: "query",
          schema: {
            type: "integer",
            example: 10,
          },
          description: "Results per page (1-100)",
        },
        {
          name: "accountStatus",
          in: "query",
          schema: {
            type: "string",
            enum: ["pending", "active", "suspended", "deactivated"],
            example: "active",
          },
        },
        {
          name: "search",
          in: "query",
          schema: {
            type: "string",
          },
          description: "Search by email or name",
        },
      ],
      responses: {
        "200": {
          description: "Renters retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/PaginatedRentersResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
        },
        "403": {
          description: "Forbidden - Admin role required",
        },
      },
    },
  },

  "/admin/renters/{renterId}": {
    get: {
      tags: ["Renter Management - Admin"],
      summary: "Get renter details (Admin only)",
      description: "Retrieve renter profile with referral info and listings.",
      operationId: "getRenterDetailsForAdmin",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "renterId",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "Renter ID (24-character MongoDB ID)",
        },
      ],
      responses: {
        "200": {
          description: "Renter details retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RenterDetailsResponse",
              },
            },
          },
        },
        "400": {
          description: "Invalid renter ID format",
        },
        "401": {
          description: "Unauthorized",
        },
        "403": {
          description: "Forbidden - Admin role required",
        },
        "404": {
          description: "Renter not found",
        },
      },
    },
  },

  "/renter/admin/{userId}": {
    get: {
      tags: ["Renter Management - Admin"],
      summary: "Get renter profile by ID (Admin only)",
      description: "Retrieve specific renter's profile.",
      operationId: "adminGetRenterProfile",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "userId",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
        },
      ],
      responses: {
        "200": {
          description: "Profile retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/GetRenterProfileResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
        },
        "403": {
          description: "Forbidden - Admin role required",
        },
        "404": {
          description: "Renter not found",
        },
      },
    },
  },
};

export default renterPaths;
