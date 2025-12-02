// file: src/docs/swagger/user.schemas.ts
// User Module - Reusable Schemas

const userSchemas = {
  UserProfile: {
    type: "object",
    properties: {
      _id: {
        type: "string",
        example: "507f1f77bcf86cd799439011",
      },
      email: {
        type: "string",
        format: "email",
        example: "user@example.com",
      },
      fullName: {
        type: "string",
        example: "John Doe",
      },
      phoneNumber: {
        type: "string",
        example: "+1-555-0123",
      },
      role: {
        type: "string",
        enum: ["renter", "agent", "admin"],
        example: "renter",
      },
      emailVerified: {
        type: "boolean",
        example: true,
      },
      accountStatus: {
        type: "string",
        enum: ["active", "suspended", "pending"],
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

  UpdateUserProfileRequest: {
    type: "object",
    properties: {
      fullName: {
        type: "string",
        minLength: 2,
        maxLength: 100,
        example: "John Doe",
        description: "Full name of the user",
      },
      phoneNumber: {
        type: "string",
        example: "+1-555-0123",
        description: "Phone number",
      },
    },
  },

  ChangeEmailRequest: {
    type: "object",
    required: ["newEmail"],
    properties: {
      newEmail: {
        type: "string",
        format: "email",
        example: "newemail@example.com",
        description: "New email address to change to",
      },
    },
  },

  VerifyNewEmailRequest: {
    type: "object",
    required: ["newEmail", "verificationCode"],
    properties: {
      newEmail: {
        type: "string",
        format: "email",
        example: "newemail@example.com",
        description: "New email address to verify",
      },
      verificationCode: {
        type: "string",
        description: "4-digit code sent to new email",
        example: "1234",
        minLength: 4,
        maxLength: 4,
      },
    },
  },

  UserProfileResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      data: {
        $ref: "#/components/schemas/UserProfile",
      },
      message: {
        type: "string",
        example: "Profile retrieved successfully",
      },
    },
  },

  DeleteUserResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      data: {
        type: "object",
        properties: {
          message: {
            type: "string",
            example: "User account deleted successfully",
          },
          deletedAt: {
            type: "string",
            format: "date-time",
          },
        },
      },
      message: {
        type: "string",
        example: "Account deleted successfully",
      },
    },
  },
};

export default userSchemas;
