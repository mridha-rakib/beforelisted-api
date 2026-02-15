// file: src/docs/swagger/user.swagger.ts
// OpenAPI paths for User endpoints

export const userPaths = {
  "/user/profile": {
    get: {
      tags: ["User Management"],
      summary: "Get user profile",
      description: "Retrieve the authenticated user's profile.",
      operationId: "getUserProfile",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Profile retrieved successfully" },
        "401": { description: "Unauthorized" },
      },
    },
    put: {
      tags: ["User Management"],
      summary: "Update user profile",
      description: "Update the authenticated user's profile details.",
      operationId: "updateUserProfile",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateProfileRequest" },
          },
        },
      },
      responses: {
        "200": { description: "Profile updated successfully" },
        "400": { description: "Invalid input data" },
        "401": { description: "Unauthorized" },
      },
    },
  },

  "/user": {
    delete: {
      tags: ["User Management"],
      summary: "Delete own account",
      description: "Soft-delete the authenticated user's account.",
      operationId: "deleteOwnAccount",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Account deleted successfully" },
        "401": { description: "Unauthorized" },
      },
    },
  },

  "/user/admin/referral-link": {
    get: {
      tags: ["User Management - Admin"],
      summary: "Get admin referral link",
      description:
        "Get referral information for the authenticated admin user.",
      operationId: "getAdminReferralLink",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Referral information retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },

  "/user/{userId}": {
    get: {
      tags: ["User Management - Admin"],
      summary: "Get user by ID (Admin only)",
      description: "Retrieve a specific user by ID.",
      operationId: "adminGetUser",
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
        "200": { description: "User retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
        "404": { description: "User not found" },
      },
    },
  },
};

export default userPaths;
