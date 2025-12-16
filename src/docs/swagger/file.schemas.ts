// file: src/docs/swagger/file.schemas.ts
// OpenAPI schema definitions for File Management module

export const fileSchemas = {
  FileUploadResponse: {
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
            format: "uri",
            example: "https://s3.amazonaws.com/bucket/users/123/profile.jpg",
          },
          fileName: { type: "string", example: "profile.jpg" },
        },
      },
    },
  },

  ExcelUploadResponse: {
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
            format: "uri",
            example:
              "https://s3.amazonaws.com/bucket/uploads/documents/excel/data.xlsx",
          },
          fileName: { type: "string", example: "data.xlsx" },
        },
      },
    },
  },

  PdfUploadResponse: {
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
            format: "uri",
            example:
              "https://s3.amazonaws.com/bucket/uploads/documents/pdf/report.pdf",
          },
          fileName: { type: "string", example: "report.pdf" },
        },
      },
    },
  },

  FileDeleteResponse: {
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
};

export default fileSchemas;
