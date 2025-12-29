// file: src/config/swagger.config.ts

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
import supportSchemas from "@/docs/swagger/support.schemas";
import supportPaths from "@/docs/swagger/support.swagger";
import userSchemas from "@/docs/swagger/user.schemas";
import userPaths from "@/docs/swagger/user.swagger";
import { env } from "@/env";

const brandColor = env.EMAIL_BRAND_COLOR || "#1890FF";
const appLogo = env.EMAIL_LOGO_URL;
const infoDescription = `
![BeforeListed Logo](${appLogo})

> **BeforeListed API**  
> Comprehensive API documentation for the BeforeListed platform, covering authentication, user management, agents, renters, files, and reports.

---

### 🚀 Environments
| Environment | Base URL |
| ----------- | -------- |
| Development | \`http://localhost:7070/api/v1\` |
| Production | \`https://mating-album-collecting-parking.trycloudflare.com/api/v1\` |

### 🔐 Security
- JWT Bearer authentication for protected routes
- Refresh token via secure HTTP-only cookies
- Optional cookie-based session management

### 🔗 Quick Links
1. [Authentication](#tag/Authentication)
2. [Users](#tag/Users)
3. [Agents](#tag/Agents)
4. [Pre-Market](#tag/Pre-Market)
5. [Renters](#tag/Renters)
6. [Files](#tag/Files)
7. [Monthly Reports](#tag/Monthly-Reports)
8. [FAQs](#tag/Faqs)

---

Need help? Contact [support@beforelisted.com](mailto:support@beforelisted.com).
`;

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "BeforeListed API",
      version: "1.0.0",
      description: infoDescription,
      contact: {
        name: "API Support",
        email: "support@beforelisted.com",
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
        url: "https://mating-album-collecting-parking.trycloudflare.com/api/v1",
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
        ...supportSchemas,
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
  ...supportPaths,
};

const customCss = `
  .swagger-ui {
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: linear-gradient(180deg, rgba(24,144,255,0.05) 0%, rgba(255,255,255,1) 35%, rgba(255,255,255,1) 100%);
    min-height: 100vh;
  }
  .swagger-ui .topbar {
    background-color: ${brandColor} !important;
    padding: 8px 0;
  }
  .swagger-ui .info .title {
    color: ${brandColor} !important;
  }
  .swagger-ui .btn.authorize {
    background-color: ${brandColor} !important;
    border-color: ${brandColor} !important;
  }
  .swagger-ui .opblock.opblock-post {
    border-color: ${brandColor} !important;
  }
  .swagger-ui .opblock.opblock-post .opblock-summary-method {
    background: ${brandColor} !important;
  }
  .swagger-ui .opblock .opblock-summary {
    border-color: ${brandColor} !important;
  }
  .swagger-ui .btn.execute {
    background-color: ${brandColor} !important;
  }
  .swagger-ui .scheme-container {
    background: ${brandColor}15 !important;
  }
  .swagger-ui .info .info__description {
    border-radius: 12px;
    border: 1px solid rgba(0,0,0,0.05);
    padding: 24px;
    background: #fff;
    box-shadow: 0 10px 30px rgba(15,23,42,0.07);
  }
  .swagger-ui table {
    border-radius: 8px;
    overflow: hidden;
  }
  .swagger-ui table thead tr {
    background: ${brandColor}12;
  }
  .swagger-ui table th {
    color: ${brandColor};
  }
`;
// Swagger UI Options
const swaggerUiOptions = {
  customCss,
  customSiteTitle: "BeforeListed API Documentation",
  customfavIcon: env.EMAIL_LOGO_URL,
  customCssUrl:
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: "list",
    filter: true,
    displayRequestDuration: true,
  },
};

export { swaggerSpec, swaggerUi, swaggerUiOptions };
