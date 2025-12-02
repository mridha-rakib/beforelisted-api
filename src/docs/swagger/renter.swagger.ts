// File: src/docs/swagger/renter.swagger.ts
// Renter Module - Endpoint Documentation

const renterPaths = {
  "/renter/register": {
    post: {
      tags: ["Renter - Registration"],
      summary: "Register as Renter (Auto-Detect)",
      description:
        "Register as renter with auto-detection of registration type (normal, agent referral, or admin referral).",
      operationId: "registerRenter",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              oneOf: [
                { $ref: "#/components/schemas/NormalRenterRegisterRequest" },
                {
                  $ref: "#/components/schemas/AgentReferralRenterRegisterRequest",
                },
                {
                  $ref: "#/components/schemas/AdminRenterReferralRegisterRequest",
                },
              ],
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
                $ref: "#/components/schemas/RenterRegistrationResponse",
              },
            },
          },
          headers: {
            "Set-Cookie": {
              schema: {
                type: "string",
                example:
                  "refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Path=/; HttpOnly; Secure; SameSite=Strict",
              },
              description: "Refresh token stored in httpOnly cookie",
            },
          },
        },
        "400": {
          description: "Invalid input or duplicate email",
        },
        "422": {
          description: "Validation error",
        },
      },
    },
  },

  "/renter/register/normal": {
    post: {
      tags: ["Renter - Registration"],
      summary: "Register as Normal Renter (Explicit)",
      description: "Explicit normal renter registration without referral code.",
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
                $ref: "#/components/schemas/RenterRegistrationResponse",
              },
            },
          },
        },
        "400": {
          description: "Invalid input or duplicate email",
        },
        "422": {
          description: "Validation error",
        },
      },
    },
  },

  "/renter/register/agent-referral": {
    post: {
      tags: ["Renter - Registration"],
      summary: "Register via Agent Referral (Explicit)",
      description:
        "Register as renter using agent referral code. Requires valid agent referral code starting with AGT-.",
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
          description: "Renter registered via agent referral successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RenterRegistrationResponse",
              },
            },
          },
        },
        "400": {
          description: "Invalid referral code or duplicate email",
        },
        "422": {
          description: "Validation error",
        },
      },
    },
  },

  "/renter/register/admin-referral": {
    post: {
      tags: ["Renter - Registration"],
      summary: "Register via Admin Referral (Passwordless)",
      description:
        "Register as renter using admin referral code. Password is auto-generated and sent to email. Must be changed on first login.",
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
          description: "Renter registered via admin referral successfully",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/RenterRegistrationResponse" },
                  {
                    type: "object",
                    properties: {
                      data: {
                        type: "object",
                        properties: {
                          temporaryPassword: {
                            type: "string",
                            description: "Temporary password sent to email",
                          },
                          mustChangePassword: {
                            type: "boolean",
                            example: true,
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        "400": {
          description: "Invalid referral code or duplicate email",
        },
        "422": {
          description: "Validation error",
        },
      },
    },
  },

  "/renter/profile": {
    get: {
      tags: ["Renter - Profile"],
      summary: "Get Renter Profile",
      description: "Get authenticated renter's profile information.",
      operationId: "getRenterProfile",
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        "200": {
          description: "Renter profile retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  data: {
                    $ref: "#/components/schemas/RenterResponse",
                  },
                  message: {
                    type: "string",
                    example: "Renter profile retrieved successfully",
                  },
                },
              },
            },
          },
        },
        "401": {
          description: "Unauthorized - invalid or missing token",
        },
        "404": {
          description: "Renter profile not found",
        },
      },
    },

    put: {
      tags: ["Renter - Profile"],
      summary: "Update Renter Profile",
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
          description: "Renter profile updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  data: {
                    $ref: "#/components/schemas/RenterResponse",
                  },
                  message: {
                    type: "string",
                    example: "Renter profile updated successfully",
                  },
                },
              },
            },
          },
        },
        "401": {
          description: "Unauthorized - invalid or missing token",
        },
        "404": {
          description: "Renter profile not found",
        },
        "422": {
          description: "Validation error",
        },
      },
    },
  },

  "/renter/admin/{userId}": {
    get: {
      tags: ["Renter - Admin Operations"],
      summary: "Get Renter Profile by ID (Admin)",
      description:
        "Admin endpoint to retrieve specific renter profile by user ID.",
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
          description: "User ID of the renter",
          schema: {
            type: "string",
            example: "507f1f77bcf86cd799439011",
          },
        },
      ],
      responses: {
        "200": {
          description: "Renter profile retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  data: {
                    $ref: "#/components/schemas/RenterResponse",
                  },
                  message: {
                    type: "string",
                    example: "Renter profile retrieved successfully",
                  },
                },
              },
            },
          },
        },
        "401": {
          description: "Unauthorized - invalid or missing token",
        },
        "403": {
          description: "Forbidden - admin role required",
        },
        "404": {
          description: "Renter not found",
        },
      },
    },
  },
};

export default renterPaths;
