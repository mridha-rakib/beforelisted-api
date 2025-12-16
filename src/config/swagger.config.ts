// file: src/config/swagger.config.ts
// Main Swagger/OpenAPI Configuration

import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

// Import module schemas
import agentSchemas from "@/docs/swagger/agent.schemas";
import agentPaths from "@/docs/swagger/agent.swagger";
import authSchemas from "@/docs/swagger/auth.schemas";
import authPaths from "@/docs/swagger/auth.swagger";
import faqSchemas from "@/docs/swagger/faq.schemas";
import faqPaths from "@/docs/swagger/faq.swagger";
import fileSchemas from "@/docs/swagger/file.schemas";
import filePaths from "@/docs/swagger/file.swagger";
import monthlyReportSchemas from "@/docs/swagger/monthly-report.schemas";
import monthlyReportPaths from "@/docs/swagger/monthly-report.swagger";
import preMarketSchemas from "@/docs/swagger/pre-market.schemas";
import preMarketPaths from "@/docs/swagger/pre-market.swagger";
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
        url: "http://localhost:7070/api/v1",
        description: "Development Server",
      },
      {
        url: "https://broadcasting-framing-showcase-tourism.trycloudflare.com/api/v1",
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
        ...userSchemas,
        ...agentSchemas,
        ...renterSchemas,
        ...preMarketSchemas,
        ...fileSchemas,
        ...monthlyReportSchemas,
        ...faqSchemas,
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

const swaggerSpec: any = swaggerJsdoc(options);

// Manually add paths from modules
swaggerSpec.paths = {
  ...authPaths,
  ...userPaths,
  ...agentPaths,
  ...renterPaths,
  ...preMarketPaths,
  ...filePaths,
  ...monthlyReportPaths,
  ...faqPaths,
};

export { swaggerSpec, swaggerUi };

