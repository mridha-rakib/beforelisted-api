import type {
  AgentRepresentationType,
  IAgentProfile,
  OpportunityMessageHistory,
} from "./agent.interface";

import { AgentProfileRepository } from "./agent.repository";

export const OPPORTUNITY_MESSAGE_HISTORY_LIMIT = 10;
export const OPPORTUNITY_MESSAGE_MAX_LENGTH = 350;

const emptyHistory = (): OpportunityMessageHistory => ({
  ownerRepresentation: [],
  renterRepresentation: [],
});

export class AgentOpportunityMessageHistoryService {
  constructor(
    private readonly repository = new AgentProfileRepository(),
  ) {}

  async getForAgent(userId: string): Promise<OpportunityMessageHistory> {
    const profile = await this.repository.findByUserId(userId);
    return this.fromProfile(profile);
  }

  async record(
    userId: string,
    representationType: AgentRepresentationType,
    message?: string,
  ): Promise<OpportunityMessageHistory> {
    const normalizedMessage = message
      ?.trim()
      .slice(0, OPPORTUNITY_MESSAGE_MAX_LENGTH);

    if (!normalizedMessage) {
      return this.getForAgent(userId);
    }

    const profile = await this.repository.appendOpportunityMessage(
      userId,
      representationType,
      normalizedMessage,
    );

    return this.fromProfile(profile);
  }

  private fromProfile(
    profile: IAgentProfile | null,
  ): OpportunityMessageHistory {
    if (!profile) {
      return emptyHistory();
    }

    return {
      ownerRepresentation: (
        profile.opportunityMessageHistory?.ownerRepresentation ?? []
      ).slice(-OPPORTUNITY_MESSAGE_HISTORY_LIMIT),
      renterRepresentation: (
        profile.opportunityMessageHistory?.renterRepresentation ?? []
      ).slice(-OPPORTUNITY_MESSAGE_HISTORY_LIMIT),
    };
  }
}
