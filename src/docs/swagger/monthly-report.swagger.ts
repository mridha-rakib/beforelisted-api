// file: src/docs/swagger/monthly-report.swagger.ts
// OpenAPI paths for Monthly Report endpoints

export const monthlyReportPaths = {
  "/monthly-reports": {
    get: {
      tags: ["Monthly Reports"],
      summary: "Get all public reports",
      description: "Retrieve all active monthly reports.",
      operationId: "getAllPublicMonthlyReports",
      responses: {
        "200": { description: "Reports retrieved successfully" },
      },
    },
  },

  "/monthly-reports/{id}": {
    get: {
      tags: ["Monthly Reports"],
      summary: "Get report by ID",
      description: "Retrieve a single report by ID.",
      operationId: "getMonthlyReportById",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": { description: "Report retrieved successfully" },
        "404": { description: "Report not found" },
      },
    },
  },

  "/monthly-reports/year/{year}": {
    get: {
      tags: ["Monthly Reports"],
      summary: "Get reports by year",
      description: "Retrieve all reports for a given year.",
      operationId: "getMonthlyReportsByYear",
      parameters: [
        {
          name: "year",
          in: "path",
          required: true,
          schema: { type: "integer", example: 2026 },
        },
      ],
      responses: {
        "200": { description: "Reports retrieved successfully" },
      },
    },
  },

  "/monthly-reports/admin/all": {
    get: {
      tags: ["Monthly Reports - Admin"],
      summary: "Get all reports including inactive (Admin only)",
      operationId: "adminGetAllMonthlyReports",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Reports retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },

  "/monthly-reports/admin": {
    post: {
      tags: ["Monthly Reports - Admin"],
      summary: "Create monthly report (Admin only)",
      operationId: "adminCreateMonthlyReport",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateMonthlyReportRequest" },
          },
        },
      },
      responses: {
        "201": { description: "Report created successfully" },
        "400": { description: "Invalid request payload" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },

  "/monthly-reports/admin/{id}": {
    put: {
      tags: ["Monthly Reports - Admin"],
      summary: "Update monthly report (Admin only)",
      operationId: "adminUpdateMonthlyReport",
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
            schema: { $ref: "#/components/schemas/UpdateMonthlyReportRequest" },
          },
        },
      },
      responses: {
        "200": { description: "Report updated successfully" },
        "400": { description: "Invalid request payload" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
        "404": { description: "Report not found" },
      },
    },
    delete: {
      tags: ["Monthly Reports - Admin"],
      summary: "Soft-delete monthly report (Admin only)",
      operationId: "adminDeleteMonthlyReport",
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
        "200": { description: "Report deleted successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
        "404": { description: "Report not found" },
      },
    },
  },

  "/monthly-reports/admin/{id}/hard-delete": {
    delete: {
      tags: ["Monthly Reports - Admin"],
      summary: "Hard-delete monthly report (Admin only)",
      operationId: "adminHardDeleteMonthlyReport",
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
        "200": { description: "Report permanently deleted" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
        "404": { description: "Report not found" },
      },
    },
  },
};

export default monthlyReportPaths;
