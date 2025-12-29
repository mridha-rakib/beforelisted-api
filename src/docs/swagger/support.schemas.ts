// file: src/docs/swagger/support.schemas.ts
// OpenAPI schema definitions for Support module

export const supportSchemas = {
  ContactAdminPayload: {
    type: "object",
    required: ["fullName", "email", "subject", "message"],
    properties: {
      fullName: {
        type: "string",
        example: "Jane Doe",
      },
      email: {
        type: "string",
        format: "email",
        example: "jane.doe@example.com",
      },
      subject: {
        type: "string",
        example: "Account access help",
      },
      message: {
        type: "string",
        example: "Hello, I need help accessing my account.",
      },
    },
  },
  ContactAdminResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      statusCode: { type: "integer", example: 200 },
      message: { type: "string", example: "Message sent successfully" },
      data: {
        type: "object",
        properties: {
          messageId: {
            type: "string",
            example: "b29f52ee-cc3f-4d8e-b6d3-32a1b3f9c7da",
          },
        },
      },
    },
  },
};

export default supportSchemas;
