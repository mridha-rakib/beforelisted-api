// file: src/docs/swagger/monthly-report.schemas.ts
// OpenAPI schema definitions for Monthly Report module

export const monthlyReportSchemas = {
  // ==========================================
  // REQUEST SCHEMAS
  // ==========================================

  CreateMonthlyReportPayload: {
    type: "object",
    required: ["title", "month", "year", "content"],
    properties: {
      title: {
        type: "string",
        example: "December 2024 Report",
        description: "Report title",
      },
      month: {
        type: "integer",
        minimum: 1,
        maximum: 12,
        example: 12,
        description: "Month number (1-12)",
      },
      year: {
        type: "integer",
        minimum: 2000,
        maximum: 2100,
        example: 2024,
        description: "Year",
      },
      content: {
        type: "string",
        example: "Comprehensive analysis of December operations...",
        description: "Report content (HTML or plain text)",
      },
      isActive: {
        type: "boolean",
        default: true,
        example: true,
        description: "Whether the report is publicly visible",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        example: ["operations", "financial", "2024"],
        description: "Tags for categorization",
      },
    },
  },

  UpdateMonthlyReportPayload: {
    type: "object",
    properties: {
      title: { type: "string" },
      month: { type: "integer", minimum: 1, maximum: 12 },
      year: { type: "integer", minimum: 2000, maximum: 2100 },
      content: { type: "string" },
      isActive: { type: "boolean" },
      tags: {
        type: "array",
        items: { type: "string" },
      },
    },
  },

  // ==========================================
  // RESPONSE SCHEMAS
  // ==========================================

  MonthlyReportData: {
    type: "object",
    properties: {
      _id: {
        type: "string",
        format: "uuid",
        example: "507f1f77bcf86cd799439011",
        description: "Report ID",
      },
      title: {
        type: "string",
        example: "December 2024 Report",
      },
      month: {
        type: "integer",
        example: 12,
      },
      year: {
        type: "integer",
        example: 2024,
      },
      content: {
        type: "string",
        example: "Comprehensive analysis of December operations...",
      },
      isActive: {
        type: "boolean",
        example: true,
      },
      tags: {
        type: "array",
        items: { type: "string" },
        example: ["operations", "financial", "2024"],
      },
      createdBy: {
        type: "string",
        format: "uuid",
        description: "Admin ID who created the report",
      },
      updatedBy: {
        type: "string",
        format: "uuid",
        nullable: true,
        description: "Admin ID who last updated the report",
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

  MonthlyReportResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      statusCode: { type: "integer", example: 200 },
      message: { type: "string" },
      data: { $ref: "#/components/schemas/MonthlyReportData" },
    },
  },

  MonthlyReportListResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      statusCode: { type: "integer", example: 200 },
      message: { type: "string" },
      data: {
        type: "array",
        items: { $ref: "#/components/schemas/MonthlyReportData" },
      },
    },
  },

  MonthlyReportCreateResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      statusCode: { type: "integer", example: 201 },
      message: { type: "string" },
      data: { $ref: "#/components/schemas/MonthlyReportData" },
    },
  },
};

export default monthlyReportSchemas;
