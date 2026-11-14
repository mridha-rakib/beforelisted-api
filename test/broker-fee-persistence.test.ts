import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { GrantAccessService } from "../src/modules/grant-access/grant-access.service";
import { PreMarketRepository } from "../src/modules/pre-market/pre-market.repository";
import { PreMarketService } from "../src/modules/pre-market/pre-market.service";
import { BROKER_FEE_REQUIRED_MESSAGE } from "../src/utils/broker-fee.utils";

const fees = ["One Month Rent", "9% Annual Rent", "10% Annual Rent", "11% Annual Rent", "12% Annual Rent", "13% Annual Rent", "14% Annual Rent", "15% Annual Rent", "Talk to Renter First"] as const;
const agentId = "507f1f77bcf86cd799439101";
const requestId = "507f1f77bcf86cd799439103";
const noop = async () => undefined;

function accessFixture(existing: any = null) {
  let saved: any = existing;
  const owners: any[] = [];
  const notifications: any[] = [];
  let lookups = 0;
  const service: any = Object.create(GrantAccessService.prototype);
  Object.assign(service, {
    preMarketRepository: {
      findByIdWithActivationStatus: async () => { lookups++; return { _id: requestId, scope: "All Market", isActive: true }; },
      setAllMarketRequestPrivateAfterMatch: noop,
      addOwnerRepresentationMatch: async (...args: any[]) => { owners.push({ brokerFee: args[5] }); },
    },
    grantAccessRepository: {
      findByAgentAndRequest: async () => saved,
      create: async (payload: any) => { saved = { _id: "grant-1", ...payload }; return saved; },
      updateById: async (_id: string, update: any) => Object.assign(saved, update),
    },
    userRepository: { findById: async () => ({ fullName: "Agent", email: "agent@example.invalid" }) },
    agentRepository: { findByUserId: async () => ({ title: "Agent", brokerageName: "Brokerage" }) },
    preMarketService: { notifyRegisteredAgentAboutOwnerRepresentationMatch: noop },
    notifyAdminOfGrantRequest: async (grant: any) => { notifications.push({ ...grant }); },
  });
  return { service, saved: () => saved, owners, notifications, lookups: () => lookups };
}

function directFixture(existing: any = null) {
  const created: any[] = [];
  const owners: any[] = [];
  const request = { _id: requestId, scope: "Upcoming", isActive: true };
  const service: any = Object.create(PreMarketService.prototype);
  Object.assign(service, {
    normalizeOpportunityDetails: (value?: string) => value?.trim(),
    agentRepository: { findByUserId: async () => ({ hasGrantAccess: true }) },
    preMarketRepository: {
      findByIdWithActivationStatus: async () => request,
      setAllMarketRequestPrivateAfterMatch: noop,
      addOwnerRepresentationMatch: async (...args: any[]) => { owners.push({ brokerFee: args[5] }); },
    },
    grantAccessRepository: {
      findByAgentAndRequest: async () => existing,
      create: async (payload: any) => { const record = { _id: "grant-1", ...payload }; created.push(record); return record; },
      updateById: async (_id: string, update: any) => Object.assign(existing, update),
    },
    userRepository: { findById: async () => ({ fullName: "Agent", email: "agent@example.invalid" }) },
    buildMatchCompatibilitySummary: () => undefined,
    isRegisteredAgentForRequest: async () => false,
    ensureAgentCanViewRequest: () => undefined,
    ensureAgentCanViewRequestVisibility: noop,
    ensureRegisteredAgentCanMatchRequest: noop,
    markSearchMatchedActivity: noop,
    notifyRegisteredAgentAboutOwnerRepresentationMatch: noop,
    notifyRenterAboutMatchedOpportunity: noop,
  });
  return { service, created, owners };
}

describe("broker fee validation and persistence for every match", () => {
  for (const representation of ["owner_representation", "renter_representation"] as const) {
    it(`blocks ${representation} without a fee before access-request persistence`, async () => {
      const f = accessFixture();
      for (const fee of [undefined, "", " "]) {
        await assert.rejects(f.service.requestAccess(agentId, requestId, representation, undefined, fee), { message: BROKER_FEE_REQUIRED_MESSAGE });
      }
      assert.equal(f.lookups(), 0);
    });
    it(`blocks ${representation} without a fee before direct-match persistence`, async () => {
      const f = directFixture();
      await assert.rejects(f.service.matchRequestForAgent(agentId, requestId, representation), { message: BROKER_FEE_REQUIRED_MESSAGE });
      assert.equal(f.created.length, 0); assert.equal(f.owners.length, 0);
    });
    for (const fee of fees) {
      it(`saves ${fee} for a new ${representation} access request`, async () => {
        const f = accessFixture();
        const result = await f.service.requestAccess(agentId, requestId, representation, "Apartment opportunity", fee);
        assert.equal(result.brokerFee, fee);
        if (representation === "renter_representation") {
          assert.equal(f.saved().brokerFee, fee);
          assert.equal(f.saved().status, "pending");
          assert.equal(f.notifications[0].brokerFee, fee);
        }
        else assert.equal(f.owners[0].brokerFee, fee);
      });
      it(`saves ${fee} for a new direct ${representation} match`, async () => {
        const f = directFixture();
        await f.service.matchRequestForAgent(agentId, requestId, representation, "Apartment opportunity", false, undefined, fee);
        assert.equal(representation === "renter_representation" ? f.created[0].brokerFee : f.owners[0].brokerFee, fee);
      });
    }
    for (const additional of [true, false]) {
      it(`updates the selected fee for a repeat ${representation} match (additional: ${additional})`, async () => {
        const existing = { _id: "grant-1", status: "free", representation_type: representation, brokerFee: "One Month Rent" };
        const f = directFixture(existing);
        const result = await f.service.matchRequestForAgent(agentId, requestId, representation, "Another opportunity", additional, undefined, "15% Annual Rent");
        assert.equal(existing.brokerFee, "15% Annual Rent");
        assert.equal(result.brokerFee, "15% Annual Rent");
      });
    }
  }
  for (const message of [undefined, "A newer opportunity"]) {
    it(`saves a changed fee on a pending grant (${message ? "with" : "without"} a message)`, async () => {
      const f = accessFixture({ _id: "grant-1", status: "pending", brokerFee: "One Month Rent", opportunityDetailsHistory: [] });
      const result = await f.service.requestAccess(agentId, requestId, "renter_representation", message, "15% Annual Rent");
      assert.equal(result.brokerFee, "15% Annual Rent");
      assert.equal(f.saved().brokerFee, "15% Annual Rent");
      assert.equal(f.notifications[0].brokerFee, "15% Annual Rent");
    });
  }
});

describe("owner fee storage in the request repository", () => {
  for (const alreadyMatched of [false, true]) {
    it(`persists the selected owner fee (${alreadyMatched ? "existing" : "new"} owner match)`, async () => {
      const repository: any = Object.create(PreMarketRepository.prototype);
      const result = { _id: requestId };
      let writes = 0;
      repository.model = {
        findOneAndUpdate: (_filter: any, update: any) => ({ lean: () => ({ exec: async () => {
          if (update.$set) {
            assert.equal(update.$set["ownerRepresentationMatches.$.brokerFee"], "Talk to Renter First");
            if (!alreadyMatched) return null;
          }
          else assert.equal(update.$push.ownerRepresentationMatches.brokerFee, "Talk to Renter First");
          writes++; return result;
        } }) }),
      };
      assert.equal(await repository.addOwnerRepresentationMatch(requestId, agentId, {}, undefined, "All Market", "Talk to Renter First"), result);
      assert.equal(writes, 1);
    });
  }
});
