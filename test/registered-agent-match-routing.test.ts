import { beforeEach, describe, expect, it, vi } from "vitest";

import { GrantAccessService } from "../src/modules/grant-access/grant-access.service";
import { PreMarketService } from "../src/modules/pre-market/pre-market.service";
import { emailService } from "../src/services/email.service";

vi.mock("../src/services/email.service", () => ({
  emailService: {
    sendRenterOpportunityFoundByRegisteredAgent: vi.fn().mockResolvedValue({ success: true }),
    sendRenterOpportunityFoundByOtherAgent: vi.fn().mockResolvedValue({ success: true }),
    sendMatchReferralAcknowledgmentToMatchingAgent: vi.fn().mockResolvedValue({ success: true }),
  },
}));

const agentId = "507f1f77bcf86cd799439101";
const otherAgentId = "507f1f77bcf86cd799439102";
const request = { _id: "507f1f77bcf86cd799439103", renterId: "renter-1", requestId: "R-123456", scope: "All Market", locations: [] };
const agent = { _id: agentId, fullName: "Casey Agent", email: "casey@example.invalid", phoneNumber: "555-0100" };
const otherAgent = { _id: otherAgentId, fullName: "Other Agent", email: "other@example.invalid" };

function fixture(populated = true) {
  const service = Object.create(PreMarketService.prototype) as any;
  Object.assign(service, {
    renterRepository: { findRenterWithReferrer: vi.fn().mockResolvedValue({
      userId: "renter-1", fullName: "Jamie Renter", email: "jamie@example.invalid", registrationType: "agent_referral",
      referredByAgentId: populated ? agent : agentId,
    }) },
    userRepository: { findById: vi.fn(async id => id === agentId ? agent : otherAgent) },
    agentRepository: { findByUserId: vi.fn().mockResolvedValue({ title: "Agent", brokerageName: "Example Brokerage" }) },
    createRenterNotification: vi.fn().mockResolvedValue(undefined),
    shouldDisplayMatchedScopeForRequest: vi.fn().mockResolvedValue(false),
  });
  return service;
}

beforeEach(() => vi.clearAllMocks());

describe("registered-agent match email routing", () => {
  it.each([true, false])("uses only the registered-agent route for All Market (populated referrer: %s)", async (populated) => {
    const service = fixture(populated);
    await service.notifyRenterAboutMatchedOpportunity(agentId, request, "grant-1", "Thursday tour", {
      matchSummary: { compatibilityMisses: ["Elevator"], preferenceMatches: ["Light"] },
      brokerFee: "One Month Rent",
    });
    expect(emailService.sendRenterOpportunityFoundByRegisteredAgent).toHaveBeenCalledOnce();
    expect(emailService.sendRenterOpportunityFoundByRegisteredAgent).toHaveBeenCalledWith(expect.objectContaining({
      requestScope: "All Market", to: "jamie@example.invalid", registeredAgentEmail: agent.email,
      opportunityDetails: "Thursday tour", matchSummary: { compatibilityMisses: ["Elevator"], preferenceMatches: ["Light"] },
    }));
    expect(emailService.sendRenterOpportunityFoundByOtherAgent).not.toHaveBeenCalled();
    expect(emailService.sendMatchReferralAcknowledgmentToMatchingAgent).not.toHaveBeenCalled();
  });

  it("preserves the distinct route for a different matching agent", async () => {
    const service = fixture();
    await service.notifyRenterAboutMatchedOpportunity(otherAgentId, request, "grant-1", "Thursday tour");
    expect(emailService.sendRenterOpportunityFoundByRegisteredAgent).not.toHaveBeenCalled();
    expect(emailService.sendRenterOpportunityFoundByOtherAgent).toHaveBeenCalledOnce();
    expect(emailService.sendMatchReferralAcknowledgmentToMatchingAgent).toHaveBeenCalledOnce();
  });

  it("does not send a second approval email for the registered agent's own All Market renter", async () => {
    const source = fixture();
    const service = Object.create(GrantAccessService.prototype) as any;
    const grant = { _id: "grant-1", agentId, preMarketRequestId: request._id, representation_type: "renter_representation", status: "pending", opportunityDetails: "Thursday tour" };
    Object.assign(service, {
      renterRepository: source.renterRepository, userRepository: source.userRepository, agentRepository: source.agentRepository,
      preMarketRepository: { findById: vi.fn().mockResolvedValue(request), addAgentToViewedBy: vi.fn(), setAllMarketRequestPrivateAfterMatch: vi.fn() },
      grantAccessRepository: { findById: vi.fn().mockResolvedValue(grant), updateById: vi.fn().mockResolvedValue(grant) },
      preMarketService: { isRegisteredAgentForRequest: vi.fn().mockResolvedValue(true) },
      notifier: { notifyAgentOfApproval: vi.fn() },
      notificationService: { notifyAgentAboutGrantAccessApproved: vi.fn() },
    });
    const pending: Array<Promise<void>> = [];
    const notify = service.notifyRenterOpportunityForFreeMatch.bind(service);
    service.notifyRenterOpportunityForFreeMatch = (...args: unknown[]) => {
      const result = notify(...args);
      pending.push(result);
      return result;
    };
    await service.adminDecideAccess("grant-1", { action: "free", isFree: true, adminId: "admin-1" });
    await Promise.all(pending);
    expect(service.notifier.notifyAgentOfApproval).not.toHaveBeenCalled();
    expect(emailService.sendRenterOpportunityFoundByRegisteredAgent).toHaveBeenCalledOnce();
    expect(emailService.sendRenterOpportunityFoundByRegisteredAgent).toHaveBeenCalledWith(expect.objectContaining({ requestScope: "All Market" }));
    expect(emailService.sendRenterOpportunityFoundByOtherAgent).not.toHaveBeenCalled();
    expect(emailService.sendMatchReferralAcknowledgmentToMatchingAgent).not.toHaveBeenCalled();
  });

  it("does not route an owner-representation grant through #6C", async () => {
    const service = Object.create(GrantAccessService.prototype) as any;
    await service.notifyRenterOpportunityForFreeMatch({ representation_type: "owner_representation" }, request);
    expect(emailService.sendRenterOpportunityFoundByRegisteredAgent).not.toHaveBeenCalled();
  });
});
