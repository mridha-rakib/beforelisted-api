// file: src/modules/agent/agent.type.ts


export type AgentRegisterPayload = {
  // User fields
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;

  // Agent-specific fields
  licenseNumber: string;
  brokerageName: string;
};


export type CreateAgentProfilePayload = {
  licenseNumber: string;
  brokerageName: string;
};


export type UpdateAgentProfilePayload = {
  brokerageName?: string;
  licenseExpiryDate?: Date;
};


export type AgentProfileResponse = {
  _id: string;
  userId: string | any; 
  licenseNumber: string;
  brokerageName: string;


  isActive: boolean;
  activeAt?: Date;



  totalRentersReferred: number;
  activeReferrals: number;



  hasGrantAccess: boolean;
  lastAccessToggleAt?: Date;


  grantAccessCount: number;
  totalMatches: number;
  successfulMatches: number;


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
