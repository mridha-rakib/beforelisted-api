// file: src/docs/swagger/agent.swagger.ts
// OpenAPI paths for Agent endpoints

export const agentPaths = {
  "/agent/register": {
    post: {
      tags: ["Agent Management"],
      summary: "Register new agent",
      description: "Public endpoint to register a new agent account.",
      operationId: "registerAgent",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/AgentRegisterRequest" },
          },
        },
      },
      responses: {
        "201": { description: "Agent registered successfully" },
        "400": { description: "Invalid request payload" },
        "409": { description: "Conflict - email already exists" },
      },
    },
  },

  "/agent/profile": {
    get: {
      tags: ["Agent Management"],
      summary: "Get own agent profile",
      description: "Retrieve the authenticated agent profile.",
      operationId: "getAgentProfile",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Profile retrieved successfully" },
        "401": { description: "Unauthorized" },
      },
    },
    put: {
      tags: ["Agent Management"],
      summary: "Update own agent profile",
      description: "Update the authenticated agent profile.",
      operationId: "updateAgentProfile",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UpdateAgentProfileRequest" },
          },
        },
      },
      responses: {
        "200": { description: "Profile updated successfully" },
        "400": { description: "Invalid request payload" },
        "401": { description: "Unauthorized" },
      },
    },
    delete: {
      tags: ["Agent Management"],
      summary: "Delete own agent profile",
      description: "Soft-delete the authenticated agent profile.",
      operationId: "deleteAgentProfile",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Profile deleted successfully" },
        "401": { description: "Unauthorized" },
      },
    },
  },

  "/agent/email-subscription/toggle": {
    post: {
      tags: ["Agent Management"],
      summary: "Toggle agent email subscription",
      description: "Enable or disable email notifications for the agent.",
      operationId: "toggleAgentEmailSubscription",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Email subscription updated" },
        "401": { description: "Unauthorized" },
      },
    },
  },

  "/agent/accepting-requests/toggle": {
    post: {
      tags: ["Agent Management"],
      summary: "Toggle accepting requests",
      description: "Toggle whether the agent is accepting new requests.",
      operationId: "toggleAcceptingRequests",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Accepting requests updated" },
        "401": { description: "Unauthorized" },
      },
    },
  },

  "/agent/accepting-requests/status": {
    get: {
      tags: ["Agent Management"],
      summary: "Get accepting requests status",
      description: "Get current accepting-requests status for the agent.",
      operationId: "getAcceptingRequestsStatus",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Status retrieved successfully" },
        "401": { description: "Unauthorized" },
      },
    },
  },

  "/agent/referral-link": {
    get: {
      tags: ["Agent Management"],
      summary: "Get agent referral link",
      description: "Retrieve the authenticated agent referral code and link.",
      operationId: "getAgentReferralLink",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Referral information retrieved successfully" },
        "401": { description: "Unauthorized" },
      },
    },
  },

  "/agent/admin/all": {
    get: {
      tags: ["Agent Management - Admin"],
      summary: "Get all agents (Admin only)",
      description: "Retrieve all agents with pagination and filters.",
      operationId: "adminGetAllAgents",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "page",
          in: "query",
          schema: { type: "integer", example: 1 },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", example: 10 },
        },
        {
          name: "sort",
          in: "query",
          schema: { type: "string", example: "-createdAt" },
        },
        {
          name: "search",
          in: "query",
          schema: { type: "string" },
        },
        {
          name: "isActive",
          in: "query",
          schema: { type: "boolean" },
        },
        {
          name: "hasGrantAccess",
          in: "query",
          schema: { type: "boolean" },
        },
      ],
      responses: {
        "200": { description: "Agents retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },

  "/agent/admin/excel-download": {
    get: {
      tags: ["Agent Management - Admin"],
      summary: "Get agents consolidated excel metadata",
      description:
        "Retrieve downloadable metadata for the agents consolidated excel file.",
      operationId: "downloadAgentConsolidatedExcel",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": { description: "Excel metadata retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },

  "/agent/admin/{userId}": {
    get: {
      tags: ["Agent Management - Admin"],
      summary: "Get specific agent (Admin only)",
      description: "Retrieve a specific agent profile by user ID.",
      operationId: "adminGetSpecificAgent",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "userId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": { description: "Agent retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
        "404": { description: "Agent not found" },
      },
    },
  },

  "/agent/{agentId}/toggle-access": {
    post: {
      tags: ["Agent Management - Admin"],
      summary: "Toggle agent grant access (Admin only)",
      description:
        "Grant or revoke agent access to restricted pre-market information.",
      operationId: "toggleAgentAccess",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "agentId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                reason: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        "200": { description: "Agent access toggled successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },

  "/agent/{agentId}/access-status": {
    get: {
      tags: ["Agent Management - Admin"],
      summary: "Get agent access status (Admin only)",
      description: "Retrieve current grant-access status for an agent.",
      operationId: "getAgentAccessStatus",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "agentId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": { description: "Access status retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },

  "/agent/admin/{userId}/toggle-active": {
    post: {
      tags: ["Agent Management - Admin"],
      summary: "Toggle agent active status (Admin only)",
      description:
        "Activate or deactivate an agent account with optional reason.",
      operationId: "toggleAgentActive",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "userId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                reason: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        "200": { description: "Agent status updated successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },

  "/agent/admin/{userId}/activation-history": {
    get: {
      tags: ["Agent Management - Admin"],
      summary: "Get agent activation history (Admin only)",
      description: "Retrieve activation and deactivation history for an agent.",
      operationId: "getAgentActivationHistory",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "userId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": { description: "Activation history retrieved successfully" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden - Admin role required" },
      },
    },
  },
};

export default agentPaths;
