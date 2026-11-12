import assert from "node:assert/strict";
import { afterEach, describe, it, vi } from "vitest";

import { PreMarketService } from "../src/modules/pre-market/pre-market.service";
import { TransactionHelper } from "../src/utils/transaction.utils";

const clone = <T>(value: T): T => structuredClone(value);

function fixture(kind: "renter" | "owner" | "mixed" = "renter") {
  let request: any = {
    _id: "request-1", renterId: "renter-1", scope: "All Market", visibility: "PRIVATE",
    shareConsent: true, isActive: true, isDeleted: false,
    buyerInterest: { buyerSpecialistNeeded: true, purchaseTimeline: "12+ months" },
    ownerRepresentationMatches: kind !== "renter" ? [{ agentId: "owner-agent", scopeAtMatch: "All Market", opportunityDetails: "Owner opportunity" }] : [],
    viewedBy: { grantAccessAgents: ["matched-agent", "owner-agent", "other-viewer"], normalAgents: [] },
  };
  let records: any[] = kind === "owner" ? [] : [
    { _id: "grant-1", agentId: "matched-agent", preMarketRequestId: "request-1", status: "free", representation_type: "renter_representation" },
  ];
  if (kind === "mixed") {
    records.push({ _id: "grant-2", agentId: "second-agent", preMarketRequestId: "request-1", status: "pending", representation_type: "renter_representation" });
  }
  let audits: any[] = [];
  let failSave = false;
  let confirmed = true;
  let registeredAgentId = "registered-agent";
  const session = {} as any;
  const service: any = Object.create(PreMarketService.prototype);
  vi.spyOn(TransactionHelper, "withTransaction").mockImplementation(async (run) => {
    const before = clone({ request, records, audits });
    try { return await run(session); }
    catch (error) { ({ request, records, audits } = before); throw error; }
  });
  Object.assign(service, {
    getRequestById: async () => clone(request),
    getRegistrationDisclosureStatus: () => ({ registrationDisclosureConfirmed: confirmed }),
    getAgentArchiveStatus: () => ({ isArchivedForAgent: false }),
    resolveRegisteredAgentIdForRequest: async () => registeredAgentId,
    resolveMatchedAgentForView: async () => null,
    resolveRegisteredAgentForView: async () => null,
    userRepository: { findById: async (id: string) => ({ _id: id, email: `${id}@example.invalid` }) },
    grantAccessRepository: {
      findByPreMarketRequestId: async () => records,
      findByAgentIdAndStatuses: async () => records.filter(record => record.status === "rejected"),
      updateById: async (id: string, update: any, received: unknown) => {
        assert.equal(received, session);
        assert.ok(audits.some(audit => audit.grantId === id));
        return Object.assign(records.find(record => record._id === id), update);
      },
    },
    grantAccessAuditRepository: { create: async (audit: any, received: unknown) => {
      assert.equal(received, session);
      audits.push(clone(audit));
    } },
    preMarketRepository: {
      findById: async () => clone(request),
      updateById: async (_id: string, update: any, received: unknown) => {
        assert.equal(received, session);
        if (failSave) throw new Error("save failed");
        return Object.assign(request, update);
      },
    },
  });
  return {
    service, request: () => request, records: () => records, audits: () => audits,
    unmatch: () => service.unmatchRequestForRegisteredAgent("registered-agent", "request-1", { sendEmailNotice: false }),
    fail: () => { failSave = true; }, unconfirm: () => { confirmed = false; },
    setRegisteredAgent: (id: string) => { registeredAgentId = id; },
  };
}

afterEach(() => vi.restoreAllMocks());

describe("unmatch returns the request to All Market", () => {
  for (const kind of ["renter", "owner", "mixed"] as const) {
    it(`clears ${kind} matches and restores the All Market scope and visibility`, async () => {
      const f = fixture(kind);
      const result = await f.unmatch();
      assert.equal(result.scope, "All Market");
      assert.equal(f.request().visibility, "SHARED");
      assert.equal(f.request().scope, "All Market");
      assert.deepEqual(f.request().ownerRepresentationMatches, []);
      assert.ok(f.records().every(record => record.status === "rejected"));
      assert.deepEqual(f.request().buyerInterest, { buyerSpecialistNeeded: true, purchaseTimeline: "12+ months" });
      assert.ok(!f.request().viewedBy.grantAccessAgents.includes("matched-agent") || kind === "owner");
      assert.equal(f.audits().length, kind === "mixed" ? 3 : 1);
      const presentation = await f.service.getScopePresentationForAgent("registered-agent", f.request());
      assert.equal(presentation.scope, "All Market");
    });
  }

  it("preserves the renter's refusal to share", async () => {
    const f = fixture(); f.request().shareConsent = false;
    await f.unmatch(); assert.equal(f.request().visibility, "PRIVATE");
  });
  it("does not bypass the registration acknowledgment", async () => {
    const f = fixture(); f.unconfirm();
    await f.unmatch(); assert.equal(f.request().visibility, "PRIVATE");
  });
  it("rolls back all match changes and audits when saving the request fails", async () => {
    const f = fixture("mixed"); f.fail();
    await assert.rejects(f.unmatch(), /save failed/);
    assert.equal(f.records()[0].status, "free");
    assert.equal(f.request().ownerRepresentationMatches.length, 1);
    assert.deepEqual(f.audits(), []);
  });
  it("blocks another agent before writing any match changes", async () => {
    const f = fixture(); f.setRegisteredAgent("someone-else");
    await assert.rejects(f.unmatch(), /Only the registered agent/);
    assert.equal(f.records()[0].status, "free"); assert.deepEqual(f.audits(), []);
  });
  it("keeps the registered agent's own request visible after a self-unmatch", async () => {
    const f = fixture(); f.setRegisteredAgent("matched-agent");
    await f.service.unmatchRequestForRegisteredAgent("matched-agent", "request-1", { sendEmailNotice: false });
    assert.deepEqual(await f.service.getUnmatchedRequestIdsForAgent("matched-agent"), []);
    assert.deepEqual(await f.service.getUnmatchedRequestIdsForAgent("other-agent"), ["request-1"]);
  });
});
