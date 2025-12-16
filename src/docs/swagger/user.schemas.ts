// file: src/docs/swagger/user.schemas.ts
// OpenAPI schema definitions for User module

export const userSchemas = {
  // ==========================================
  // REQUEST SCHEMAS
  // ==========================================

  UpdateProfileRequest: {
    type: "object",
    properties: {
      firstName: {
        type: "string",
        example: "John",
        description: "User's first name",
      },
      lastName: {
        type: "string",
        example: "Doe",
        description: "User's last name",
      },
      phone: {
        type: "string",
        example: "+1234567890",
        description: "User's phone number",
      },
      address: {
        type: "string",
        example: "123 Main St, City, State 12345",
        description: "User's residential address",
      },
      profilePicture: {
        type: "string",
        format: "uri",
        example: "https://example.com/profile.jpg",
        description: "URL to user's profile picture",
      },
      dateOfBirth: {
        type: "string",
        format: "date",
        example: "1990-01-15",
        description: "User's date of birth (YYYY-MM-DD)",
      },
      bio: {
        type: "string",
        maxLength: 500,
        example: "Property manager with 10 years of experience",
        description: "User's bio or about section",
      },
    },
  },

  // ==========================================
  // RESPONSE SCHEMAS
  // ==========================================

  GetProfileResponse: {
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
        example: "Profile retrieved successfully",
      },
      data: {
        $ref: "#/components/schemas/UserProfile",
      },
    },
  },

  UpdateProfileResponse: {
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
        example: "User updated successfully",
      },
      data: {
        $ref: "#/components/schemas/UserProfile",
      },
    },
  },

  DeleteAccountResponse: {
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
        example: "Account deleted successfully",
      },
      data: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            example: "507f1f77bcf86cd799439011",
          },
          deletedAt: {
            type: "string",
            format: "date-time",
            example: "2024-01-15T10:30:00Z",
          },
        },
      },
    },
  },

  AdminGetUserResponse: {
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
        example: "User retrieved successfully",
      },
      data: {
        $ref: "#/components/schemas/UserProfile",
      },
    },
  },

  AdminDeleteUserResponse: {
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
        example: "User deleted successfully",
      },
      data: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            example: "507f1f77bcf86cd799439011",
          },
          deletedAt: {
            type: "string",
            format: "date-time",
            example: "2024-01-15T10:30:00Z",
          },
          deletedBy: {
            type: "string",
            example: "507f1f77bcf86cd799439012",
            description: "Admin user ID who performed the deletion",
          },
        },
      },
    },
  },

  AdminRestoreUserResponse: {
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
        example: "User restored successfully",
      },
      data: {
        $ref: "#/components/schemas/UserProfile",
      },
    },
  },

  AdminPermanentDeleteResponse: {
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
        example: "User permanently deleted",
      },
      data: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            example: "507f1f77bcf86cd799439011",
          },
          message: {
            type: "string",
            example: "User account and all associated data have been permanently removed",
          },
        },
      },
    },
  },

  // ==========================================
  // DATA SCHEMAS
  // ==========================================

  UserProfile: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        example: "507f1f77bcf86cd799439011",
      },
      email: {
        type: "string",
        format: "email",
        example: "user@example.com",
      },
      firstName: {
        type: "string",
        example: "John",
      },
      lastName: {
        type: "string",
        example: "Doe",
      },
      phone: {
        type: "string",
        example: "+1234567890",
        nullable: true,
      },
      address: {
        type: "string",
        example: "123 Main St, City, State 12345",
        nullable: true,
      },
      profilePicture: {
        type: "string",
        format: "uri",
        example: "https://example.com/profile.jpg",
        nullable: true,
      },
      dateOfBirth: {
        type: "string",
        format: "date",
        example: "1990-01-15",
        nullable: true,
      },
      bio: {
        type: "string",
        example: "Property manager with 10 years of experience",
        nullable: true,
      },
      role: {
        type: "string",
        enum: ["admin", "agent", "renter", "user"],
        example: "user",
        description: "User role/type",
      },
      isEmailVerified: {
        type: "boolean",
        example: true,
      },
      isActive: {
        type: "boolean",
        example: true,
      },
      isDeleted: {
        type: "boolean",
        example: false,
        description: "Soft delete flag",
      },
      deletedAt: {
        type: "string",
        format: "date-time",
        example: "2024-01-15T10:30:00Z",
        nullable: true,
        description: "Soft deletion timestamp",
      },
      createdAt: {
        type: "string",
        format: "date-time",
        example: "2024-01-10T08:00:00Z",
      },
      updatedAt: {
        type: "string",
        format: "date-time",
        example: "2024-01-15T10:30:00Z",
      },
    },
  },
};

export default userSchemas;