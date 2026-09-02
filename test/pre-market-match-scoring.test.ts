import { describe, expect, it, vi } from "vitest";

import {
  type MatchApartmentInput,
  scorePreMarketRequest,
} from "../src/modules/pre-market/pre-market-match-scoring";
import { PreMarketService } from "../src/modules/pre-market/pre-market.service";

const baseApartment: MatchApartmentInput = {
  borough: "Manhattan",
  neighborhood: "Upper West Side (Central)",
  bedrooms: "2BR",
  bathrooms: "2",
  rent: 5000,
  movingDateRange: {
    earliest: new Date("2026-05-15T00:00:00Z"),
    latest: new Date("2026-06-15T00:00:00Z"),
  },
  unitFeatures: {
    laundryInUnit: true,
    privateOutdoorSpace: true,
    dishwasher: true,
  },
  buildingFeatures: {
    doorman: true,
    elevator: true,
    laundryInBuilding: true,
  },
  petPolicy: {
    catsAllowed: true,
    dogsAllowed: true,
  },
  guarantorPolicy: {
    personalGuarantor: true,
    thirdPartyGuarantor: true,
  },
  availableFeatures: {
    largeApartment: true,
    lotsOfLight: true,
    newRenovation: true,
    highCeilings: true,
  },
  toggles: {
    unitFeatures: true,
    buildingFeatures: true,
    petPolicy: true,
    guarantorsPolicy: true,
    priorityBonuses: true,
  },
};

const baseRequest = {
  movingDateRange: {
    earliest: new Date("2026-05-20T00:00:00Z"),
    latest: new Date("2026-06-10T00:00:00Z"),
  },
  priceRange: {
    min: 3000,
    max: 5000,
  },
  locations: [
    {
      borough: "Manhattan",
      neighborhoods: ["Upper West Side (Central)"],
    },
  ],
  bedrooms: ["2BR"],
  bathrooms: ["2"],
  unitFeatures: {
    laundryInUnit: false,
    privateOutdoorSpace: false,
    dishwasher: false,
  },
  buildingFeatures: {
    doorman: false,
    elevator: false,
    laundryInBuilding: false,
  },
  petPolicy: {
    catsAllowed: false,
    dogsAllowed: false,
  },
  guarantorRequired: {
    personalGuarantor: false,
    thirdPartyGuarantor: false,
  },
  preferences: ["Large Apartment", "Lots of Light", "New Renovation", "High Ceilings"],
};

describe("scorePreMarketRequest", () => {
  it("caps perfect matches with priority bonuses at 100", () => {
    const result = scorePreMarketRequest(baseApartment, baseRequest);

    expect(result.disqualified).toBe(false);
    if (!result.disqualified) {
      expect(result.score).toBe(100);
      expect(result.priorityBonus).toBe(20);
      expect(result.starRating).toBe(5);
      expect(result.preferenceMatches).toEqual([true, true, true, true]);
    }
  });

  it("applies only the largest deduction fully and caps secondary misses at -10", () => {
    const apartment: MatchApartmentInput = {
      ...baseApartment,
      bedrooms: "1BR",
      rent: 5400,
      unitFeatures: {
        ...baseApartment.unitFeatures,
        laundryInUnit: false,
      },
      availableFeatures: {},
    };
    const request = {
      ...baseRequest,
      unitFeatures: {
        ...baseRequest.unitFeatures,
        laundryInUnit: true,
      },
      preferences: [],
    };

    const result = scorePreMarketRequest(apartment, request);

    expect(result.disqualified).toBe(false);
    if (!result.disqualified) {
      expect(result.missingFeatures.map(feature => feature.code)).toEqual([
        "bedrooms",
        "rent",
        "laundryInUnit",
      ]);
      expect(result.score).toBe(30);
      expect(result.primaryDeduction).toBe(-50);
      expect(result.secondaryDeduction).toBe(-20);
    }
  });

  it("deducts 30 points when apartment rent is below the request minimum", () => {
    const request = {
      ...baseRequest,
      priceRange: {
        min: 5500,
        max: 6000,
      },
      preferences: [],
    };

    const result = scorePreMarketRequest(baseApartment, request);

    expect(result.disqualified).toBe(false);
    if (!result.disqualified) {
      expect(result.score).toBe(70);
      expect(result.primaryDeduction).toBe(-30);
      expect(result.missingFeatures).toEqual([
        expect.objectContaining({
          code: "rentBelowMin",
          label: "Rent below min price range",
          deduction: -30,
        }),
      ]);
    }
  });

  it("ignores unit feature misses when the unit feature toggle is off", () => {
    const apartment: MatchApartmentInput = {
      ...baseApartment,
      unitFeatures: {
        ...baseApartment.unitFeatures,
        laundryInUnit: false,
      },
      toggles: {
        ...baseApartment.toggles,
        unitFeatures: false,
      },
    };
    const request = {
      ...baseRequest,
      unitFeatures: {
        ...baseRequest.unitFeatures,
        laundryInUnit: true,
      },
    };

    const result = scorePreMarketRequest(apartment, request);

    expect(result.disqualified).toBe(false);
    if (!result.disqualified) {
      expect(result.missingFeatures).toHaveLength(0);
    }
  });

  it("allows a cat request when the apartment accepts dogs per the reference scoring engine", () => {
    const apartment: MatchApartmentInput = {
      ...baseApartment,
      petPolicy: {
        catsAllowed: false,
        dogsAllowed: true,
      },
    };
    const request = {
      ...baseRequest,
      petPolicy: {
        catsAllowed: true,
        dogsAllowed: false,
      },
    };

    const result = scorePreMarketRequest(apartment, request);

    expect(result.disqualified).toBe(false);
  });

  it("allows a request that accepts either guarantor type when the apartment accepts personal guarantors", () => {
    const apartment: MatchApartmentInput = {
      ...baseApartment,
      guarantorPolicy: {
        personalGuarantor: true,
        thirdPartyGuarantor: false,
      },
    };
    const request = {
      ...baseRequest,
      guarantorRequired: {
        personalGuarantor: true,
        thirdPartyGuarantor: true,
      },
    };

    const result = scorePreMarketRequest(apartment, request);

    expect(result.disqualified).toBe(false);
  });

  it("allows a request that accepts either guarantor type when the apartment accepts third-party guarantors", () => {
    const apartment: MatchApartmentInput = {
      ...baseApartment,
      guarantorPolicy: {
        personalGuarantor: false,
        thirdPartyGuarantor: true,
      },
    };
    const request = {
      ...baseRequest,
      guarantorRequired: {
        personalGuarantor: true,
        thirdPartyGuarantor: true,
      },
    };

    const result = scorePreMarketRequest(apartment, request);

    expect(result.disqualified).toBe(false);
  });

  it("still disqualifies a single-method guarantor request when that method is unavailable", () => {
    const apartment: MatchApartmentInput = {
      ...baseApartment,
      guarantorPolicy: {
        personalGuarantor: true,
        thirdPartyGuarantor: false,
      },
    };
    const request = {
      ...baseRequest,
      guarantorRequired: {
        personalGuarantor: false,
        thirdPartyGuarantor: true,
      },
    };

    const result = scorePreMarketRequest(apartment, request);

    expect(result.disqualified).toBe(true);
    if (result.disqualified) {
      expect(result.reason).toBe("guarantorPolicy");
    }
  });

  it("uses the first duplicate neighborhood lookup entry to mirror Excel VLOOKUP", () => {
    const apartment: MatchApartmentInput = {
      ...baseApartment,
      borough: "Brooklyn",
      neighborhood: "Brooklyn Navy Yard",
      bedrooms: "1BR",
      bathrooms: "1",
      rent: 3000,
      movingDateRange: {
        earliest: new Date("2026-05-15T00:00:00Z"),
        latest: new Date("2026-06-15T00:00:00Z"),
      },
      unitFeatures: {
        laundryInUnit: false,
        privateOutdoorSpace: false,
        dishwasher: false,
      },
      buildingFeatures: {
        doorman: false,
        elevator: false,
        laundryInBuilding: false,
      },
      availableFeatures: {},
    };
    const request = {
      ...baseRequest,
      locations: [
        {
          borough: "Brooklyn",
          neighborhoods: ["Fort Greene"],
        },
      ],
      bedrooms: ["1BR"],
      bathrooms: ["1"],
      priceRange: {
        min: 2500,
        max: 3500,
      },
      preferences: [],
    };

    const result = scorePreMarketRequest(apartment, request);

    expect(result.disqualified).toBe(false);
    if (!result.disqualified) {
      expect(result.regionLocationMatch).toBe(true);
      expect(result.missingFeatures.map(feature => feature.code)).toContain(
        "location",
      );
    }
  });

  it("disqualifies requests with more than three soft misses", () => {
    const apartment: MatchApartmentInput = {
      ...baseApartment,
      bedrooms: "1BR",
      rent: 5400,
      unitFeatures: {
        laundryInUnit: false,
        privateOutdoorSpace: false,
        dishwasher: false,
      },
      availableFeatures: {},
    };
    const request = {
      ...baseRequest,
      unitFeatures: {
        laundryInUnit: true,
        privateOutdoorSpace: true,
        dishwasher: true,
      },
      preferences: [],
    };

    const result = scorePreMarketRequest(apartment, request);

    expect(result.disqualified).toBe(true);
    if (result.disqualified) {
      expect(result.reason).toBe("tooManySoftMisses");
      expect(result.missingFeatures).toHaveLength(4);
    }
  });
});

describe("PreMarketService match search disclosure behavior", () => {
  it("excludes private registered requests without disclosure, includes shared requests, and marks already matched requests", async () => {
    const agentId = "local-agent-1";
    const service = new PreMarketService();
    const requestBase = {
      movingDateRange: {
        earliest: new Date("2026-05-20T00:00:00Z"),
        latest: new Date("2026-06-10T00:00:00Z"),
      },
      priceRange: {
        min: 3000,
        max: 5000,
      },
      locations: [
        {
          borough: "Manhattan",
          neighborhoods: ["Upper West Side (Central)"],
        },
      ],
      bedrooms: ["2BR"],
      bathrooms: ["2"],
      unitFeatures: {
        laundryInUnit: true,
        privateOutdoorSpace: true,
        dishwasher: true,
      },
      buildingFeatures: {
        doorman: true,
        elevator: true,
        laundryInBuilding: true,
      },
      petPolicy: {
        catsAllowed: true,
        dogsAllowed: true,
      },
      guarantorRequired: {
        personalGuarantor: true,
        thirdPartyGuarantor: true,
      },
      preferences: ["Large Apartment", "Lots of Light"],
      scope: "Upcoming",
      status: "available",
      createdAt: new Date("2026-05-01T00:00:00Z"),
    };
    const requests = [
      {
        ...requestBase,
        _id: "private-no-disclosure",
        renterId: "renter-private",
        visibility: "private",
        referralAgentId: agentId,
        registrationDisclosureConfirmations: [],
      },
      {
        ...requestBase,
        _id: "shared-visible",
        renterId: "renter-shared",
        visibility: "shared",
        referralAgentId: "other-agent",
      },
      {
        ...requestBase,
        _id: "shared-matched",
        renterId: "renter-matched",
        visibility: "shared",
        referralAgentId: "other-agent",
      },
    ];

    const serviceAny = service as any;
    serviceAny.agentRepository = {
      findByUserId: async () => ({
        _id: "agent-profile-1",
        userId: agentId,
        hasGrantAccess: true,
      }),
    };
    serviceAny.preMarketRepository = {
      findAllForMatchSearch: async () => requests,
    };
    serviceAny.grantAccessRepository = {
      findByAgentIdAndRequestIds: async () => [
        {
          _id: "grant-1",
          preMarketRequestId: "shared-matched",
          status: "free",
          representation_type: "renter_representation",
        },
      ],
    };
    serviceAny.buildRequestVisibilityFilterForAgent = async () => ({});
    serviceAny.buildAgentVisibilityFilter = () => ({});
    serviceAny.buildAgentArchiveExclusionFilter = () => ({});
    serviceAny.mergeFilters = () => ({});
    serviceAny.getGlobalMatchedScopeRequestIdSet = async () => new Set<string>();
    serviceAny.resolveRegisteredAgentIdForRequest = async (request: any) =>
      request.referralAgentId ?? null;
    serviceAny.getReferralInfoForRenter = async (renterId: string) => ({
      renterName: renterId,
    });
    serviceAny.getOwnerRepresentationStatus = () => ({
      ownerRepresentationMatchCount: 0,
      hasOwnerRepresentationMatches: false,
      hasNewOwnerRepresentationMatches: false,
    });
    serviceAny.stripOwnerRepresentationMatchesForNonRegisteredAgent = (
      request: any,
    ) => request;
    serviceAny.hasOwnerRepresentationMatchForAgent = () => false;

    const result = await service.searchApartmentMatchesForAgent(
      agentId,
      baseApartment,
      { page: 1, limit: 10 },
    );
    const byId = new Map(result.data.map((item) => [item._id, item]));

    expect(byId.has("private-no-disclosure")).toBe(false);
    expect(byId.has("shared-visible")).toBe(true);
    expect(byId.get("shared-visible")?.alreadyMatchedByAgent).toBe(false);
    expect(byId.has("shared-matched")).toBe(true);
    expect(byId.get("shared-matched")?.alreadyMatchedByAgent).toBe(true);
    expect(byId.get("shared-matched")?.listingStatus).toBe("matched");
  });
});

describe("PreMarketService.getAllRequestsForAgent (Matches page)", () => {
  it("surfaces requests the agent has just clicked 'Match Request' on (pending grants)", async () => {
    const agentId = "agent-1";
    const requestId = "507f1f77bcf86cd799439011";

    const service = new PreMarketService() as any;
    service.agentRepository = {
      findByUserId: vi.fn().mockResolvedValue({
        userId: agentId,
        hasGrantAccess: false,
      }),
    };
    service.shouldFilterAllMarketReferrals = () => false;
    service.buildAgentRequestFilter = () => ({});
    service.buildAgentArchiveExclusionFilter = () => ({});
    service.mergeFilters = (filters: any[]) =>
      filters.reduce((acc: any, f: any) => ({ ...acc, ...f }), {});

    // Capture the statuses passed to the gateway grant query so we can
    // assert that "pending" is included alongside the approved/free/paid
    // set.
    let capturedStatuses: string[] | null = null;
    service.grantAccessRepository = {
      findByAgentIdAndStatuses: vi.fn().mockImplementation(
        (_id: string, statuses: string[]) => {
          capturedStatuses = statuses;
          return [
            {
              _id: "grant-1",
              preMarketRequestId: requestId,
              status: "pending",
              representation_type: "renter_representation",
              updatedAt: new Date("2026-08-01T00:00:00.000Z"),
              createdAt: new Date("2026-08-01T00:00:00.000Z"),
            },
          ];
        },
      ),
    };

    const matchedRequest = {
      _id: requestId,
      scope: "Upcoming",
      status: "Available",
      isActive: true,
      isDeleted: false,
      referralAgentId: agentId,
      renterId: "renter-1",
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
    };
    service.preMarketRepository = {
      findAllForMatchSearch: vi.fn().mockResolvedValue([matchedRequest]),
      addAgentToViewedBy: vi.fn().mockResolvedValue(undefined),
    };
    service.getGlobalMatchedScopeRequestIdSet = vi
      .fn()
      .mockResolvedValue(new Set<string>());
    service.resolveRegisteredAgentIdForRequest = vi
      .fn()
      .mockResolvedValue(agentId);
    service.resolveMatchedAgentForView = vi.fn().mockResolvedValue(null);
    service.resolveRegisteredAgentForView = vi.fn().mockResolvedValue(null);
    service.getRenterInfoForRequest = vi.fn().mockResolvedValue(null);
    service.getAgentArchiveStatus = () => ({ isArchivedForAgent: false });
    service.getRegistrationDisclosureStatus = () => ({});
    service.stripOwnerRepresentationMatchesForNonRegisteredAgent = (
      request: any,
    ) => request;
    service.buildAgentAccessSummary = (access: any) => ({
      grantAccessStatus: "requested",
      accessType: "none",
      canRequestAccess: false,
      canSeeRenterInfo: false,
      grantAccessId: access?._id,
      representation_type: access?.representation_type,
      representationSelectedAt: null,
      payment: null,
      showPayment: false,
      chargeAmount: null,
    });

    const result = await service.getAllRequestsForAgent(agentId, {
      page: 1,
      limit: 10,
    });

    // The gateway query must include pending so the row isn't silently
    // dropped from the Matches page.
    expect(capturedStatuses).toEqual([
      "pending",
      "approved",
      "free",
      "paid",
    ]);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]._id.toString()).toBe(requestId);
    expect(result.data[0].alreadyMatchedByAgent).toBe(true);
    expect(result.data[0].status).toBe("Matched");
    expect(result.pagination.totalItems).toBe(1);
  });

  it("still excludes owner_representation grants", async () => {
    const agentId = "agent-1";

    const service = new PreMarketService() as any;
    service.agentRepository = {
      findByUserId: vi.fn().mockResolvedValue({
        userId: agentId,
        hasGrantAccess: false,
      }),
    };
    service.shouldFilterAllMarketReferrals = () => false;
    service.buildAgentRequestFilter = () => ({});
    service.buildAgentArchiveExclusionFilter = () => ({});
    service.grantAccessRepository = {
      findByAgentIdAndStatuses: vi.fn().mockResolvedValue([
        {
          _id: "grant-1",
          preMarketRequestId: "r1",
          status: "approved",
          representation_type: "owner_representation",
        },
      ]),
    };
    service.preMarketRepository = {
      findAllForMatchSearch: vi.fn(),
      addAgentToViewedBy: vi.fn(),
    };

    const result = await service.getAllRequestsForAgent(agentId, {
      page: 1,
      limit: 10,
    });

    expect(result.data).toHaveLength(0);
    expect(result.pagination.totalItems).toBe(0);
    expect(
      service.preMarketRepository.findAllForMatchSearch,
    ).not.toHaveBeenCalled();
  });
});

describe("PreMarketService registered-agent matching", () => {
  const buildService = (registeredAgentId: string | null) => {
    const agentId = "agent-own-renter";
    const requestId = "507f1f77bcf86cd799439011";
    const request = {
      _id: requestId,
      renterId: "renter-1",
      requestName: "R-107748",
      shareConsent: false,
      visibility: "PRIVATE",
      status: "Available",
      isActive: true,
      registrationDisclosureConfirmations: [
        { agentId, confirmedAt: new Date("2026-06-12T00:00:00Z") },
      ],
    };
    const service = new PreMarketService();
    const serviceAny = service as any;
    let createdGrantAccess: Record<string, unknown> | null = null;

    serviceAny.agentRepository = {
      findByUserId: async () => ({
        _id: "agent-profile-1",
        userId: agentId,
        hasGrantAccess: false,
      }),
    };
    serviceAny.preMarketRepository = {
      findByIdWithActivationStatus: async () => request,
      updateById: async () => request,
      setAllMarketRequestPrivateAfterMatch: async () => undefined,
    };
    serviceAny.grantAccessRepository = {
      findByAgentAndRequest: async () => null,
      create: async (payload: Record<string, unknown>) => {
        createdGrantAccess = { _id: "grant-1", ...payload };
        return createdGrantAccess;
      },
    };
    serviceAny.resolveRegisteredAgentIdForRequest = async () =>
      registeredAgentId;
    serviceAny.ensureAgentCanViewRequest = () => undefined;
    serviceAny.notifyRenterAboutMatchedOpportunity = async () => undefined;

    return {
      agentId,
      createdGrantAccess: () => createdGrantAccess,
      requestId,
      service,
    };
  };

  it("allows the registered agent to match their own confirmed private renter without global grant access", async () => {
    const { agentId, createdGrantAccess, requestId, service } =
      buildService("agent-own-renter");

    const result = await service.matchRequestForAgent(
      agentId,
      requestId,
      "renter_representation",
    );

    expect(result).toMatchObject({
      _id: "grant-1",
      agentId,
      preMarketRequestId: requestId,
      representation_type: "renter_representation",
      status: "free",
    });
    expect(createdGrantAccess()).toMatchObject({ status: "free" });
  });

  it("still blocks non-registered agents without global grant access from direct matching", async () => {
    const { agentId, requestId, service } = buildService("other-agent");

    await expect(
      service.matchRequestForAgent(
        agentId,
        requestId,
        "renter_representation",
      ),
    ).rejects.toThrow("You do not have permission to match requests");
  });
});

describe("PreMarketService additional opportunities", () => {
  it("re-sends the renter match notification when an agent matches an already-matched request", async () => {
    const agentId = "matching-agent";
    const requestId = "507f1f77bcf86cd799439011";
    const request = {
      _id: requestId,
      renterId: "renter-1",
      requestName: "R-REPEAT",
      visibility: "SHARED",
      shareConsent: true,
      status: "Available",
      isActive: true,
      scope: "Upcoming",
      registrationDisclosureConfirmations: [],
    };
    const existingMatch = {
      _id: "grant-1",
      agentId,
      preMarketRequestId: requestId,
      representation_type: "renter_representation",
      status: "free",
    };
    const notifications: Array<Record<string, unknown>> = [];
    const service = new PreMarketService();
    const serviceAny = service as any;

    serviceAny.agentRepository = {
      findByUserId: async () => ({ hasGrantAccess: true }),
    };
    serviceAny.preMarketRepository = {
      findByIdWithActivationStatus: async () => request,
    };
    serviceAny.grantAccessRepository = {
      findByAgentAndRequest: async () => existingMatch,
    };
    serviceAny.isRegisteredAgentForRequest = async () => false;
    serviceAny.ensureAgentCanViewRequest = () => undefined;
    serviceAny.ensureAgentCanViewRequestVisibility = async () => undefined;
    serviceAny.ensureRegisteredAgentCanMatchRequest = async () => undefined;
    serviceAny.notifyRenterAboutMatchedOpportunity = async (
      matchedAgentId: string,
      _request: unknown,
      grantAccessId: string,
      details: string | undefined,
    ) => {
      notifications.push({ matchedAgentId, grantAccessId, details });
    };

    const result = await service.matchRequestForAgent(
      agentId,
      requestId,
      "renter_representation",
      "Still available.",
    );

    expect(result).toBe(existingMatch);
    expect(notifications).toEqual([
      {
        matchedAgentId: agentId,
        grantAccessId: "grant-1",
        details: "Still available.",
      },
    ]);
  });

  it("allows an already-matched shared agent to add an opportunity without disclosure confirmation", async () => {
    const agentId = "matching-agent";
    const requestId = "507f1f77bcf86cd799439012";
    const request = {
      _id: requestId,
      renterId: "renter-1",
      requestName: "R-SHARED",
      visibility: "SHARED",
      shareConsent: true,
      status: "Available",
      isActive: true,
      scope: "Upcoming",
      registrationDisclosureConfirmations: [],
    };
    const existingMatch = {
      _id: "grant-1",
      agentId,
      preMarketRequestId: requestId,
      representation_type: "renter_representation",
      status: "free",
    };
    const notifications: Array<Record<string, unknown>> = [];
    const service = new PreMarketService();
    const serviceAny = service as any;
    const updateById = vi.fn().mockResolvedValue(request);

    serviceAny.agentRepository = {
      findByUserId: async () => ({
        _id: "agent-profile-1",
        userId: agentId,
        hasGrantAccess: true,
      }),
    };
    serviceAny.preMarketRepository = {
      findByIdWithActivationStatus: async () => request,
      updateById,
    };
    serviceAny.grantAccessRepository = {
      findByAgentAndRequest: async () => existingMatch,
    };
    serviceAny.isRegisteredAgentForRequest = async () => false;
    serviceAny.ensureAgentCanViewRequest = () => undefined;
    serviceAny.ensureAgentCanViewRequestVisibility = async () => undefined;
    serviceAny.ensureRegisteredAgentCanMatchRequest = async () => undefined;
    serviceAny.notifyRenterAboutMatchedOpportunity = async (
      _matchedAgentId: string,
      _request: unknown,
      _grantAccessId: string,
      _details: string | undefined,
      options: Record<string, unknown>,
    ) => {
      notifications.push(options);
    };

    const result = await service.matchRequestForAgent(
      agentId,
      requestId,
      "renter_representation",
      "Another suitable opportunity.",
      true,
    );

    expect(result).toMatchObject({
      _id: "grant-1",
      additionalOpportunity: true,
    });
    expect(notifications).toEqual([
      expect.objectContaining({ additionalOpportunity: true }),
    ]);
    expect(updateById).toHaveBeenCalledWith(
      requestId,
      expect.objectContaining({
        searchActivity: expect.objectContaining({
          lastMatchedAt: expect.any(Date),
          pendingConfirmationToken: null,
          pendingConfirmationSentAt: null,
          pendingConfirmationExpiresAt: null,
        }),
      }),
    );
  });
});

describe("PreMarketService owner-representation notifications", () => {
  it("sends Template 29 acknowledgment without creating a grant-access record or flipping All Market to private", async () => {
    const agentId = "matched-owner-agent";
    const requestId = "507f1f77bcf86cd799439099";
    const request = {
      _id: requestId,
      renterId: "renter-1",
      requestName: "R-OWNER",
      visibility: "SHARED",
      shareConsent: true,
      status: "Available",
      isActive: true,
      scope: "All Market",
      registrationDisclosureConfirmations: [],
    };
    const service = new PreMarketService();
    const serviceAny = service as any;
    const ownerAcknowledgments: Array<Record<string, unknown>> = [];
    let renterNotificationCount = 0;
    const ownerRepresentationMatches: Array<Record<string, unknown>> = [];
    let setAllMarketPrivateCalled = 0;
    let grantAccessCreated = 0;

    serviceAny.agentRepository = {
      findByUserId: async () => ({
        _id: "agent-profile-1",
        userId: agentId,
        hasGrantAccess: true,
      }),
    };
    serviceAny.preMarketRepository = {
      findByIdWithActivationStatus: async () => request,
      updateById: async () => request,
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
          _id: "grant-owner-1",
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
    serviceAny.isRegisteredAgentForRequest = async () => false;
    serviceAny.ensureAgentCanViewRequest = () => undefined;
    serviceAny.ensureAgentCanViewRequestVisibility = async () => undefined;
    serviceAny.ensureRegisteredAgentCanMatchRequest = async () => undefined;
    serviceAny.markSearchMatchedActivity = async () => undefined;
    serviceAny.notifyRegisteredAgentAboutOwnerRepresentationMatch = async (
      matchedAgentId: string,
      matchedRequest: unknown,
      details: string | undefined,
      options: { additionalOpportunity?: boolean; matchSummary?: unknown } = {},
    ) => {
      ownerAcknowledgments.push({
        matchedAgentId,
        matchedRequest,
        details,
        summary: options.matchSummary,
        additionalOpportunity: options.additionalOpportunity,
      });
    };
    serviceAny.notifyRenterAboutMatchedOpportunity = async () => {
      renterNotificationCount += 1;
    };

    const result = await service.matchRequestForAgent(
      agentId,
      requestId,
      "owner_representation",
      "Owner-side opportunity details.",
    );

    expect(grantAccessCreated).toBe(0);
    expect(setAllMarketPrivateCalled).toBe(0);
    expect(ownerRepresentationMatches).toHaveLength(1);
    expect(ownerRepresentationMatches[0]).toMatchObject({
      agentId,
      opportunityDetails: "Owner-side opportunity details.",
    });
    expect(ownerAcknowledgments).toEqual([
      expect.objectContaining({
        matchedAgentId: agentId,
        details: "Owner-side opportunity details.",
      }),
    ]);
    expect(renterNotificationCount).toBe(0);
  });

  it("allows an owner-rep agent to add an additional opportunity on an Upcoming / Upcoming (M) request", async () => {
    const agentId = "matched-owner-agent";
    const requestId = "507f1f77bcf86cd799439100";
    const request = {
      _id: requestId,
      renterId: "renter-1",
      requestName: "R-OWNER-ADD-OP",
      visibility: "SHARED",
      shareConsent: true,
      status: "Available",
      isActive: true,
      scope: "Upcoming",
      registrationDisclosureConfirmations: [],
    };
    const existingMatch = {
      _id: "grant-owner-existing",
      agentId,
      preMarketRequestId: requestId,
      representation_type: "owner_representation",
      status: "free",
    };
    const service = new PreMarketService();
    const serviceAny = service as any;
    const ownerAcknowledgments: Array<Record<string, unknown>> = [];
    let renterNotificationCount = 0;

    serviceAny.agentRepository = {
      findByUserId: async () => ({
        _id: "agent-profile-1",
        userId: agentId,
        hasGrantAccess: true,
      }),
    };
    serviceAny.preMarketRepository = {
      findByIdWithActivationStatus: async () => request,
      updateById: async () => request,
      setAllMarketRequestPrivateAfterMatch: async () => undefined,
    };
    serviceAny.grantAccessRepository = {
      findByAgentAndRequest: async () => existingMatch,
    };
    serviceAny.isRegisteredAgentForRequest = async () => false;
    serviceAny.ensureAgentCanViewRequest = () => undefined;
    serviceAny.ensureAgentCanViewRequestVisibility = async () => undefined;
    serviceAny.ensureRegisteredAgentCanMatchRequest = async () => undefined;
    serviceAny.notifyRegisteredAgentAboutOwnerRepresentationMatch = async (
      matchedAgentId: string,
      matchedRequest: unknown,
      details: string | undefined,
      options: { additionalOpportunity?: boolean; matchSummary?: unknown } = {},
    ) => {
      ownerAcknowledgments.push({
        matchedAgentId,
        matchedRequest,
        details,
        additionalOpportunity: options.additionalOpportunity,
      });
    };
    serviceAny.notifyRenterAboutMatchedOpportunity = async () => {
      renterNotificationCount += 1;
    };

    const result = await service.matchRequestForAgent(
      agentId,
      requestId,
      "owner_representation",
      "A second owner-side opportunity.",
      true,
    );

    expect(result).toMatchObject({
      _id: "grant-owner-existing",
      additionalOpportunity: true,
    });
    expect(ownerAcknowledgments).toEqual([
      expect.objectContaining({
        matchedAgentId: agentId,
        details: "A second owner-side opportunity.",
        additionalOpportunity: true,
      }),
    ]);
    expect(renterNotificationCount).toBe(0);
  });

  it("rejects owner-rep additional-opportunity on an All Market request", async () => {
    const agentId = "matched-owner-agent";
    const requestId = "507f1f77bcf86cd799439101";
    const request = {
      _id: requestId,
      renterId: "renter-1",
      requestName: "R-OWNER-ALL-MARKET",
      visibility: "PUBLIC",
      shareConsent: true,
      status: "Available",
      isActive: true,
      scope: "All Market",
      registrationDisclosureConfirmations: [],
    };
    const existingMatch = {
      _id: "grant-owner-existing-am",
      agentId,
      preMarketRequestId: requestId,
      representation_type: "owner_representation",
      status: "free",
    };
    const service = new PreMarketService();
    const serviceAny = service as any;

    serviceAny.agentRepository = {
      findByUserId: async () => ({
        _id: "agent-profile-1",
        userId: agentId,
        hasGrantAccess: true,
      }),
    };
    serviceAny.preMarketRepository = {
      findByIdWithActivationStatus: async () => request,
    };
    serviceAny.grantAccessRepository = {
      findByAgentAndRequest: async () => existingMatch,
    };
    serviceAny.isRegisteredAgentForRequest = async () => false;
    serviceAny.ensureAgentCanViewRequest = () => undefined;
    serviceAny.ensureAgentCanViewRequestVisibility = async () => undefined;
    serviceAny.ensureRegisteredAgentCanMatchRequest = async () => undefined;
    serviceAny.notifyRegisteredAgentAboutOwnerRepresentationMatch = async () => undefined;
    serviceAny.notifyRenterAboutMatchedOpportunity = async () => undefined;

    await expect(
      service.matchRequestForAgent(
        agentId,
        requestId,
        "owner_representation",
        "Should be rejected.",
        true,
      ),
    ).rejects.toThrow(
      "Additional opportunity matching is only available for Upcoming / Upcoming (M) requests.",
    );
  });
});

describe("PreMarketService renter market-scope switching", () => {
  const renterId = "renter-1";
  const requestId = "507f1f77bcf86cd799439077";

  function buildUpdateService(request: Record<string, unknown>) {
    const service = new PreMarketService();
    const serviceAny = service as any;
    const updateById = vi.fn().mockImplementation(
      async (_requestId: string, payload: Record<string, unknown>) => ({
        ...request,
        ...payload,
      }),
    );

    serviceAny.preMarketRepository = {
      findById: async () => request,
      updateById,
    };
    serviceAny.grantAccessRepository = {
      findByPreMarketRequestId: vi.fn().mockResolvedValue([]),
    };
    serviceAny.notifier = {
      notifyAgentsAboutUpdatedRequest: vi.fn().mockResolvedValue(undefined),
    };
    serviceAny.scheduleConsolidatedExcelRefresh = () => undefined;

    return { service, serviceAny, updateById };
  }

  it("blocks All Market to Upcoming when the request is already Upcoming (M)", async () => {
    const request = {
      _id: requestId,
      renterId,
      scope: "All Market",
      visibility: "PRIVATE",
      searchActivity: {},
    };
    const { service, serviceAny, updateById } = buildUpdateService(request);
    serviceAny.grantAccessRepository.findByPreMarketRequestId
      .mockResolvedValue([
        {
          status: "free",
          representation_type: "renter_representation",
          scopeAtMatch: "All Market",
        },
      ]);

    await expect(
      service.updateRequest(renterId, requestId, {
        scope: "Upcoming",
        visibility: "PRIVATE",
      }),
    ).rejects.toThrow(
      "A rental specialist is already assigned. To switch to upcoming only, you can notify your registered agent, delete the request and start again, or contact support@beforelisted.com.",
    );
    expect(updateById).not.toHaveBeenCalled();
  });

  it.each(["Upcoming", null])(
    "allows All Market to Upcoming when the active match was created at %s",
    async (scopeAtMatch) => {
      const request = {
        _id: requestId,
        renterId,
        scope: "All Market",
        visibility: "SHARED",
        searchActivity: {},
      };
      const { service, serviceAny, updateById } = buildUpdateService(request);
      serviceAny.grantAccessRepository.findByPreMarketRequestId
        .mockResolvedValue([
          {
            status: "free",
            representation_type: "renter_representation",
            scopeAtMatch,
          },
        ]);

      await service.updateRequest(renterId, requestId, {
        scope: "Upcoming",
        visibility: "SHARED",
      });

      expect(updateById).toHaveBeenCalledWith(
        requestId,
        expect.objectContaining({
          scope: "Upcoming",
          visibility: "PRIVATE",
        }),
      );
    },
  );

  it("allows unmatched All Market to switch to Upcoming and forces Private", async () => {
    const request = {
      _id: requestId,
      renterId,
      scope: "All Market",
      visibility: "SHARED",
      searchActivity: {},
    };
    const { service, updateById } = buildUpdateService(request);

    await service.updateRequest(renterId, requestId, {
      scope: "Upcoming",
      visibility: "SHARED",
    });

    expect(updateById).toHaveBeenCalledWith(
      requestId,
      expect.objectContaining({
        scope: "Upcoming",
        visibility: "PRIVATE",
        searchActivity: expect.objectContaining({
          upcomingScopeSelectedAt: expect.any(Date),
          upcomingSearchExpansionReminderSentAt: null,
        }),
      }),
    );
  });

  it("switches Upcoming to All Market and forces Private", async () => {
    const request = {
      _id: requestId,
      renterId,
      scope: "Upcoming",
      visibility: "SHARED",
      searchActivity: {},
    };
    const { service, updateById } = buildUpdateService(request);

    await service.updateRequest(renterId, requestId, {
      scope: "All Market",
      visibility: "SHARED",
    });

    expect(updateById).toHaveBeenCalledWith(
      requestId,
      expect.objectContaining({
        scope: "All Market",
        visibility: "PRIVATE",
        searchActivity: expect.objectContaining({
          upcomingScopeSelectedAt: null,
          upcomingSearchExpansionReminderSentAt: null,
        }),
      }),
    );
  });

  it("applies the Upcoming (M) lock to admin scope changes", async () => {
    const request = {
      _id: requestId,
      renterId,
      scope: "All Market",
      visibility: "PRIVATE",
    };
    const { service, serviceAny, updateById } = buildUpdateService(request);
    serviceAny.grantAccessRepository.findByPreMarketRequestId
      .mockResolvedValue([
        {
          status: "paid",
          representation_type: "renter_representation",
          scopeAtMatch: "All Market",
        },
      ]);

    await expect(
      service.adminUpdateScope(requestId, "Upcoming", "admin-1"),
    ).rejects.toThrow(
      "A rental specialist is already assigned. To switch to upcoming only, you can notify your registered agent, delete the request and start again, or contact support@beforelisted.com.",
    );
    expect(updateById).not.toHaveBeenCalled();
  });

  it("allows an admin to restore Upcoming when the match predates All Market", async () => {
    const request = {
      _id: requestId,
      renterId,
      scope: "All Market",
      visibility: "SHARED",
    };
    const { service, serviceAny, updateById } = buildUpdateService(request);
    serviceAny.grantAccessRepository.findByPreMarketRequestId
      .mockResolvedValue([
        {
          status: "free",
          representation_type: "renter_representation",
          scopeAtMatch: "Upcoming",
        },
      ]);
    serviceAny.notifier.notifyRenterAboutAdminScopeUpdate = vi
      .fn()
      .mockResolvedValue(undefined);

    await service.adminUpdateScope(requestId, "Upcoming", "admin-1");

    expect(updateById).toHaveBeenCalledWith(requestId, {
      scope: "Upcoming",
      visibility: "PRIVATE",
    });
  });
});

describe("PreMarketService bulk matching", () => {
  it("passes the additional opportunity flag through each selected request", async () => {
    const service = new PreMarketService();
    const calls: Array<{
      agentId: string;
      requestId: string;
      additionalOpportunity: boolean;
      matchContext?: MatchApartmentInput;
    }> = [];
    const serviceAny = service as any;

    serviceAny.matchRequestForAgent = async (
      agentId: string,
      requestId: string,
      _representationType: string,
      _opportunityDetails: string | undefined,
      additionalOpportunity: boolean,
      matchContext?: MatchApartmentInput,
    ) => {
      calls.push({ agentId, requestId, additionalOpportunity, matchContext });
      return { requestId };
    };

    const result = await service.matchRequestsForAgent(
      "agent-1",
      ["request-1", "request-1", "request-2"],
      "renter_representation",
      "123 W 85th St - Available Thursday at 3pm.",
      true,
      baseApartment,
    );

    expect(result.failed).toEqual([]);
    expect(result.matched).toHaveLength(2);
    expect(calls).toEqual([
      {
        agentId: "agent-1",
        requestId: "request-1",
        additionalOpportunity: true,
        matchContext: baseApartment,
      },
      {
        agentId: "agent-1",
        requestId: "request-2",
        additionalOpportunity: true,
        matchContext: baseApartment,
      },
    ]);
  });

  it("preserves the exact failure reason when another request in the batch succeeds", async () => {
    const service = new PreMarketService();
    const serviceAny = service as any;

    serviceAny.matchRequestForAgent = async (
      _agentId: string,
      requestId: string,
    ) => {
      if (requestId === "inactive-request") {
        throw new Error(
          "This listing is no longer accepting requests",
        );
      }

      return { requestId };
    };

    const result = await service.matchRequestsForAgent(
      "agent-1",
      ["inactive-request", "request-ready"],
      "renter_representation",
      undefined,
      true,
      baseApartment,
    );

    expect(result.matched).toEqual([
      { requestId: "request-ready", result: { requestId: "request-ready" } },
    ]);
    expect(result.failed).toEqual([
      {
        requestId: "inactive-request",
        message: "This listing is no longer accepting requests",
      },
    ]);
  });
});
