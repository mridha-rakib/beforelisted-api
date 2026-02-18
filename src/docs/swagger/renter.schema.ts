// file: src/docs/swagger/renter.schemas.ts
// OpenAPI schema definitions for Renter module

export const renterSchemas = {
  // ==========================================
  // REQUEST SCHEMAS
  // ==========================================

  RenterRegisterRequest: {
    type: "object",
    required: ["email", "fullName", "referralCode"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "renter@example.com",
      },
      password: {
        type: "string",
        format: "password",
        minLength: 8,
        example: "SecurePassword123!",
        nullable: true,
        description:
          "Required for agent referral, not allowed for admin referral",
      },
      fullName: {
        type: "string",
        minLength: 2,
        maxLength: 100,
        example: "Jane Doe",
      },
      phoneNumber: {
        type: "string",
        example: "+1234567890",
        nullable: true,
      },
      referralCode: {
        type: "string",
        example: "AGT-ILTFDRTU",
        description: "Agent (AGT-) or Admin (ADM-) referral code",
      },
      questionnaire: {
        type: "object",
        nullable: true,
        properties: {
          lookingToPurchase: {
            type: "boolean",
            example: true,
          },
          purchaseTimeline: {
            type: "string",
            example: "Within 6 months",
            nullable: true,
          },
          buyerSpecialistNeeded: {
            type: "boolean",
            example: false,
          },
          renterSpecialistNeeded: {
            type: "boolean",
            example: true,
          },
        },
      },
    },
  },

  AgentReferralRenterRegisterRequest: {
    type: "object",
    required: ["email", "password", "fullName", "referralCode"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "renter@example.com",
      },
      password: {
        type: "string",
        format: "password",
        minLength: 8,
        example: "SecurePassword123!",
      },
      fullName: {
        type: "string",
        minLength: 2,
        maxLength: 100,
        example: "Jane Doe",
      },
      phoneNumber: {
        type: "string",
        example: "+1234567890",
        nullable: true,
      },
      referralCode: {
        type: "string",
        pattern: "^AGT-[A-Z0-9]{8}$",
        example: "AGT-ILTFDRTU",
        description: "Agent referral code (must start with AGT-)",
      },
    },
  },

  AdminReferralRenterRegisterRequest: {
    type: "object",
    required: ["email", "fullName", "referralCode"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "renter@example.com",
      },
      fullName: {
        type: "string",
        minLength: 2,
        maxLength: 100,
        example: "Jane Doe",
      },
      phoneNumber: {
        type: "string",
        example: "+1234567890",
        nullable: true,
      },
      referralCode: {
        type: "string",
        pattern: "^ADM-[A-Z0-9]{8}$",
        example: "ADM-ILTFDRTU",
        description:
          "Admin referral code (must start with ADM-). Password will be auto-generated.",
      },
      questionnaire: {
        type: "object",
        nullable: true,
        properties: {
          lookingToPurchase: {
            type: "boolean",
          },
          purchaseTimeline: {
            type: "string",
            nullable: true,
          },
          buyerSpecialistNeeded: {
            type: "boolean",
          },
          renterSpecialistNeeded: {
            type: "boolean",
          },
        },
      },
    },
  },

  UpdateRenterProfileRequest: {
    type: "object",
    properties: {
      phoneNumber: {
        type: "string",
        example: "+1234567890",
      },
    },
  },

  // ==========================================
  // RESPONSE SCHEMAS
  // ==========================================

  RenterRegisterResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 201,
      },
      message: {
        type: "string",
        example: "Renter registered successfully",
      },
      data: {
        type: "object",
        properties: {
          user: {
            $ref: "#/components/schemas/RenterUserObject",
          },
          renter: {
            $ref: "#/components/schemas/RenterProfile",
          },
          accessToken: {
            type: "string",
          },
          expiresIn: {
            type: "integer",
            example: 3600,
          },
        },
      },
      tokens: {
        type: "object",
        properties: {
          accessToken: {
            type: "string",
          },
          refreshToken: {
            type: "string",
          },
        },
      },
    },
  },

  AdminReferralRegisterResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 201,
      },
      message: {
        type: "string",
        example:
          "Password has been sent to your email. Please change it on first login.",
      },
      data: {
        type: "object",
        properties: {
          user: {
            $ref: "#/components/schemas/RenterUserObject",
          },
          renter: {
            $ref: "#/components/schemas/RenterProfile",
          },
          accessToken: {
            type: "string",
          },
          expiresIn: {
            type: "integer",
            example: 3600,
          },
        },
      },
    },
  },

  GetRenterProfileResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Renter profile retrieved successfully",
      },
      data: {
        $ref: "#/components/schemas/RenterProfile",
      },
    },
  },

  UpdateRenterProfileResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Renter profile updated successfully",
      },
      data: {
        $ref: "#/components/schemas/RenterProfile",
      },
    },
  },

  PaginatedRentersResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Renters retrieved successfully",
      },
      data: {
        type: "array",
        items: {
          $ref: "#/components/schemas/RenterProfile",
        },
      },
      pagination: {
        type: "object",
        properties: {
          currentPage: {
            type: "integer",
            example: 1,
          },
          totalPages: {
            type: "integer",
            example: 5,
          },
          pageSize: {
            type: "integer",
            example: 10,
          },
          totalCount: {
            type: "integer",
            example: 42,
          },
        },
      },
    },
  },

  RenterDetailsResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Renter details retrieved successfully",
      },
      data: {
        type: "object",
        properties: {
          profile: {
            $ref: "#/components/schemas/RenterProfile",
          },
          referralInfo: {
            type: "object",
            nullable: true,
            properties: {
              referredBy: {
                type: "string",
                example: "agent",
                enum: ["agent", "admin"],
              },
              referrerName: {
                type: "string",
              },
              referrerEmail: {
                type: "string",
              },
              referralDate: {
                type: "string",
                format: "date-time",
              },
            },
          },
          listings: {
            type: "array",
            items: {
              type: "object",
            },
            description: "Associated pre-market listings",
          },
        },
      },
    },
  },

  // ==========================================
  // DATA SCHEMAS
  // ==========================================

  RenterProfile: {
    type: "object",
    properties: {
      userId: {
        type: "string",
      },
      email: {
        type: "string",
        format: "email",
      },
      fullName: {
        type: "string",
      },
      phoneNumber: {
        type: "string",
        nullable: true,
      },
      registrationType: {
        type: "string",
        enum: ["normal", "agent_referral", "admin_referral"],
        example: "agent_referral",
      },
      referredByAgentId: {
        type: "string",
        nullable: true,
      },
      referredByAdminId: {
        type: "string",
        nullable: true,
      },
      emailVerified: {
        type: "boolean",
        example: true,
      },
      accountStatus: {
        type: "string",
        enum: ["pending", "active", "suspended"],
        example: "active",
      },
      createdAt: {
        type: "string",
        format: "date-time",
      },
      updatedAt: {
        type: "string",
        format: "date-time",
      },
    },
  },

  RenterUserObject: {
    type: "object",
    properties: {
      userId: {
        type: "string",
      },
      email: {
        type: "string",
        format: "email",
      },
      fullName: {
        type: "string",
      },
      role: {
        type: "string",
        enum: ["renter"],
        example: "renter",
      },
      isEmailVerified: {
        type: "boolean",
      },
      isActive: {
        type: "boolean",
      },
    },
  },
};

export default renterSchemas;
