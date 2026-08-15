import { describe, expect, it, vi } from "vitest";

import { GrantAccessService } from "../src/modules/grant-access/grant-access.service";

describe("GrantAccessService owner-representation requestAccess", () => {
  it("writes the match into ownerRepresentationMatches, does not call setAllMarketRequestPrivateAfterMatch, and triggers the registered-agent email #29", async () => {
    const agentId = "agent-without-grant-access";
    const preMarketRequestId = "507f1f77bcf86cd799439200";
    const request = {
      _id: preMarketRequestId,
      renterId: "renter-1",
      requestName: "R-OWNER-NO-GRANT",
      visibility: "SHARED",
      shareConsent: true,
      status: "Available",
      isActive: true,
      scope: "All Market",
      registrationDisclosureConfirmations: [],
    };

    const service = new GrantAccessService();
    const serviceAny = service as any;

    let grantAccessCreated = 0;
    let setAllMarketPrivateCalled = 0;
    const ownerRepresentationMatches: Array<Record<string, unknown>> = [];
    const ownerAcknowledgments: Array<Record<string, unknown>> = [];

    serviceAny.preMarketRepository = {
      findByIdWithActivationStatus: async () => request,
      setAllMarketRequestPrivateAfterMatch: async () => {
        setAllMarketPrivateCalled += 1;
        return request;
      },
      addOwnerRepresentationMatch: async (
        _id: string,
        agentIdArg: string,
        snapshot: Record<string, unknown>,
        details?: string,
      ) => {
        ownerRepresentationMatches.push({
          agentId: agentIdArg,
          snapshot,
          opportunityDetails: details,
        });
        return request;
      },
    };
    serviceAny.grantAccessRepository = {
      findByAgentAndRequest: async () => null,
      create: async (payload: Record<string, unknown>) => {
        grantAccessCreated += 1;
        return {
          _id: "grant-stub",
          ...payload,
        };
      },
    };
    serviceAny.userRepository = {
      findById: async () => ({
        fullName: "Owner Agent",
        email: "owner-agent@example.com",
        phoneNumber: "+1-555-1234",
      }),
    };
    serviceAny.agentRepository = {
      findByUserId: async () => ({
        brokerageName: "Some Brokerage",
        title: "Licensed Real Estate Salesperson",
      }),
    };
    serviceAny.preMarketService = {
      notifyRegisteredAgentAboutOwnerRepresentationMatch: async (
        matchedAgentId: string,
        matchedRequest: unknown,
        details: string | undefined,
      ) => {
        ownerAcknowledgments.push({
          matchedAgentId,
          matchedRequest,
          details,
        });
      },
    };
    serviceAny.notifier = {
      notifyAdminOfGrantAccessRequest: async () => undefined,
    };
    serviceAny.notificationService = {
      notifyAdminAboutGrantAccessRequest: async () => undefined,
    };
    serviceAny.paymentService = {};
    serviceAny.renterRepository = {};

    const result = await service.requestAccess(
      agentId,
      preMarketRequestId,
      "owner_representation",
      "owner-side opportunity details.",
    );

    expect(grantAccessCreated).toBe(0);
    expect(setAllMarketPrivateCalled).toBe(0);
    expect(ownerRepresentationMatches).toHaveLength(1);
    expect(ownerRepresentationMatches[0]).toMatchObject({
      agentId,
      opportunityDetails: "owner-side opportunity details.",
    });
    expect(ownerAcknowledgments).toEqual([
      expect.objectContaining({
        matchedAgentId: agentId,
        details: "owner-side opportunity details.",
      }),
    ]);
    expect(result).toMatchObject({
      agentId,
      preMarketRequestId,
      representation_type: "owner_representation",
      status: "approved",
    });
  });

  it("still creates a pending grant-access record and flips All Market to private for a renter-representation match", async () => {
    const agentId = "agent-without-grant-access";
    const preMarketRequestId = "507f1f77bcf86cd799439201";
    const request = {
      _id: preMarketRequestId,
      renterId: "renter-1",
      requestName: "R-RENTER-NO-GRANT",
      visibility: "SHARED",
      shareConsent: true,
      status: "Available",
      isActive: true,
      scope: "All Market",
      registrationDisclosureConfirmations: [],
    };

    const service = new GrantAccessService();
    const serviceAny = service as any;

    let grantAccessCreated = 0;
    let setAllMarketPrivateCalled = 0;
    const createdPayloads: Array<Record<string, unknown>> = [];
    const ownerRepresentationMatches: Array<Record<string, unknown>> = [];

    serviceAny.preMarketRepository = {
      findByIdWithActivationStatus: async () => request,
      setAllMarketRequestPrivateAfterMatch: async () => {
        setAllMarketPrivateCalled += 1;
        return request;
      },
      addOwnerRepresentationMatch: async () => {
        ownerRepresentationMatches.push({});
        return request;
      },
    };
    serviceAny.grantAccessRepository = {
      findByAgentAndRequest: async () => null,
      create: async (payload: Record<string, unknown>) => {
        grantAccessCreated += 1;
        createdPayloads.push(payload);
        return {
          _id: "grant-pending",
          ...payload,
        };
      },
    };
    serviceAny.userRepository = { findById: async () => null };
    serviceAny.agentRepository = { findByUserId: async () => null };
    serviceAny.preMarketService = {};
    serviceAny.notifier = {
      notifyAdminOfGrantAccessRequest: async () => undefined,
    };
    serviceAny.notificationService = {
      notifyAdminAboutGrantAccessRequest: async () => undefined,
    };
    serviceAny.paymentService = {};
    serviceAny.renterRepository = {};

    await service.requestAccess(
      agentId,
      preMarketRequestId,
      "renter_representation",
      "renter-side opportunity details.",
    );

    expect(grantAccessCreated).toBe(1);
    expect(setAllMarketPrivateCalled).toBe(1);
    expect(ownerRepresentationMatches).toHaveLength(0);
    expect(createdPayloads[0]).toMatchObject({
      preMarketRequestId,
      agentId,
      status: "pending",
      representation_type: "renter_representation",
    });
  });
});
