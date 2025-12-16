// file: src/docs/swagger/user.swagger.ts
// Complete OpenAPI paths for User endpoints

export const userPaths = {
  "/user/profile": {
    get: {
      tags: ["User Management"],
      summary: "Get user profile",
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
                $ref: "#/components/schemas/GetProfileResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
        },
        "404": {
          description: "User not found",
        },
      },
    },

    put: {
      tags: ["User Management"],
      summary: "Update user profile",
      description: "Update authenticated user's profile information.",
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
              $ref: "#/components/schemas/UpdateProfileRequest",
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
                $ref: "#/components/schemas/UpdateProfileResponse",
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
        "404": {
          description: "User not found",
        },
      },
    },
  },

  "/user": {
    delete: {
      tags: ["User Management"],
      summary: "Delete own account",
      description: "Delete authenticated user's account (soft delete). User data is marked as deleted but preserved.",
      operationId: "deleteOwnAccount",
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
                $ref: "#/components/schemas/DeleteAccountResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
        },
        "404": {
          description: "User not found",
        },
      },
    },
  },

  "/user/{userId}": {
    get: {
      tags: ["User Management - Admin"],
      summary: "Get user by ID (Admin only)",
      description: "Retrieve specific user information by ID. Admin only.",
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
          schema: {
            type: "string",
          },
          description: "User ID to retrieve",
          example: "507f1f77bcf86cd799439011",
        },
      ],
      responses: {
        "200": {
          description: "User retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AdminGetUserResponse",
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
          description: "User not found",
        },
      },
    },

    delete: {
      tags: ["User Management - Admin"],
      summary: "Delete user (Admin only - soft delete)",
      description: "Soft delete a user. User data is marked as deleted but preserved in database.",
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
          schema: {
            type: "string",
          },
          description: "User ID to delete",
          example: "507f1f77bcf86cd799439011",
        },
      ],
      responses: {
        "200": {
          description: "User deleted successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AdminDeleteUserResponse",
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
          description: "User not found",
        },
      },
    },
  },

  "/user/{userId}/restore": {
    post: {
      tags: ["User Management - Admin"],
      summary: "Restore soft-deleted user (Admin only)",
      description: "Restore a previously soft-deleted user account.",
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
          schema: {
            type: "string",
          },
          description: "User ID to restore",
          example: "507f1f77bcf86cd799439011",
        },
      ],
      responses: {
        "200": {
          description: "User restored successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AdminRestoreUserResponse",
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
          description: "User not found",
        },
      },
    },
  },

  "/user/{userId}/permanent": {
    delete: {
      tags: ["User Management - Admin"],
      summary: "Permanently delete user (Admin only - hard delete)",
      description: "Permanently delete a user from database. This action cannot be undone. User data is completely removed.",
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
          schema: {
            type: "string",
          },
          description: "User ID to permanently delete",
          example: "507f1f77bcf86cd799439011",
        },
      ],
      responses: {
        "200": {
          description: "User permanently deleted",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AdminPermanentDeleteResponse",
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
          description: "User not found",
        },
      },
    },
  },
};

export default userPaths;