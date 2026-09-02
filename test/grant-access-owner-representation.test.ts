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
      updateById: async () => null,
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
      updateById: async () => null,
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

  it("returns 200-equivalent + re-fires admin notifications for a second opportunity message on a pending grant (does not create duplicate pending grant)", async () => {
    const agentId = "agent-pending-revisit";
    const preMarketRequestId = "507f1f77bcf86cd799439300";
    const request = {
      _id: preMarketRequestId,
      renterId: "renter-1",
      requestName: "R-PENDING-FOLLOWUP",
      visibility: "SHARED",
      shareConsent: true,
      status: "Available",
      isActive: true,
      scope: "All Market",
      registrationDisclosureConfirmations: [],
    };
    const existingGrantId = "507f1f77bcf86cd799439301";
    const existingGrant = {
      _id: existingGrantId,
      preMarketRequestId,
      agentId,
      status: "pending",
      representation_type: "renter_representation",
      opportunityDetails: "first message",
      opportunityDetailsHistory: [
        { message: "first message", sentAt: new Date(), isAdditionalOpportunity: false },
      ],
      createdAt: new Date(Date.now() - 60_000),
      updatedAt: new Date(Date.now() - 60_000),
    };

    const service = new GrantAccessService();
    const serviceAny = service as any;

    let createCalls = 0;
    let updateCalls = 0;
    const updatePayloads: Array<Record<string, unknown>> = [];
    const adminNotifications: Array<{ isAdditionalOpportunity?: boolean }> = [];
    const adminEmails: Array<{ isAdditionalOpportunity?: boolean }> = [];

    serviceAny.preMarketRepository = {
      findByIdWithActivationStatus: async () => request,
      setAllMarketRequestPrivateAfterMatch: async () => request,
    };
    serviceAny.grantAccessRepository = {
      findByAgentAndRequest: async () => existingGrant,
      create: async (payload: Record<string, unknown>) => {
        createCalls += 1;
        return { _id: "new-grant", ...payload };
      },
      updateById: async (
        _id: string,
        patch: Record<string, unknown>,
      ) => {
        updateCalls += 1;
        updatePayloads.push(patch);
        return { ...existingGrant, ...patch };
      },
    };
    serviceAny.userRepository = {
      findById: async () => ({
        fullName: "Test Agent",
        email: "test-agent@example.com",
      }),
    };
    serviceAny.agentRepository = {
      findByUserId: async () => ({
        brokerageName: "Test Brokerage",
        title: "Agent",
        licenseNumber: "LIC-123",
      }),
    };
    serviceAny.preMarketService = {};
    serviceAny.notifier = {
      notifyAdminOfGrantAccessRequest: async (
        _grant: unknown,
        opts?: { isAdditionalOpportunity?: boolean },
      ) => {
        adminEmails.push(opts ?? {});
        return { success: true };
      },
    };
    serviceAny.notificationService = {
      notifyAdminAboutGrantAccessRequest: async (
        data: { isAdditionalOpportunity?: boolean },
      ) => {
        adminNotifications.push({ isAdditionalOpportunity: data.isAdditionalOpportunity });
      },
    };
    serviceAny.paymentService = {};
    serviceAny.renterRepository = {};

    const result = await service.requestAccess(
      agentId,
      preMarketRequestId,
      "renter_representation",
      "I found another place for you.",
    );

    // No duplicate pending grant should be created
    expect(createCalls).toBe(0);
    // Update should have been called to refresh opportunityDetails + history
    expect(updateCalls).toBe(1);
    expect(updatePayloads[0]).toMatchObject({
      opportunityDetails: "I found another place for you.",
    });
    expect(
      (updatePayloads[0].opportunityDetailsHistory as Array<unknown>).length,
    ).toBe(2);

    // Returned grant should be the existing one, not a new one
    expect(result._id.toString()).toBe(existingGrantId);

    // Both admin notifications should fire with isAdditionalOpportunity=true
    expect(adminNotifications).toHaveLength(1);
    expect(adminNotifications[0].isAdditionalOpportunity).toBe(true);
    expect(adminEmails).toHaveLength(1);
    expect(adminEmails[0].isAdditionalOpportunity).toBe(true);
  });

  it("still throws ConflictException for additional opportunity on a free grant", async () => {
    const agentId = "agent-free-grant";
    const preMarketRequestId = "507f1f77bcf86cd799439302";
    const request = {
      _id: preMarketRequestId,
      renterId: "renter-1",
      requestName: "R-FREE-LOCK",
      visibility: "PRIVATE",
      shareConsent: true,
      status: "Available",
      isActive: true,
      scope: "All Market",
      registrationDisclosureConfirmations: [],
    };
    const existingGrant = {
      _id: "507f1f77bcf86cd799439303",
      preMarketRequestId,
      agentId,
      status: "free",
      opportunityDetails: "previously approved message",
      opportunityDetailsHistory: [],
      createdAt: new Date(Date.now() - 86_400_000),
    };

    const service = new GrantAccessService();
    const serviceAny = service as any;

    serviceAny.preMarketRepository = {
      findByIdWithActivationStatus: async () => request,
    };
    serviceAny.grantAccessRepository = {
      findByAgentAndRequest: async () => existingGrant,
      create: async () => existingGrant,
      updateById: async () => existingGrant,
    };

    await expect(
      service.requestAccess(
        agentId,
        preMarketRequestId,
        "renter_representation",
        "second message",
      ),
    ).rejects.toThrow(/already have access/i);
  });

  it("still throws ConflictException for additional opportunity on a paid grant", async () => {
    const agentId = "agent-paid-grant";
    const preMarketRequestId = "507f1f77bcf86cd799439304";
    const request = {
      _id: preMarketRequestId,
      renterId: "renter-1",
      requestName: "R-PAID-LOCK",
      visibility: "PRIVATE",
      shareConsent: true,
      status: "Available",
      isActive: true,
      scope: "All Market",
      registrationDisclosureConfirmations: [],
    };
    const existingGrant = {
      _id: "507f1f77bcf86cd799439305",
      preMarketRequestId,
      agentId,
      status: "paid",
      opportunityDetails: "previously paid message",
      opportunityDetailsHistory: [],
      createdAt: new Date(Date.now() - 86_400_000),
    };

    const service = new GrantAccessService();
    const serviceAny = service as any;

    serviceAny.preMarketRepository = {
      findByIdWithActivationStatus: async () => request,
    };
    serviceAny.grantAccessRepository = {
      findByAgentAndRequest: async () => existingGrant,
      create: async () => existingGrant,
      updateById: async () => existingGrant,
    };

    await expect(
      service.requestAccess(
        agentId,
        preMarketRequestId,
        "renter_representation",
        "second message",
      ),
    ).rejects.toThrow(/already have access/i);
  });
});
