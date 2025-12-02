// file: src/docs/swagger/user.swagger.ts
// User Module - Endpoint Documentation

const userPaths = {
  "/user/profile": {
    get: {
      tags: ["User - Profile"],
      summary: "Get User Profile",
      description: "Retrieve authenticated user's profile information.",
      operationId: "getUserProfile",
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
                $ref: "#/components/schemas/UserProfileResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized - invalid or missing token",
        },
        "404": {
          description: "User not found",
        },
      },
    },

    put: {
      tags: ["User - Profile"],
      summary: "Update User Profile",
      description:
        "Update authenticated user's profile information (fullName, phoneNumber).",
      operationId: "updateUserProfile",
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
              $ref: "#/components/schemas/UpdateUserProfileRequest",
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
                $ref: "#/components/schemas/UserProfileResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized - invalid or missing token",
        },
        "422": {
          description: "Validation error",
        },
      },
    },
  },

  "/user/change-email": {
    post: {
      tags: ["User - Email Management"],
      summary: "Request Email Change",
      description:
        "Request to change email address. Sends verification code to new email.",
      operationId: "requestEmailChange",
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
              $ref: "#/components/schemas/ChangeEmailRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Verification code sent to new email",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example:
                      "Verification code sent to new email. Valid for 10 minutes.",
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Invalid email or email already in use",
        },
        "401": {
          description: "Unauthorized - invalid or missing token",
        },
        "422": {
          description: "Validation error",
        },
      },
    },
  },

  "/user/verify-new-email": {
    post: {
      tags: ["User - Email Management"],
      summary: "Verify New Email",
      description:
        "Verify and confirm new email address with verification code.",
      operationId: "verifyNewEmail",
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
              $ref: "#/components/schemas/VerifyNewEmailRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Email changed successfully",
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
                    type: "object",
                    properties: {
                      newEmail: {
                        type: "string",
                        example: "newemail@example.com",
                      },
                      verifiedAt: {
                        type: "string",
                        format: "date-time",
                      },
                    },
                  },
                  message: {
                    type: "string",
                    example: "Email changed successfully",
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Invalid or expired verification code",
        },
        "401": {
          description: "Unauthorized - invalid or missing token",
        },
        "422": {
          description: "Validation error",
        },
      },
    },
  },

  "/user": {
    delete: {
      tags: ["User - Account Management"],
      summary: "Delete User Account (Soft Delete)",
      description:
        "Delete authenticated user's account (soft delete - marked as deleted but data retained).",
      operationId: "deleteUserAccount",
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        "200": {
          description: "Account deleted successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/DeleteUserResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized - invalid or missing token",
        },
      },
    },
  },

  "/user/{userId}": {
    get: {
      tags: ["User - Admin Operations"],
      summary: "Get User by ID (Admin)",
      description: "Admin endpoint to retrieve specific user by ID.",
      operationId: "adminGetUser",
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
          description: "User ID",
          schema: {
            type: "string",
            example: "507f1f77bcf86cd799439011",
          },
        },
      ],
      responses: {
        "200": {
          description: "User retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UserProfileResponse",
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
          description: "User not found",
        },
      },
    },

    delete: {
      tags: ["User - Admin Operations"],
      summary: "Delete User (Soft Delete) - Admin",
      description: "Admin endpoint to soft delete specific user by ID.",
      operationId: "adminDeleteUser",
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
          description: "User ID to delete",
          schema: {
            type: "string",
            example: "507f1f77bcf86cd799439011",
          },
        },
      ],
      responses: {
        "200": {
          description: "User deleted successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/DeleteUserResponse",
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
          description: "User not found",
        },
      },
    },
  },

  "/user/{userId}/restore": {
    post: {
      tags: ["User - Admin Operations"],
      summary: "Restore Deleted User - Admin",
      description: "Admin endpoint to restore soft-deleted user by ID.",
      operationId: "adminRestoreUser",
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
          description: "User ID to restore",
          schema: {
            type: "string",
            example: "507f1f77bcf86cd799439011",
          },
        },
      ],
      responses: {
        "200": {
          description: "User restored successfully",
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
                    $ref: "#/components/schemas/UserProfile",
                  },
                  message: {
                    type: "string",
                    example: "User restored successfully",
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
          description: "User not found",
        },
      },
    },
  },

  "/user/{userId}/permanent": {
    delete: {
      tags: ["User - Admin Operations"],
      summary: "Permanently Delete User (Hard Delete) - Admin",
      description:
        "Admin endpoint to permanently delete user (hard delete - irreversible).",
      operationId: "adminPermanentlyDeleteUser",
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
          description: "User ID to permanently delete",
          schema: {
            type: "string",
            example: "507f1f77bcf86cd799439011",
          },
        },
      ],
      responses: {
        "200": {
          description: "User permanently deleted",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  message: {
                    type: "string",
                    example: "User permanently deleted",
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
          description: "User not found",
        },
      },
    },
  },
};

export default userPaths;
