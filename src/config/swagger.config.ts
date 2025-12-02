// file: src/config/swagger.config.ts
// Main Swagger/OpenAPI Configuration

import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

// Import module schemas
import authSchemas from "@/docs/swagger/auth.schemas";
import authPaths from "@/docs/swagger/auth.swagger";
import renterSchemas from "@/docs/swagger/renter.schema";
import renterPaths from "@/docs/swagger/renter.swagger";
import userSchemas from "@/docs/swagger/user.schemas";
import userPaths from "@/docs/swagger/user.swagger";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "BeforeListed  API",
      version: "1.0.0",
      description:
        "Complete API documentation for renter management system with authentication, user management, and role-based features",
      contact: {
        name: "API Support",
        email: "support@rentermanagement.com",
      },
      license: {
        name: "MIT",
      },
    },
    servers: [
      {
        url: "http://localhost:5000/api/v1",
        description: "Development Server",
      },
      {
        url: "https://api.rentermanagement.com/api/v1",
        description: "Production Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            'JWT token in Authorization header. Format: "Authorization: Bearer {token}"',
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "refreshToken",
          description: "Refresh token stored in httpOnly cookie",
        },
      },
      schemas: {
        ...authSchemas,
        ...renterSchemas,
        ...userSchemas,
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [], // We'll use direct path objects instead
};

const swaggerSpec = swaggerJsdoc(options);

// Manually add paths from modules
swaggerSpec.paths = {
  ...authPaths,
  ...renterPaths,
  ...userPaths,
};

export { swaggerSpec, swaggerUi };
