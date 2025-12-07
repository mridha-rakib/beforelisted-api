// file: src/modules/agent/agent.type.ts

/**
 * Agent Registration Payload (Complete registration)
 * Includes both user and agent-specific fields
 */
export type AgentRegisterPayload = {
  // User fields
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;

  // Agent-specific fields
  licenseNumber: string;
  brokerageName: string;
  brokerageAddress?: string;
  licenseExpiryDate: Date;
};

/**
 * Create agent profile payload (INTERNAL - after user created)
 */
export type CreateAgentProfilePayload = {
  licenseNumber: string;
  brokerageName: string;
};

/**
 * Update agent profile payload
 */
export type UpdateAgentProfilePayload = {
  brokerageName?: string;
  brokerageAddress?: string;
  licenseExpiryDate?: Date;
};

/**
 * Agent profile response
 */
export type AgentProfileResponse = {
  _id: string;
  userId: string;
  licenseNumber: string;
  brokerageName: string;
  isVerified: boolean;
  isSuspended: boolean;
  grantAccessCount: number;
  totalMatches: number;
  successfulMatches: number;
  avgResponseTime?: number;
  isApprovedByAdmin: boolean;
  profileCompleteness: number;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Agent registration response (User + Profile)
 */
export type AgentRegistrationResponse = {
  user: {
    _id: string;
    email: string;
    fullName: string;
    role: string;
    referralCode?: string;
  };
  profile: AgentProfileResponse;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  };
};

/**
 * Admin approve payload
 */
export type AdminApproveAgentPayload = {
  adminNotes?: string;
};

/**
 * Admin suspend payload
 */
export type AdminSuspendAgentPayload = {
  suspensionReason: string;
};

/**
 * Admin metrics payload
 */
export type AdminAgentMetricsResponse = {
  totalAgents: number;
  verifiedAgents: number;
  suspendedAgents: number;
  approvedAgents: number;
  pendingApprovalAgents: number;
  totalMatches: number;
  totalGrantAccess: number;
  avgSuccessRate: number;
};
