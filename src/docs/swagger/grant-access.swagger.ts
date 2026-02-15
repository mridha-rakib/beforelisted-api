// file: src/docs/swagger/grant-access.swagger.ts
// OpenAPI paths for Grant Access endpoints

export const grantAccessPaths = {
  "/grant-access/admin/payments": {
    get: {
      tags: ["Grant Access - Admin"],
      summary: "Get all grant-access payments",
      operationId: "adminGetGrantAccessPayments",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Payments retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },

  "/grant-access/admin/payments/stats": {
    get: {
      tags: ["Grant Access - Admin"],
      summary: "Get payment statistics",
      operationId: "adminGetGrantAccessPaymentStats",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Payment stats retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },

  "/grant-access/admin/payments/{paymentId}": {
    get: {
      tags: ["Grant Access - Admin"],
      summary: "Get payment details",
      operationId: "adminGetGrantAccessPaymentDetails",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "paymentId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": { description: "Payment details retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
        "404": { description: "Payment not found" },
      },
    },
    delete: {
      tags: ["Grant Access - Admin"],
      summary: "Delete payment",
      operationId: "adminDeleteGrantAccessPayment",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "paymentId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": { description: "Payment deleted successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
        "404": { description: "Payment not found" },
      },
    },
  },

  "/grant-access/admin/payments/{paymentId}/deletion-history": {
    get: {
      tags: ["Grant Access - Admin"],
      summary: "Get payment deletion history",
      operationId: "adminGetGrantAccessPaymentDeletionHistory",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "paymentId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": { description: "Deletion history retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },

  "/grant-access/admin/income/monthly": {
    get: {
      tags: ["Grant Access - Admin"],
      summary: "Get monthly income breakdown",
      operationId: "adminGetMonthlyGrantAccessIncome",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "year",
          in: "query",
          required: false,
          schema: { type: "integer", example: 2026 },
        },
      ],
      responses: {
        "200": { description: "Monthly income retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },

  "/grant-access/admin/income/monthly/{year}/{month}": {
    get: {
      tags: ["Grant Access - Admin"],
      summary: "Get monthly income detail",
      operationId: "adminGetMonthlyGrantAccessIncomeDetail",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "year",
          in: "path",
          required: true,
          schema: { type: "integer", example: 2026 },
        },
        {
          name: "month",
          in: "path",
          required: true,
          schema: { type: "integer", example: 2 },
        },
      ],
      responses: {
        "200": { description: "Monthly income detail retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },

  "/grant-access/admin/income/range": {
    get: {
      tags: ["Grant Access - Admin"],
      summary: "Get income by date range",
      operationId: "adminGetGrantAccessIncomeByRange",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "startDate",
          in: "query",
          required: true,
          schema: { type: "string", format: "date" },
        },
        {
          name: "endDate",
          in: "query",
          required: true,
          schema: { type: "string", format: "date" },
        },
      ],
      responses: {
        "200": { description: "Income range retrieved successfully" },
        "400": { description: "Invalid date range" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },

  "/grant-access/admin/income/{year}": {
    get: {
      tags: ["Grant Access - Admin"],
      summary: "Get yearly income breakdown",
      operationId: "adminGetYearlyGrantAccessIncome",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "year",
          in: "path",
          required: true,
          schema: { type: "integer", example: 2026 },
        },
      ],
      responses: {
        "200": { description: "Yearly income retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },
};

export default grantAccessPaths;
