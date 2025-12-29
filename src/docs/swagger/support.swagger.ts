// file: src/docs/swagger/support.swagger.ts
// OpenAPI endpoint definitions for Support module

export const supportPaths = {
  "/support/contact": {
    post: {
      tags: ["Support"],
      summary: "Send a message to admin",
      description: "Public endpoint to send a message to the system admin.",
      operationId: "contactAdmin",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ContactAdminPayload" },
            example: {
              fullName: "Jane Doe",
              email: "jane.doe@example.com",
              subject: "Account access help",
              message: "Hello, I need help accessing my account.",
            },
          },
        },
      },
      responses: {
        200: {
          description: "Message sent successfully",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ContactAdminResponse" },
            },
          },
        },
        400: { description: "Validation error" },
        500: { description: "Failed to send message" },
      },
    },
  },
};

export default supportPaths;
