// @vitest-environment node
// Verifies the "All Market Offer" toggle behavior:
//   - before day 7, On → Off sends up to four emails and stays interactive
//   - at day 7, the sweep sends once only when no toggle email was sent
//   - non-registered agents are forbidden
//   - the day-7 sweep respects the opt-out
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PreMarketService } from "../src/modules/pre-market/pre-market.service";
import { emailService } from "../src/services/email.service";

vi.mock("../src/services/email.service", () => ({
  emailService: {
    sendUpcomingRequestSearchExpansionReminder: vi
      .fn()
      .mockResolvedValue({ success: true }),
  },
}));

const REQUEST_ID = "665f1f77bcf86cd799439011";
const REGISTERED_AGENT_ID = "665f1f77bcf86cd799439033";
const NON_REGISTERED_AGENT_ID = "665f1f77bcf86cd799439099";
const RENTER_ID = "665f1f77bcf86cd799439055";
const NOW = new Date("2026-08-16T12:00:00.000Z");

function buildRequest(overrides: Record<string, any> = {}) {
  return {
    _id: REQUEST_ID,
    renterId: RENTER_ID,
    requestId: "R-123456",
    requestName: "R-123456",
    isDeleted: false,
    isActive: true,
    status: "Available",
    scope: "Upcoming",
    visibility: "PRIVATE",
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    searchActivity: {
      lastRenterUpdatedAt: new Date("2026-08-01T00:00:00.000Z"),
      lastMatchedAt: null,
      lastConfirmedAt: null,
      lastConfirmationEmailSentAt: null,
      upcomingScopeSelectedAt: new Date("2026-08-01T00:00:00.000Z"),
      upcomingSearchExpansionReminderSentAt: null,
      allMarketOfferEnabled: true,
      allMarketOfferToggledAt: null,
      allMarketOfferToggledByAgentId: null,
      allMarketOfferToggleEmailCount: 0,
      pendingConfirmationToken: null,
      pendingConfirmationSentAt: null,
      pendingConfirmationExpiresAt: null,
    },
    agentArchives: [],
    ...overrides,
  };
}

function buildService(opts: { request?: any; registeredAgentId?: string | null } = {}) {
  const service = new PreMarketService() as any;
  // Use a sentinel to distinguish "explicit null" (request not found) from
  // "use the default buildRequest fixture".
  const defaultRequest = buildRequest();
  const requestForFindById =
    opts.request === undefined ? defaultRequest : opts.request;
  service.preMarketRepository = {
    findById: vi.fn().mockResolvedValue(requestForFindById),
    findActiveUpcomingRequestsForSearchExpansionReminderSweep: vi.fn(),
    toggleAllMarketOffer: vi.fn(),
    markUpcomingSearchExpansionReminderSent: vi.fn(),
  };
  service.renterRepository = {
    findRenterWithReferrer: vi.fn().mockResolvedValue({
      email: "renter@example.com",
      fullName: "Test Renter",
    }),
  };
  service.isRegisteredAgentForRequest = vi
    .fn()
    .mockImplementation(
      async (agentId: string) => agentId === (opts.registeredAgentId ?? REGISTERED_AGENT_ID),
    );
  service.getSearchActivity = vi.fn().mockImplementation((request: any) => ({
    upcomingScopeSelectedAt:
      request.searchActivity?.upcomingScopeSelectedAt ?? null,
    upcomingSearchExpansionReminderSentAt:
      request.searchActivity?.upcomingSearchExpansionReminderSentAt ?? null,
    allMarketOfferEnabled:
      request.searchActivity?.allMarketOfferEnabled ?? true,
    allMarketOfferToggleEmailCount:
      request.searchActivity?.allMarketOfferToggleEmailCount ?? 0,
  }));

  return service;
}

describe("PreMarketService.toggleAllMarketOffer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends an email for a pre-day-7 On → Off transition and keeps the gate interactive", async () => {
    const service = buildService({
      request: buildRequest({
        searchActivity: {
          ...buildRequest().searchActivity,
          upcomingScopeSelectedAt: new Date("2026-08-12T00:00:00.000Z"),
        },
      }),
    });
    // sendUpcomingSearchExpansionReminder resolves the registered agent
    // and reads its archive info to set the reply-to header. Stub both.
    service.resolveRegisteredAgentIdForRequest = vi
      .fn()
      .mockResolvedValue(REGISTERED_AGENT_ID);
    service.getArchiveAgentInfo = vi.fn().mockResolvedValue({
      email: "agent@example.com",
      fullName: "Test Agent",
    });
    const toggledDoc = buildRequest({
      scope: "Upcoming",
      searchActivity: {
        ...buildRequest().searchActivity,
        allMarketOfferEnabled: false,
        allMarketOfferToggledAt: NOW,
        upcomingSearchExpansionReminderSentAt: null,
        allMarketOfferToggleEmailCount: 1,
      },
    });
    service.preMarketRepository.toggleAllMarketOffer.mockResolvedValue(toggledDoc);

    const result = await service.toggleAllMarketOffer(
      REGISTERED_AGENT_ID,
      REQUEST_ID,
      false,
    );

    expect(
      emailService.sendUpcomingRequestSearchExpansionReminder,
    ).toHaveBeenCalledTimes(1);
    expect(service.preMarketRepository.toggleAllMarketOffer).toHaveBeenCalledWith(
      REQUEST_ID,
      false,
      REGISTERED_AGENT_ID,
      expect.any(Date),
      true,
    );
    // Scope MUST remain Upcoming — unchecking the gate must not mutate it.
    expect(result.scope).toBe("Upcoming");
    expect(result.searchActivity.allMarketOfferEnabled).toBe(false);
  });

  it("keeps the gate interactive after the automatic email has been sent", async () => {
    const service = buildService({
      request: buildRequest({
        searchActivity: {
          ...buildRequest().searchActivity,
          upcomingSearchExpansionReminderSentAt: new Date(
            "2026-08-12T00:00:00.000Z",
          ),
        },
      }),
    });
    const toggledDoc = buildRequest({
      searchActivity: {
        ...buildRequest().searchActivity,
        allMarketOfferEnabled: false,
        upcomingSearchExpansionReminderSentAt: new Date(
          "2026-08-12T00:00:00.000Z",
        ),
      },
    });
    service.preMarketRepository.toggleAllMarketOffer.mockResolvedValue(toggledDoc);

    await service.toggleAllMarketOffer(
      REGISTERED_AGENT_ID,
      REQUEST_ID,
      false,
    );

    expect(
      emailService.sendUpcomingRequestSearchExpansionReminder,
    ).not.toHaveBeenCalled();
    expect(service.preMarketRepository.toggleAllMarketOffer).toHaveBeenCalledWith(
      REQUEST_ID,
      false,
      REGISTERED_AGENT_ID,
      expect.any(Date),
      false,
    );
  });

  it("lets the registered agent re-enable the gate while still Upcoming", async () => {
    const service = buildService();
    const toggledDoc = buildRequest({
      searchActivity: {
        ...buildRequest().searchActivity,
        allMarketOfferEnabled: true,
        allMarketOfferToggledAt: NOW,
        allMarketOfferToggledByAgentId: REGISTERED_AGENT_ID,
      },
    });
    service.preMarketRepository.toggleAllMarketOffer.mockResolvedValue(toggledDoc);

    const result = await service.toggleAllMarketOffer(
      REGISTERED_AGENT_ID,
      REQUEST_ID,
      true,
    );

    expect(service.preMarketRepository.toggleAllMarketOffer).toHaveBeenCalledWith(
      REQUEST_ID,
      true,
      REGISTERED_AGENT_ID,
      expect.any(Date),
      false,
    );
    expect(result.searchActivity.allMarketOfferEnabled).toBe(true);
    expect(result.scope).toBe("Upcoming");
  });

  it("allows re-enabling the gate after the automatic email has been sent", async () => {
    const service = buildService({
      request: buildRequest({
        searchActivity: {
          ...buildRequest().searchActivity,
          upcomingSearchExpansionReminderSentAt: new Date(
            "2026-08-12T00:00:00.000Z",
          ),
        },
      }),
    });

    service.preMarketRepository.toggleAllMarketOffer.mockResolvedValue(
      buildRequest(),
    );

    await expect(
      service.toggleAllMarketOffer(REGISTERED_AGENT_ID, REQUEST_ID, true),
    ).resolves.toBeTruthy();

    expect(service.preMarketRepository.toggleAllMarketOffer).toHaveBeenCalled();
  });

  it("stops sending toggle emails after four pre-day-7 emails", async () => {
    const service = buildService({
      request: buildRequest({
        searchActivity: {
          ...buildRequest().searchActivity,
          upcomingScopeSelectedAt: new Date("2026-08-12T00:00:00.000Z"),
          allMarketOfferToggleEmailCount: 4,
          allMarketOfferEnabled: true,
        },
      }),
    });
    service.preMarketRepository.toggleAllMarketOffer.mockResolvedValue(
      buildRequest(),
    );

    await service.toggleAllMarketOffer(REGISTERED_AGENT_ID, REQUEST_ID, false);

    expect(
      emailService.sendUpcomingRequestSearchExpansionReminder,
    ).not.toHaveBeenCalled();
    expect(service.preMarketRepository.toggleAllMarketOffer).toHaveBeenCalledWith(
      REQUEST_ID,
      false,
      REGISTERED_AGENT_ID,
      expect.any(Date),
      false,
    );
  });

  it("forbids non-registered agents from toggling the gate", async () => {
    const service = buildService();

    await expect(
      service.toggleAllMarketOffer(NON_REGISTERED_AGENT_ID, REQUEST_ID, false),
    ).rejects.toThrow(/Only the registered agent/i);

    expect(service.preMarketRepository.toggleAllMarketOffer).not.toHaveBeenCalled();
  });

  it("refuses to toggle when the request is not in Upcoming scope", async () => {
    const service = buildService({
      request: buildRequest({ scope: "All Market" }),
    });

    await expect(
      service.toggleAllMarketOffer(REGISTERED_AGENT_ID, REQUEST_ID, false),
    ).rejects.toThrow(/only be toggled while the request is in the Upcoming scope/i);

    expect(service.preMarketRepository.toggleAllMarketOffer).not.toHaveBeenCalled();
  });

  it("refuses to toggle a deactivated request", async () => {
    const service = buildService({
      request: buildRequest({ isActive: false }),
    });

    await expect(
      service.toggleAllMarketOffer(REGISTERED_AGENT_ID, REQUEST_ID, false),
    ).rejects.toThrow(/deactivated request/i);
  });

  it("404s when the request does not exist", async () => {
    const service = buildService({ request: null });

    await expect(
      service.toggleAllMarketOffer(REGISTERED_AGENT_ID, REQUEST_ID, false),
    ).rejects.toThrow(/not found/i);
  });
});

describe("PreMarketService.processUpcomingSearchExpansionReminderSweep + All Market Offer gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Now is more than 7 days past upcomingScopeSelectedAt so the sweep
    // would fire Template #32 if the gate were open.
    vi.setSystemTime(new Date("2026-08-16T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("skips a request that already received a pre-day-7 toggle email", async () => {
    const service = new PreMarketService() as any;
    // The repository filter already excludes opted-out requests, but the
    // service-level guard is the source of truth and is what we test here.
    const manuallyEmailedRequest = buildRequest({
      searchActivity: {
        ...buildRequest().searchActivity,
        allMarketOfferToggleEmailCount: 1,
      },
    });
    service.preMarketRepository = {
      findActiveUpcomingRequestsForSearchExpansionReminderSweep: vi
        .fn()
        .mockResolvedValue([manuallyEmailedRequest]),
      markUpcomingSearchExpansionReminderSent: vi.fn(),
    };
    service.getSearchActivity = vi.fn().mockReturnValue({
      upcomingScopeSelectedAt: new Date("2026-08-01T00:00:00.000Z"),
      upcomingSearchExpansionReminderSentAt: null,
      allMarketOfferToggleEmailCount: 1,
    });

    const result = await service.processUpcomingSearchExpansionReminderSweep();

    expect(result.remindersSent).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(
      emailService.sendUpcomingRequestSearchExpansionReminder,
    ).not.toHaveBeenCalled();
    expect(
      service.preMarketRepository.markUpcomingSearchExpansionReminderSent,
    ).not.toHaveBeenCalled();
  });
});
