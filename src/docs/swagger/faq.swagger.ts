// file: src/docs/swagger/faq.swagger.ts
// OpenAPI endpoint definitions for FAQ module

export const faqPaths = {
  // ==========================================
  // PUBLIC ENDPOINTS
  // ==========================================

  "/faq": {
    get: {
      tags: ["FAQ"],
      summary: "Get all public FAQs",
      description: "Get all published FAQs. No authentication required.",
      operationId: "getAllFAQs",
      responses: {
        200: {
          description: "All public FAQs retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  statusCode: { type: "integer", example: 200 },
                  message: { type: "string" },
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/FAQData" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  "/faq/{id}": {
    get: {
      tags: ["FAQ"],
      summary: "Get single FAQ by ID",
      description: "Get details of a specific FAQ. Public endpoint.",
      operationId: "getFAQById",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "FAQ ID (MongoDB ObjectId)",
        },
      ],
      responses: {
        200: {
          description: "FAQ retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  statusCode: { type: "integer", example: 200 },
                  message: { type: "string" },
                  data: { $ref: "#/components/schemas/FAQData" },
                },
              },
            },
          },
        },
        404: { description: "FAQ not found" },
      },
    },
  },

  // ==========================================
  // ADMIN ENDPOINTS
  // ==========================================

  "/faq/admin/all": {
    get: {
      tags: ["FAQ - Admin"],
      summary: "Get all FAQs (including inactive)",
      description: "Get all FAQs including unpublished ones. Admin only.",
      operationId: "getAllFAQsForAdmin",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "All FAQs retrieved",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  statusCode: { type: "integer", example: 200 },
                  message: { type: "string" },
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/FAQData" },
                  },
                },
              },
            },
          },
        },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/faq/admin": {
    post: {
      tags: ["FAQ - Admin"],
      summary: "Create new FAQ",
      description: "Create a new FAQ entry. Admin only.",
      operationId: "createFAQ",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateFAQPayload" },
            example: {
              question: "How do I reset my password?",
              answer:
                "To reset your password, click on 'Forgot Password' and follow the steps...",
              category: "Account",
              order: 1,
              isActive: true,
            },
          },
        },
      },
      responses: {
        201: {
          description: "FAQ created successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  statusCode: { type: "integer", example: 201 },
                  message: { type: "string" },
                  data: { $ref: "#/components/schemas/FAQData" },
                },
              },
            },
          },
        },
        400: { description: "Invalid FAQ data" },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/faq/admin/{id}": {
    put: {
      tags: ["FAQ - Admin"],
      summary: "Update FAQ",
      description: "Update an existing FAQ. Admin only.",
      operationId: "updateFAQ",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateFAQPayload" },
            example: {
              question: "How do I reset my password?",
              answer: "Updated answer text...",
              category: "Account",
              order: 1,
              isActive: true,
            },
          },
        },
      },
      responses: {
        200: {
          description: "FAQ updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  statusCode: { type: "integer", example: 200 },
                  message: { type: "string" },
                  data: { $ref: "#/components/schemas/FAQData" },
                },
              },
            },
          },
        },
        404: { description: "FAQ not found" },
        401: { description: "Unauthorized" },
      },
    },
    delete: {
      tags: ["FAQ - Admin"],
      summary: "Soft delete FAQ",
      description: "Soft delete an FAQ (marks as inactive). Admin only.",
      operationId: "deleteFAQ",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "FAQ deleted successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  statusCode: { type: "integer", example: 200 },
                  message: { type: "string" },
                  data: { $ref: "#/components/schemas/FAQData" },
                },
              },
            },
          },
        },
        404: { description: "FAQ not found" },
      },
    },
  },

  "/faq/admin/{id}/hard-delete": {
    delete: {
      tags: ["FAQ - Admin"],
      summary: "Permanently delete FAQ",
      description:
        "Permanently hard delete an FAQ from database. Admin only. Irreversible!",
      operationId: "hardDeleteFAQ",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "FAQ permanently deleted",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  statusCode: { type: "integer", example: 200 },
                  message: { type: "string" },
                  data: {
                    type: "object",
                    properties: {
                      message: {
                        type: "string",
                        example: "FAQ permanently deleted",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        404: { description: "FAQ not found" },
      },
    },
  },
};

export default faqPaths;
