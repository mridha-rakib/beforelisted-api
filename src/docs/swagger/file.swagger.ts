// file: src/docs/swagger/file.swagger.ts
// OpenAPI endpoint definitions for File Management module

export const filePaths = {
  // ==========================================
  // FILE UPLOAD ENDPOINTS
  // ==========================================

  "/file/upload-profile-image": {
    post: {
      tags: ["File Management"],
      summary: "Upload profile image",
      description:
        "Upload a profile image for authenticated user. Supports JPG, PNG, GIF formats.",
      operationId: "uploadProfileImage",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                image: {
                  type: "string",
                  format: "binary",
                  description: "Image file (max 5MB)",
                },
              },
              required: ["image"],
            },
          },
        },
      },
      responses: {
        200: {
          description: "Profile image uploaded successfully",
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
                      profileImageUrl: {
                        type: "string",
                        example:
                          "https://s3.amazonaws.com/bucket/users/123/profile.jpg",
                      },
                      fileName: { type: "string", example: "profile.jpg" },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: "No file provided or invalid format",
        },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/file/profile-image": {
    delete: {
      tags: ["File Management"],
      summary: "Delete profile image",
      description: "Remove the current profile image for authenticated user",
      operationId: "deleteProfileImage",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Profile image deleted successfully",
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
                        example: "Profile image deleted successfully",
                      },
                    },
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

  "/file/upload-excel": {
    post: {
      tags: ["File Management"],
      summary: "Upload Excel file",
      description: "Upload an Excel file (XLS, XLSX format)",
      operationId: "uploadExcelFile",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                file: {
                  type: "string",
                  format: "binary",
                  description: "Excel file (XLS, XLSX - max 10MB)",
                },
                folder: {
                  type: "string",
                  example: "uploads/documents/excel",
                  description: "Optional custom folder path",
                },
              },
              required: ["file"],
            },
          },
        },
      },
      responses: {
        200: {
          description: "Excel file uploaded successfully",
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
                      fileUrl: {
                        type: "string",
                        example:
                          "https://s3.amazonaws.com/bucket/uploads/documents/excel/data.xlsx",
                      },
                      fileName: { type: "string", example: "data.xlsx" },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: "No file provided or invalid format" },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/file/upload-pdf": {
    post: {
      tags: ["File Management"],
      summary: "Upload PDF file",
      description: "Upload a PDF file for documents, reports, or licenses",
      operationId: "uploadPdfFile",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                file: {
                  type: "string",
                  format: "binary",
                  description: "PDF file (max 10MB)",
                },
                folder: {
                  type: "string",
                  example: "uploads/documents/pdf",
                  description: "Optional custom folder path",
                },
              },
              required: ["file"],
            },
          },
        },
      },
      responses: {
        200: {
          description: "PDF file uploaded successfully",
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
                      fileUrl: {
                        type: "string",
                        example:
                          "https://s3.amazonaws.com/bucket/uploads/documents/pdf/report.pdf",
                      },
                      fileName: { type: "string", example: "report.pdf" },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: "No file provided or invalid format" },
        401: { description: "Unauthorized" },
      },
    },
  },
};

export default filePaths;
