import { describe, expect, it } from "vitest";

import { PreMarketService } from "../src/modules/pre-market/pre-market.service";

describe("matched All Market scope", () => {
  const cases = [
    { name: "unmatched", scope: "All Market", records: [], owners: [], expected: "All Market" },
    { name: "renter match", scope: "All Market", records: [{ status: "free", representation_type: "renter_representation" }], owners: [], expected: "Upcoming (M)" },
    { name: "owner match on request", scope: "All Market", records: [], owners: [{ agentId: "owner-agent" }], expected: "Upcoming (M)" },
    { name: "legacy owner grant", scope: "All Market", records: [{ status: "approved", representation_type: "owner_representation" }], owners: [], expected: "Upcoming (M)" },
    { name: "earlier Upcoming match", scope: "All Market", records: [{ status: "paid", scopeAtMatch: "Upcoming" }], owners: [], expected: "Upcoming (M)" },
    { name: "rejected grant", scope: "All Market", records: [{ status: "rejected" }], owners: [], expected: "All Market" },
    { name: "Upcoming with owner match", scope: "Upcoming", records: [], owners: [{ agentId: "owner-agent" }], expected: "Upcoming" },
  ];

  it.each(cases)("shows $expected for $name for every viewer", async ({ scope, records, owners, expected }) => {
    // Exercise the presentation used by list/detail endpoints without database access.
    const service = Object.create(PreMarketService.prototype) as PreMarketService;
    Object.assign(service, {
      grantAccessRepository: { findByPreMarketRequestId: async () => records },
      getAgentArchiveStatus: () => ({ isArchivedForAgent: false }),
      resolveRegisteredAgentIdForRequest: async () => "registered-agent",
      resolveMatchedAgentForView: async () => null,
      resolveRegisteredAgentForView: async () => null,
    });
    for (const viewer of ["registered-agent", "owner-agent", "other-agent"]) {
      const result = await service.getScopePresentationForAgent(viewer, {
        _id: "request-1", scope, ownerRepresentationMatches: owners,
      } as any, { scopeAtMatch: "Upcoming" } as any);
      expect(result.scope).toBe(expected);
    }
  });
});
