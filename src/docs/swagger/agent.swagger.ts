// file: src/docs/swagger/agent.swagger.ts
// Complete OpenAPI paths for Agent endpoints

export const agentPaths = {
  "/agent/register": {
    post: {
      tags: ["Agent Management"],
      summary: "Register new agent",
      description: "Complete agent registration with license and brokerage details.",
      operationId: "registerAgent",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/AgentRegisterRequest",
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Agent registered successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AgentRegisterResponse",
              },
            },
          },
        },
        "400": {
          description: "Invalid input - missing or invalid fields",
        },
        "409": {
          description: "Conflict - email already exists",
        },
      },
    },
  },

  "/agent/profile": {
    get: {
      tags: ["Agent Management"],
      summary: "Get own agent profile",
      description: "Retrieve authenticated agent's profile with license and brokerage info.",
      operationId: "getAgentProfile",
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        "200": {
          description: "Profile retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/GetAgentProfileResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
        },
        "404": {
          description: "Agent profile not found",
        },
      },
    },

    put: {
      tags: ["Agent Management"],
      summary: "Update agent profile",
      description: "Update authenticated agent's profile information.",
      operationId: "updateAgentProfile",
      security: [
        {
          bearerAuth: [],
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/UpdateAgentProfileRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Profile updated successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateAgentProfileResponse",
              },
            },
          },
        },
        "400": {
          description: "Invalid input data",
        },
        "401": {
          description: "Unauthorized",
        },
      },
    },
  },

  "/agent/referral-link": {
    get: {
      tags: ["Agent Management"],
      summary: "Get agent referral link",
      description: "Retrieve agent's referral code and link for renter referrals.",
      operationId: "getAgentReferralLink",
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        "200": {
          description: "Referral link retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ReferralLinkResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
        },
      },
    },
  },

  "/agent/stats": {
    get: {
      tags: ["Agent Management"],
      summary: "Get agent statistics",
      description: "Retrieve agent's performance statistics and metrics.",
      operationId: "getAgentStats",
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        "200": {
          description: "Statistics retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AgentStatsResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
        },
      },
    },
  },

  "/agent/admin/all": {
    get: {
      tags: ["Agent Management - Admin"],
      summary: "Get all agents (Admin only)",
      description: "Retrieve list of all agents. Admin only.",
      operationId: "adminGetAllAgents",
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        "200": {
          description: "Agents retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AllAgentsResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
        },
        "403": {
          description: "Forbidden - Admin role required",
        },
      },
    },
  },

  "/agent/admin/pending-approval": {
    get: {
      tags: ["Agent Management - Admin"],
      summary: "Get pending approval agents (Admin only)",
      description: "Retrieve list of agents pending admin approval.",
      operationId: "adminGetPendingApprovalAgents",
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        "200": {
          description: "Pending agents retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AllAgentsResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
        },
        "403": {
          description: "Forbidden - Admin role required",
        },
      },
    },
  },

  "/agent/admin/suspended": {
    get: {
      tags: ["Agent Management - Admin"],
      summary: "Get suspended agents (Admin only)",
      description: "Retrieve list of suspended agents.",
      operationId: "adminGetSuspendedAgents",
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        "200": {
          description: "Suspended agents retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AllAgentsResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
        },
        "403": {
          description: "Forbidden - Admin role required",
        },
      },
    },
  },

  "/agent/admin/{userId}": {
    get: {
      tags: ["Agent Management - Admin"],
      summary: "Get specific agent (Admin only)",
      description: "Retrieve specific agent's profile by ID.",
      operationId: "adminGetAgent",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "userId",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
          description: "Agent user ID",
        },
      ],
      responses: {
        "200": {
          description: "Agent retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AgentProfileResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
        },
        "403": {
          description: "Forbidden - Admin role required",
        },
        "404": {
          description: "Agent not found",
        },
      },
    },
  },

  "/agent/admin/approve/{userId}": {
    post: {
      tags: ["Agent Management - Admin"],
      summary: "Approve agent (Admin only)",
      description: "Approve a pending agent application.",
      operationId: "adminApproveAgent",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "userId",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
        },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/AdminApproveAgentRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Agent approved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ApprovalResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
        },
        "403": {
          description: "Forbidden - Admin role required",
        },
      },
    },
  },

  "/agent/admin/suspend/{userId}": {
    post: {
      tags: ["Agent Management - Admin"],
      summary: "Suspend agent (Admin only)",
      description: "Suspend an active agent's account.",
      operationId: "adminSuspendAgent",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "userId",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/AdminSuspendAgentRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Agent suspended successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/SuspensionResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
        },
        "403": {
          description: "Forbidden - Admin role required",
        },
      },
    },
  },

  "/agent/admin/verify/{userId}": {
    post: {
      tags: ["Agent Management - Admin"],
      summary: "Verify agent (Admin only)",
      description: "Verify an agent's license and credentials.",
      operationId: "adminVerifyAgent",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "userId",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
        },
      ],
      responses: {
        "200": {
          description: "Agent verified successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/VerificationResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
        },
        "403": {
          description: "Forbidden - Admin role required",
        },
      },
    },
  },

  "/agent/admin/{userId}/toggle-active": {
    post: {
      tags: ["Agent Management - Admin"],
      summary: "Toggle agent active status (Admin only)",
      description: "Toggle agent between active and deactivated status.",
      operationId: "adminToggleAgentActive",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "userId",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
        },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ToggleActiveRequest",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Agent status toggled successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/StatusToggleResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
        },
        "403": {
          description: "Forbidden - Admin role required",
        },
      },
    },
  },

  "/agent/admin/{userId}/activation-history": {
    get: {
      tags: ["Agent Management - Admin"],
      summary: "Get activation history (Admin only)",
      description: "Retrieve agent's activation/deactivation history.",
      operationId: "getActivationHistory",
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          name: "userId",
          in: "path",
          required: true,
          schema: {
            type: "string",
          },
        },
      ],
      responses: {
        "200": {
          description: "Activation history retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ActivationHistoryResponse",
              },
            },
          },
        },
        "401": {
          description: "Unauthorized",
        },
        "403": {
          description: "Forbidden - Admin role required",
        },
      },
    },
  },
};

export default agentPaths;