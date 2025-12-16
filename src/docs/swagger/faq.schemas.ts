// file: src/docs/swagger/faq.schemas.ts
// OpenAPI schema definitions for FAQ module

export const faqSchemas = {
  // ==========================================
  // REQUEST SCHEMAS
  // ==========================================

  CreateFAQPayload: {
    type: "object",
    required: ["question", "answer", "category"],
    properties: {
      question: {
        type: "string",
        minLength: 10,
        maxLength: 500,
        example: "How do I reset my password?",
        description: "FAQ question",
      },
      answer: {
        type: "string",
        minLength: 20,
        example:
          "To reset your password, click on 'Forgot Password' and follow the steps provided...",
        description: "FAQ answer (supports HTML or markdown)",
      },
      category: {
        type: "string",
        enum: [
          "Account",
          "Billing",
          "Technical",
          "General",
          "Features",
          "Other",
        ],
        example: "Account",
        description: "FAQ category for grouping",
      },
      order: {
        type: "integer",
        minimum: 1,
        example: 1,
        description: "Display order among FAQs in same category",
      },
      isActive: {
        type: "boolean",
        default: true,
        example: true,
        description: "Whether the FAQ is published/visible",
      },
    },
  },

  UpdateFAQPayload: {
    type: "object",
    properties: {
      question: {
        type: "string",
        minLength: 10,
        maxLength: 500,
      },
      answer: {
        type: "string",
        minLength: 20,
      },
      category: {
        type: "string",
        enum: [
          "Account",
          "Billing",
          "Technical",
          "General",
          "Features",
          "Other",
        ],
      },
      order: {
        type: "integer",
        minimum: 1,
      },
      isActive: {
        type: "boolean",
      },
    },
  },

  // ==========================================
  // RESPONSE SCHEMAS
  // ==========================================

  FAQData: {
    type: "object",
    properties: {
      _id: {
        type: "string",
        format: "uuid",
        example: "507f1f77bcf86cd799439011",
        description: "FAQ ID",
      },
      question: {
        type: "string",
        example: "How do I reset my password?",
      },
      answer: {
        type: "string",
        example: "To reset your password, click on 'Forgot Password'...",
      },
      category: {
        type: "string",
        enum: [
          "Account",
          "Billing",
          "Technical",
          "General",
          "Features",
          "Other",
        ],
        example: "Account",
      },
      order: {
        type: "integer",
        example: 1,
      },
      isActive: {
        type: "boolean",
        example: true,
      },
      views: {
        type: "integer",
        example: 42,
        description: "Number of times FAQ was viewed",
      },
      createdBy: {
        type: "string",
        format: "uuid",
        description: "Admin ID who created the FAQ",
      },
      updatedBy: {
        type: "string",
        format: "uuid",
        nullable: true,
        description: "Admin ID who last updated the FAQ",
      },
      createdAt: {
        type: "string",
        format: "date-time",
        example: "2024-12-15T17:00:00.000Z",
      },
      updatedAt: {
        type: "string",
        format: "date-time",
        example: "2024-12-15T17:00:00.000Z",
      },
    },
  },

  FAQResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      statusCode: { type: "integer", example: 200 },
      message: { type: "string" },
      data: { $ref: "#/components/schemas/FAQData" },
    },
  },

  FAQListResponse: {
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

  FAQCreateResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      statusCode: { type: "integer", example: 201 },
      message: { type: "string" },
      data: { $ref: "#/components/schemas/FAQData" },
    },
  },
};

export default faqSchemas;
