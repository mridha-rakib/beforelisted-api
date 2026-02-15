// file: src/docs/swagger/notice.swagger.ts
// OpenAPI paths for Notice endpoints

export const noticePaths = {
  "/notice": {
    get: {
      tags: ["Notice"],
      summary: "Get active notice",
      description: "Public endpoint to get the currently active notice.",
      operationId: "getActiveNotice",
      responses: {
        "200": { description: "Notice retrieved successfully" },
      },
    },
  },

  "/notice/admin": {
    get: {
      tags: ["Notice - Admin"],
      summary: "Get notice for admin",
      description: "Retrieve notice including inactive state.",
      operationId: "getNoticeForAdmin",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Notice retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
    put: {
      tags: ["Notice - Admin"],
      summary: "Update notice",
      description: "Update notice content and metadata.",
      operationId: "updateNotice",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              additionalProperties: true,
            },
          },
        },
      },
      responses: {
        "200": { description: "Notice updated successfully" },
        "400": { description: "Invalid request payload" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },

  "/notice/admin/toggle": {
    put: {
      tags: ["Notice - Admin"],
      summary: "Toggle notice active status",
      operationId: "toggleNoticeStatus",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Notice status toggled successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },
};

export default noticePaths;
