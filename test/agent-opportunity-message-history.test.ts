import { describe, expect, it, vi } from "vitest";

import { AgentOpportunityMessageHistoryService } from "../src/modules/agent/agent-opportunity-message-history.service";
import { AgentProfileRepository } from "../src/modules/agent/agent.repository";

const profileWithHistory = (
  ownerRepresentation: string[] = [],
  renterRepresentation: string[] = [],
) => ({
  opportunityMessageHistory: {
    ownerRepresentation,
    renterRepresentation,
  },
});

describe("AgentOpportunityMessageHistoryService", () => {
  it("returns separate owner and renter histories capped at ten", async () => {
    const repository = {
      findByUserId: vi.fn().mockResolvedValue(
        profileWithHistory(
          Array.from({ length: 12 }, (_, index) => `owner-${index + 1}`),
          ["renter-1", "renter-2"],
        ),
      ),
    };
    const service = new AgentOpportunityMessageHistoryService(
      repository as any,
    );

    await expect(service.getForAgent("agent-1")).resolves.toEqual({
      ownerRepresentation: Array.from(
        { length: 10 },
        (_, index) => `owner-${index + 3}`,
      ),
      renterRepresentation: ["renter-1", "renter-2"],
    });
  });

  it("trims a submitted message before appending it to the selected side", async () => {
    const repository = {
      appendOpportunityMessage: vi.fn().mockResolvedValue(
        profileWithHistory([], ["Existing", "New message"]),
      ),
    };
    const service = new AgentOpportunityMessageHistoryService(
      repository as any,
    );

    const result = await service.record(
      "agent-1",
      "renter_representation",
      "  New message  ",
    );

    expect(repository.appendOpportunityMessage).toHaveBeenCalledWith(
      "agent-1",
      "renter_representation",
      "New message",
    );
    expect(result.renterRepresentation).toEqual(["Existing", "New message"]);
  });

  it("does not append an empty message", async () => {
    const repository = {
      findByUserId: vi.fn().mockResolvedValue(profileWithHistory()),
      appendOpportunityMessage: vi.fn(),
    };
    const service = new AgentOpportunityMessageHistoryService(
      repository as any,
    );

    await service.record("agent-1", "owner_representation", "   ");

    expect(repository.appendOpportunityMessage).not.toHaveBeenCalled();
  });
});

describe("AgentProfileRepository opportunity message updates", () => {
  it("uses an atomic push that retains only the newest ten messages", async () => {
    const repository = new AgentProfileRepository();
    const exec = vi.fn().mockResolvedValue(profileWithHistory());
    const findOneAndUpdate = vi.fn().mockReturnValue({ exec });
    (repository as any).model = { findOneAndUpdate };

    await repository.appendOpportunityMessage(
      "agent-1",
      "owner_representation",
      "Owner message",
    );

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { userId: "agent-1" },
      {
        $push: {
          "opportunityMessageHistory.ownerRepresentation": {
            $each: ["Owner message"],
            $slice: -10,
          },
        },
      },
      { new: true },
    );
  });
});
