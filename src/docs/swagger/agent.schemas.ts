// file: src/docs/swagger/agent.schemas.ts
// OpenAPI schema definitions for Agent module

export const agentSchemas = {
  // ==========================================
  // REQUEST SCHEMAS
  // ==========================================

  AgentRegisterRequest: {
    type: "object",
    required: [
      "fullName",
      "email",
      "password",
      "licenseNumber",
      "brokerageName",
      "title",
    ],
    properties: {
      fullName: {
        type: "string",
        minLength: 2,
        maxLength: 100,
        example: "John Smith",
      },
      email: {
        type: "string",
        format: "email",
        example: "john.smith@brokerage.com",
      },
      password: {
        type: "string",
        format: "password",
        minLength: 6,
        example: "SecurePassword123!",
      },
      phoneNumber: {
        type: "string",
        example: "+1234567890",
        nullable: true,
      },
      licenseNumber: {
        type: "string",
        minLength: 1,
        maxLength: 50,
        example: "LIC-2024-001",
        description: "Real estate license number",
      },
      brokerageName: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        example: "Smith & Associates Realty",
        description: "Name of brokerage firm",
      },
      title: {
        type: "string",
        enum: [
          "Licensed Real Estate Salesperson",
          "Associate Real Estate Broker",
        ],
        example: "Licensed Real Estate Salesperson",
        description: "Standardized agent credential title",
      },
    },
  },

  UpdateAgentProfileRequest: {
    type: "object",
    properties: {
      fullName: {
        type: "string",
        minLength: 2,
        maxLength: 100,
        example: "John Smith",
      },
      brokerageName: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        example: "Updated Brokerage Name",
      },
      title: {
        type: "string",
        enum: [
          "Licensed Real Estate Salesperson",
          "Associate Real Estate Broker",
        ],
        example: "Associate Real Estate Broker",
      },
    },
  },

  AdminApproveAgentRequest: {
    type: "object",
    properties: {
      adminNotes: {
        type: "string",
        maxLength: 500,
        example: "License verified and approved",
        nullable: true,
      },
    },
  },

  AdminSuspendAgentRequest: {
    type: "object",
    required: ["suspensionReason"],
    properties: {
      suspensionReason: {
        type: "string",
        minLength: 1,
        maxLength: 500,
        example: "Violation of terms of service",
      },
    },
  },

  ToggleActiveRequest: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        example: "Agent requested deactivation",
        nullable: true,
      },
    },
  },

  ActivateAgentWithLinkRequest: {
    type: "object",
    required: ["activationLink"],
    properties: {
      activationLink: {
        type: "string",
        format: "uri",
        example: "https://powerforms.docusign.net/abc123?PowerFormId=xyz",
        description: "Required activation link attached to agent profile",
      },
      reason: {
        type: "string",
        nullable: true,
        example: "Activation approved by admin after link review",
      },
    },
  },

  // ==========================================
  // RESPONSE SCHEMAS
  // ==========================================

  AgentRegisterResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 201,
      },
      message: {
        type: "string",
        example: "Agent registered successfully",
      },
      data: {
        type: "object",
        properties: {
          user: {
            $ref: "#/components/schemas/AgentUserObject",
          },
          agent: {
            $ref: "#/components/schemas/AgentProfile",
          },
          accessToken: {
            type: "string",
            example: "eyJhbGciOiJIUzI1NiIs...",
          },
          expiresIn: {
            type: "integer",
            example: 3600,
          },
        },
      },
    },
  },

  GetAgentProfileResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Agent profile retrieved successfully",
      },
      data: {
        $ref: "#/components/schemas/AgentProfile",
      },
    },
  },

  UpdateAgentProfileResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Agent profile updated successfully",
      },
      data: {
        $ref: "#/components/schemas/AgentProfile",
      },
    },
  },

  ReferralLinkResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Referral information retrieved successfully",
      },
      data: {
        type: "object",
        properties: {
          referralCode: {
            type: "string",
            example: "AGT-ILTFDRTU",
            description: "Unique agent referral code",
          },
          referralLink: {
            type: "string",
            format: "uri",
            example: "https://beforelisted.com/join?ref=AGT-ILTFDRTU",
          },
          totalReferrals: {
            type: "integer",
            example: 42,
          },
          referredUsersCount: {
            type: "integer",
            example: 25,
          },
          referredUsers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                },
                fullName: {
                  type: "string",
                },
                email: {
                  type: "string",
                },
                registeredAt: {
                  type: "string",
                  format: "date-time",
                },
              },
            },
          },
        },
      },
    },
  },

  AgentStatsResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Agent statistics retrieved successfully",
      },
      data: {
        type: "object",
        properties: {
          totalRentersReferred: {
            type: "integer",
            example: 42,
          },
          activeReferrals: {
            type: "integer",
            example: 30,
          },
          referralConversionRate: {
            type: "number",
            example: 71.4,
            description: "Percentage of referrals that became active users",
          },
          grantAccessCount: {
            type: "integer",
            example: 15,
          },
          totalMatches: {
            type: "integer",
            example: 85,
          },
          successfulMatches: {
            type: "integer",
            example: 52,
          },
          avgResponseTime: {
            type: "number",
            example: 2.5,
            description: "Average response time in hours",
          },
          profileCompleteness: {
            type: "number",
            example: 95,
            description: "Percentage of profile completion",
          },
        },
      },
    },
  },

  AllAgentsResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Agents retrieved successfully",
      },
      data: {
        type: "array",
        items: {
          $ref: "#/components/schemas/AgentProfile",
        },
      },
    },
  },

  AgentProfileResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Agent profile retrieved successfully",
      },
      data: {
        $ref: "#/components/schemas/AgentProfile",
      },
    },
  },

  ApprovalResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Agent approved successfully",
      },
      data: {
        type: "object",
        properties: {
          isApprovedByAdmin: {
            type: "boolean",
            example: true,
          },
          approvedAt: {
            type: "string",
            format: "date-time",
          },
        },
      },
    },
  },

  SuspensionResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Agent suspended successfully",
      },
    },
  },

  VerificationResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Agent verified successfully",
      },
    },
  },

  StatusToggleResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Agent status toggled successfully",
      },
      data: {
        type: "object",
        properties: {
          isActive: {
            type: "boolean",
            example: false,
          },
          previousStatus: {
            type: "boolean",
            example: true,
          },
        },
      },
    },
  },

  ActivationHistoryResponse: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
        example: true,
      },
      statusCode: {
        type: "integer",
        example: 200,
      },
      message: {
        type: "string",
        example: "Activation history retrieved successfully",
      },
      data: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["activated", "deactivated"],
              example: "deactivated",
            },
            changedBy: {
              type: "string",
              description: "Admin user ID who made the change",
            },
            changedAt: {
              type: "string",
              format: "date-time",
            },
            reason: {
              type: "string",
              nullable: true,
            },
          },
        },
      },
    },
  },

  // ==========================================
  // DATA SCHEMAS
  // ==========================================

  AgentProfile: {
    type: "object",
    properties: {
      _id: {
        type: "string",
        description: "Agent profile ID",
      },
      userId: {
        type: "string",
        description: "Associated user ID",
      },
      licenseNumber: {
        type: "string",
        example: "LIC-2024-001",
      },
      brokerageName: {
        type: "string",
        example: "Smith & Associates Realty",
      },
      title: {
        type: "string",
        enum: [
          "Licensed Real Estate Salesperson",
          "Associate Real Estate Broker",
        ],
        example: "Licensed Real Estate Salesperson",
      },
      isActive: {
        type: "boolean",
        example: true,
      },
      activationLink: {
        type: "string",
        format: "uri",
        nullable: true,
        example: "https://powerforms.docusign.net/abc123?PowerFormId=xyz",
      },
      isApprovedByAdmin: {
        type: "boolean",
        example: true,
      },
      approvedAt: {
        type: "string",
        format: "date-time",
        nullable: true,
      },
      adminNotes: {
        type: "string",
        nullable: true,
      },
      totalRentersReferred: {
        type: "integer",
        example: 42,
      },
      activeReferrals: {
        type: "integer",
        example: 30,
      },
      referralConversionRate: {
        type: "number",
        example: 71.4,
      },
      hasGrantAccess: {
        type: "boolean",
        example: true,
      },
      grantAccessCount: {
        type: "integer",
        example: 15,
      },
      totalMatches: {
        type: "integer",
        example: 85,
      },
      successfulMatches: {
        type: "integer",
        example: 52,
      },
      profileCompleteness: {
        type: "number",
        example: 95,
      },
      createdAt: {
        type: "string",
        format: "date-time",
      },
      updatedAt: {
        type: "string",
        format: "date-time",
      },
    },
  },

  AgentUserObject: {
    type: "object",
    properties: {
      userId: {
        type: "string",
      },
      email: {
        type: "string",
        format: "email",
      },
      fullName: {
        type: "string",
      },
      role: {
        type: "string",
        enum: ["agent"],
        example: "agent",
      },
      isEmailVerified: {
        type: "boolean",
        example: true,
      },
      isActive: {
        type: "boolean",
        example: true,
      },
    },
  },
};

export default agentSchemas;
