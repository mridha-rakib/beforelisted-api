import { describe, expect, it } from "vitest";

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
