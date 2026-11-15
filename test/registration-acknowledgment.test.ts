import assert from "node:assert/strict";
import { Types } from "mongoose";
import { describe, it } from "vitest";

import { GrantAccessService } from "../src/modules/grant-access/grant-access.service";
import { PreMarketService } from "../src/modules/pre-market/pre-market.service";
import { REGISTRATION_ACKNOWLEDGMENT_REQUIRED_MESSAGE } from "../src/utils/registration-acknowledgment.utils";

const agentId = "507f1f77bcf86cd799439101";
const otherId = "507f1f77bcf86cd799439102";
const requestId = "507f1f77bcf86cd799439103";
const noop = async () => undefined;

function fixture(confirmedBy?: string, pending = false) {
  const request: any = {
    _id: requestId, renterId: "renter-1", scope: "All Market", isActive: true,
    registrationDisclosureConfirmations: confirmedBy ? [{ agentId: confirmedBy, confirmedAt: new Date() }] : [],
  };
  const grant: any = { _id: "grant-1", agentId, preMarketRequestId: requestId, status: "pending", opportunityDetailsHistory: [] };
  const writes: string[] = [];
  const notifications: string[] = [];
  const repository = {
    findByIdWithActivationStatus: async () => request,
    findById: async () => request,
    setAllMarketRequestPrivateAfterMatch: async () => { writes.push("visibility"); },
    addOwnerRepresentationMatch: async () => { writes.push("owner"); return request; },
    addAgentToViewedBy: async () => { writes.push("viewed"); },
  };
  const grants = {
    findByAgentAndRequest: async () => pending ? grant : null,
    findById: async () => grant,
    create: async (payload: any) => { writes.push("create"); return { _id: "grant-1", ...payload }; },
    updateById: async (_id: string, payload: any) => { writes.push("update"); return Object.assign(grant, payload); },
  };
  const market: any = Object.create(PreMarketService.prototype);
  Object.assign(market, {
    preMarketRepository: repository, grantAccessRepository: grants,
    renterRepository: { findRenterWithReferrer: async () => ({ referredByAgentId: { _id: agentId } }) },
    agentRepository: { findByUserId: async () => ({ hasGrantAccess: true }) },
    userRepository: { findById: async () => ({ _id: agentId, fullName: "Agent" }) },
    ensureAgentCanViewRequest: () => undefined,
    ensureAgentCanViewRequestVisibility: noop,
    buildMatchCompatibilitySummary: () => undefined,
    markSearchMatchedActivity: noop,
    notifyRenterAboutMatchedOpportunity: async () => { notifications.push("renter"); },
    notifyRegisteredAgentAboutOwnerRepresentationMatch: async () => { notifications.push("owner"); },
  });
  const access: any = Object.create(GrantAccessService.prototype);
  Object.assign(access, {
    preMarketRepository: repository, grantAccessRepository: grants, preMarketService: market,
    userRepository: market.userRepository, agentRepository: market.agentRepository,
    notifyAdminOfGrantRequest: async () => { notifications.push("admin"); },
    notifyRenterOpportunityForFreeMatch: async () => { notifications.push("renter"); },
    notificationService: { notifyAgentAboutGrantAccessApproved: noop },
    notifier: { notifyAgentOfApproval: noop },
  });
  return { market, access, writes, notifications, request, grant };
}

describe("registration acknowledgment before matching", () => {
  for (const representation of ["renter_representation", "owner_representation"] as const) {
    for (const route of ["direct", "access"] as const) {
      for (const confirmedBy of [undefined, otherId]) {
        it(`blocks ${route} ${representation} when acknowledgment is ${confirmedBy ? "another agent's" : "missing"}`, async () => {
          const f = fixture(confirmedBy);
          const match = route === "direct"
            ? f.market.matchRequestForAgent(agentId, requestId, representation, undefined, false, undefined, "One Month Rent")
            : f.access.requestAccess(agentId, requestId, representation, undefined, "One Month Rent");
          await assert.rejects(match, { message: REGISTRATION_ACKNOWLEDGMENT_REQUIRED_MESSAGE });
          assert.deepEqual(f.writes, []);
          assert.deepEqual(f.notifications, []);
        });
      }
      it(`allows ${route} ${representation} after the registered agent acknowledges`, async () => {
        const f = fixture(agentId);
        if (route === "direct") await f.market.matchRequestForAgent(agentId, requestId, representation, undefined, false, undefined, "One Month Rent");
        else await f.access.requestAccess(agentId, requestId, representation, undefined, "One Month Rent");
        assert.ok(f.writes.length > 0);
      });
    }
  }
  it("does not let pending follow-ups bypass acknowledgment", async () => {
    const f = fixture(undefined, true);
    await assert.rejects(f.access.requestAccess(agentId, requestId, "renter_representation", "Follow-up", "One Month Rent"), { message: REGISTRATION_ACKNOWLEDGMENT_REQUIRED_MESSAGE });
    assert.deepEqual(f.writes, []);
    assert.deepEqual(f.notifications, []);
  });
  it("blocks approval of an older unchecked pending match before changing status", async () => {
    const f = fixture(undefined, true);
    await assert.rejects(f.access.adminDecideAccess("grant-1", { action: "free", isFree: true, adminId: "admin-1" }), { message: REGISTRATION_ACKNOWLEDGMENT_REQUIRED_MESSAGE });
    assert.equal(f.grant.status, "pending");
    assert.deepEqual(f.writes, []);
    assert.deepEqual(f.notifications, []);
  });
  it("allows approval once acknowledgment has been saved", async () => {
    const f = fixture(agentId, true);
    await f.access.adminDecideAccess("grant-1", { action: "free", isFree: true, adminId: "admin-1" });
    assert.equal(f.grant.status, "free");
  });
  it("reports an unchecked request individually in bulk results", async () => {
    const f = fixture();
    const result = await f.market.matchRequestsForAgent(agentId, [requestId], "renter_representation", undefined, false, undefined, "One Month Rent");
    assert.equal(result.matched.length, 0);
    assert.equal(result.failed[0].message, REGISTRATION_ACKNOWLEDGMENT_REQUIRED_MESSAGE);
    assert.deepEqual(f.writes, []);
  });
  it("accepts the registered agent's stored ObjectId acknowledgment", async () => {
    const f = fixture();
    f.request.registrationDisclosureConfirmations = [{ agentId: new Types.ObjectId(agentId), confirmedAt: new Date() }];
    await f.market.ensureRegisteredAgentCanMatchRequest(agentId, f.request);
  });
  it("does not trust a client-style confirmed flag without a stored acknowledgment", async () => {
    const f = fixture();
    f.request.registrationDisclosureConfirmed = true;
    await assert.rejects(f.market.ensureRegisteredAgentCanMatchRequest(agentId, f.request), { message: REGISTRATION_ACKNOWLEDGMENT_REQUIRED_MESSAGE });
  });
  it("keeps other agents' existing matching rules unchanged", async () => {
    const f = fixture();
    await f.market.ensureRegisteredAgentCanMatchRequest(otherId, f.request);
  });
});
