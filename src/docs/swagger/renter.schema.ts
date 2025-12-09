// File: src/docs/swagger/renter.schemas.ts
// Renter Module - Reusable Schemas

const renterSchemas = {
  NormalRenterRegisterRequest: {
    type: "object",
    required: ["email", "password", "fullName"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "renter@example.com",
        description: "Renter email address",
      },
      password: {
        type: "string",
        format: "password",
        example: "SecurePass123!",
        description: "Password (minimum 8 characters)",
      },
      fullName: {
        type: "string",
        minLength: 2,
        maxLength: 100,
        example: "John Doe",
      },
      phoneNumber: {
        type: "string",
        example: "+1-555-0123",
        description: "Optional phone number",
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
        example: "SecurePass123!",
        description: "Password required for agent referral",
      },
      fullName: {
        type: "string",
        minLength: 2,
        maxLength: 100,
        example: "John Doe",
      },
      phoneNumber: {
        type: "string",
        example: "+1-555-0123",
      },
      referralCode: {
        type: "string",
        pattern: "^AGT-[A-Z0-9]{16}$",
        example: "AGT-ABCD1234EFGH5678",
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
        example: "John Doe",
      },
      phoneNumber: {
        type: "string",
        example: "+1-555-0123",
      },
      referralCode: {
        type: "string",
        pattern: "^ADM-[A-Z0-9]{16}$",
        example: "ADM-WXYZ9876LMNO1234",
        description:
          "Admin referral code (must start with ADM-). Password optional - will be generated.",
      },
      questionnaire: {
        type: "object",
        description: "Optional questionnaire for admin referral renters",
        properties: {
          lookingToPurchase: {
            type: "boolean",
            example: true,
          },
          purchaseTimeline: {
            type: "string",
            example: "2025-Q2",
          },
          buyerSpecialistNeeded: {
            type: "boolean",
            example: true,
          },
          renterSpecialistNeeded: {
            type: "boolean",
            example: false,
          },
        },
      },
    },
  },

  RenterResponse: {
    type: "object",
    properties: {
      _id: {
        type: "string",
        example: "507f1f77bcf86cd799439011",
      },
      userId: {
        type: "string",
        example: "507f1f77bcf86cd799439010",
      },
      email: {
        type: "string",
        example: "renter@example.com",
      },
      fullName: {
        type: "string",
        example: "John Doe",
      },
      phoneNumber: {
        type: "string",
        example: "+1-555-0123",
      },
      registrationType: {
        type: "string",
        enum: ["normal", "agent_referral", "admin_referral"],
        example: "normal",
      },
      referredByAgentId: {
        type: "string",
        description: "Agent ID if registered via agent referral",
      },
      referredByAdminId: {
        type: "string",
        description: "Admin ID if registered via admin referral",
      },
      emailVerified: {
        type: "boolean",
        example: false,
      },
      accountStatus: {
        type: "string",
        enum: ["active", "suspended", "pending"],
        example: "active",
      },
      occupation: {
        type: "string",
        example: "Software Engineer",
      },
      moveInDate: {
        type: "string",
        format: "date-time",
        example: "2025-03-15T00:00:00Z",
      },
      petFriendly: {
        type: "boolean",
        example: true,
      },
      questionnaire: {
        type: "object",
        properties: {
          lookingToPurchase: { type: "boolean" },
          purchaseTimeline: { type: "string" },
          buyerSpecialistNeeded: { type: "boolean" },
          renterSpecialistNeeded: { type: "boolean" },
        },
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

  RenterRegistrationResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      data: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              _id: { type: "string" },
              email: { type: "string" },
              fullName: { type: "string" },
              role: { type: "string", example: "renter" },
            },
          },
          renter: {
            $ref: "#/components/schemas/RenterResponse",
          },
          tokens: {
            type: "object",
            properties: {
              accessToken: {
                type: "string",
                description: "JWT access token",
              },
              refreshToken: {
                type: "string",
                description: "JWT refresh token (in httpOnly cookie)",
              },
              expiresIn: {
                type: "string",
                example: "1h",
              },
            },
          },
          registrationType: {
            type: "string",
            enum: ["normal", "agent_referral", "admin_referral"],
          },
          temporaryPassword: {
            type: "string",
            description: "Only for admin referral registration",
          },
          mustChangePassword: {
            type: "boolean",
            description: "Only for admin referral registration",
          },
        },
      },
      message: {
        type: "string",
        example: "Renter registered successfully",
      },
    },
  },

  UpdateRenterProfileRequest: {
    type: "object",
    properties: {
      phoneNumber: {
        type: "string",
        example: "+1-555-0123",
      },
      occupation: {
        type: "string",
        example: "Software Engineer",
      },
      moveInDate: {
        type: "string",
        format: "date",
        example: "2025-03-15",
      },
      petFriendly: {
        type: "boolean",
        example: true,
      },
    },
  },
};

export default renterSchemas;
