// file: src/docs/swagger/monthly-report.swagger.ts
// OpenAPI endpoint definitions for Monthly Report module

export const monthlyReportPaths = {
  // ==========================================
  // PUBLIC ENDPOINTS
  // ==========================================

  "/monthly-report": {
    get: {
      tags: ["Monthly Reports"],
      summary: "Get all active reports",
      description:
        "Get all publicly available active monthly reports. No authentication required.",
      operationId: "getAllPublicReports",
      responses: {
        200: {
          description: "All active reports retrieved successfully",
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
                    items: { $ref: "#/components/schemas/MonthlyReportData" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  "/monthly-report/{id}": {
    get: {
      tags: ["Monthly Reports"],
      summary: "Get single report by ID",
      description: "Get details of a specific report by ID. Public endpoint.",
      operationId: "getReportById",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "Report ID (MongoDB ObjectId)",
        },
      ],
      responses: {
        200: {
          description: "Report retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  statusCode: { type: "integer", example: 200 },
                  message: { type: "string" },
                  data: { $ref: "#/components/schemas/MonthlyReportData" },
                },
              },
            },
          },
        },
        404: { description: "Report not found" },
      },
    },
  },

  "/monthly-report/year/{year}": {
    get: {
      tags: ["Monthly Reports"],
      summary: "Get reports by year",
      description:
        "Get all active reports for a specific year. Public endpoint.",
      operationId: "getReportsByYear",
      parameters: [
        {
          name: "year",
          in: "path",
          required: true,
          schema: { type: "integer", minimum: 2000, maximum: 2100 },
          description: "Year (e.g., 2024)",
        },
      ],
      responses: {
        200: {
          description: "Reports for the year retrieved successfully",
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
                    items: { $ref: "#/components/schemas/MonthlyReportData" },
                  },
                },
              },
            },
          },
        },
        400: { description: "Invalid year format" },
      },
    },
  },

  // ==========================================
  // ADMIN ENDPOINTS
  // ==========================================

  "/monthly-report/admin/all": {
    get: {
      tags: ["Monthly Reports - Admin"],
      summary: "Get all reports (including inactive)",
      description: "Get all reports including inactive ones. Admin only.",
      operationId: "getAllReports",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "All reports retrieved",
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
                    items: { $ref: "#/components/schemas/MonthlyReportData" },
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

  "/monthly-report/admin": {
    post: {
      tags: ["Monthly Reports - Admin"],
      summary: "Create new report",
      description: "Create a new monthly report. Admin only.",
      operationId: "createReport",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateMonthlyReportPayload" },
            example: {
              title: "December 2024 Report",
              month: 12,
              year: 2024,
              content: "Comprehensive analysis of December operations...",
              isActive: true,
              tags: ["operations", "financial", "2024"],
            },
          },
        },
      },
      responses: {
        201: {
          description: "Report created successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  statusCode: { type: "integer", example: 201 },
                  message: { type: "string" },
                  data: { $ref: "#/components/schemas/MonthlyReportData" },
                },
              },
            },
          },
        },
        400: { description: "Invalid report data" },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/monthly-report/admin/{id}": {
    put: {
      tags: ["Monthly Reports - Admin"],
      summary: "Update report",
      description: "Update an existing report. Admin only.",
      operationId: "updateReport",
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
            schema: { $ref: "#/components/schemas/UpdateMonthlyReportPayload" },
          },
        },
      },
      responses: {
        200: {
          description: "Report updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  statusCode: { type: "integer", example: 200 },
                  message: { type: "string" },
                  data: { $ref: "#/components/schemas/MonthlyReportData" },
                },
              },
            },
          },
        },
        404: { description: "Report not found" },
      },
    },
    delete: {
      tags: ["Monthly Reports - Admin"],
      summary: "Soft delete report",
      description: "Soft delete a report (marks as inactive). Admin only.",
      operationId: "deleteReport",
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
          description: "Report deleted successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  statusCode: { type: "integer", example: 200 },
                  message: { type: "string" },
                  data: { $ref: "#/components/schemas/MonthlyReportData" },
                },
              },
            },
          },
        },
        404: { description: "Report not found" },
      },
    },
  },

  "/monthly-report/admin/{id}/hard-delete": {
    delete: {
      tags: ["Monthly Reports - Admin"],
      summary: "Permanently delete report",
      description:
        "Permanently hard delete a report from database. Admin only.",
      operationId: "hardDeleteReport",
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
          description: "Report permanently deleted",
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
                        example: "Report permanently deleted",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        404: { description: "Report not found" },
      },
    },
  },
};

export default monthlyReportPaths;
