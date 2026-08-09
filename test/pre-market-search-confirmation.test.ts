import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PreMarketService } from "../src/modules/pre-market/pre-market.service";
import { emailService } from "../src/services/email.service";

vi.mock("../src/services/email.service", () => ({
  emailService: {
    sendActiveSearchConfirmationReminder: vi.fn().mockResolvedValue({ success: true }),
    sendRenterArchiveNotification: vi.fn().mockResolvedValue({ success: true }),
    sendUpcomingRequestSearchExpansionReminder: vi.fn().mockResolvedValue({ success: true }),
  },
}));

const requestId = "665f1f77bcf86cd799439011";
const renterId = "665f1f77bcf86cd799439022";
const registeredAgentId = "665f1f77bcf86cd799439033";
const expiredAt = new Date("2026-06-18T21:00:00.000Z");
const sweepNow = new Date("2026-06-18T21:22:00.000Z");

function buildRequest(overrides: Record<string, any> = {}) {
  return {
    _id: requestId,
    renterId,
    requestId: "R-123456",
    requestName: "R-123456",
    isDeleted: false,
    isActive: true,
    status: "Available",
    scope: "Upcoming",
    visibility: "PRIVATE",
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    searchActivity: {
      lastRenterUpdatedAt: new Date("2026-06-01T00:00:00.000Z"),
      lastMatchedAt: null,
      lastConfirmedAt: null,
      lastConfirmationEmailSentAt: new Date("2026-06-15T21:00:00.000Z"),
      upcomingScopeSelectedAt: null,
      upcomingSearchExpansionReminderSentAt: null,
      pendingConfirmationToken: "expired-token",
      pendingConfirmationSentAt: new Date("2026-06-15T21:00:00.000Z"),
      pendingConfirmationExpiresAt: expiredAt,
    },
    agentArchives: [],
    ...overrides,
  };
}

function buildService() {
  const service = new PreMarketService() as any;
  service.preMarketRepository = {
    findActiveRequestsForSearchConfirmationSweep: vi.fn(),
    findActiveUpcomingRequestsForSearchExpansionReminderSweep: vi.fn(),
    getRequestById: vi.fn(),
    archiveExpiredSearchConfirmation: vi.fn(),
    markUpcomingSearchExpansionReminderSent: vi.fn(),
  };
  service.grantAccessRepository = {
    findLatestMatchedAtByRequestIds: vi.fn().mockResolvedValue(new Map()),
  };
  service.renterRepository = {
    findRenterWithReferrer: vi.fn().mockResolvedValue({
      email: "renter@example.com",
      fullName: "Test Renter",
    }),
  };
  service.resolveRegisteredAgentIdForRequest = vi.fn().mockResolvedValue(registeredAgentId);
  service.getMatchedAgentIdsForArchive = vi.fn().mockResolvedValue([]);
  service.getArchiveAgentInfo = vi.fn().mockResolvedValue({
    id: registeredAgentId,
    fullName: "Test Agent",
    email: "agent@example.com",
    phoneNumber: "N/A",
    title: "Agent",
    brokerage: "Brokerage",
    activationLink: null,
    disclosureLink: null,
  });

  return service;
}

describe("PreMarketService automatic search confirmation sweep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(sweepNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not archive or email a request that has already been reactivated", async () => {
    const service = buildService();
    const reactivatedRequest = buildRequest({
      searchActivity: {
        lastRenterUpdatedAt: new Date("2026-06-01T00:00:00.000Z"),
        lastConfirmedAt: new Date("2026-06-18T00:34:15.794Z"),
        lastConfirmationEmailSentAt: new Date("2026-06-15T00:30:00.020Z"),
        pendingConfirmationToken: null,
        pendingConfirmationSentAt: null,
        pendingConfirmationExpiresAt: null,
      },
    });

    service.preMarketRepository.findActiveRequestsForSearchConfirmationSweep
      .mockResolvedValue([reactivatedRequest]);

    const result = await service.processAutomaticSearchConfirmationSweep();

    expect(result).toEqual({
      remindersSent: 0,
      archivedRequests: 0,
      failedCount: 0,
    });
    expect(service.preMarketRepository.archiveExpiredSearchConfirmation).not.toHaveBeenCalled();
    expect(emailService.sendRenterArchiveNotification).not.toHaveBeenCalled();
  });

  it("does not send Template 26 before 14 days after the latest match activity", async () => {
    const service = buildService();
    const recentlyMatchedRequest = buildRequest({
      searchActivity: {
        lastRenterUpdatedAt: new Date("2026-06-01T00:00:00.000Z"),
        lastMatchedAt: new Date("2026-06-10T21:00:00.000Z"),
        lastConfirmedAt: null,
        lastConfirmationEmailSentAt: null,
        pendingConfirmationToken: null,
        pendingConfirmationSentAt: null,
        pendingConfirmationExpiresAt: null,
      },
    });

    service.preMarketRepository.findActiveRequestsForSearchConfirmationSweep
      .mockResolvedValue([recentlyMatchedRequest]);

    const result = await service.processAutomaticSearchConfirmationSweep();

    expect(result).toEqual({
      remindersSent: 0,
      archivedRequests: 0,
      failedCount: 0,
    });
    expect(emailService.sendActiveSearchConfirmationReminder).not.toHaveBeenCalled();
    expect(emailService.sendRenterArchiveNotification).not.toHaveBeenCalled();
  });

  it("does not archive or email when a stale sweep item has been reactivated in the latest DB state", async () => {
    const service = buildService();
    const staleSweepRequest = buildRequest();
    const latestReactivatedRequest = buildRequest({
      searchActivity: {
        ...staleSweepRequest.searchActivity,
        lastConfirmedAt: new Date("2026-06-18T00:34:15.794Z"),
        pendingConfirmationToken: null,
        pendingConfirmationSentAt: null,
        pendingConfirmationExpiresAt: null,
      },
    });

    service.preMarketRepository.findActiveRequestsForSearchConfirmationSweep
      .mockResolvedValue([staleSweepRequest]);
    service.preMarketRepository.getRequestById
      .mockResolvedValue(latestReactivatedRequest);

    const result = await service.processAutomaticSearchConfirmationSweep();

    expect(result.archivedRequests).toBe(0);
    expect(service.preMarketRepository.archiveExpiredSearchConfirmation).not.toHaveBeenCalled();
    expect(emailService.sendRenterArchiveNotification).not.toHaveBeenCalled();
  });

  it("does not email when the conditional archive update does not match current state", async () => {
    const service = buildService();
    const staleSweepRequest = buildRequest();

    service.preMarketRepository.findActiveRequestsForSearchConfirmationSweep
      .mockResolvedValue([staleSweepRequest]);
    service.preMarketRepository.getRequestById.mockResolvedValue(staleSweepRequest);
    service.preMarketRepository.archiveExpiredSearchConfirmation.mockResolvedValue(null);

    const result = await service.processAutomaticSearchConfirmationSweep();

    expect(result.archivedRequests).toBe(0);
    expect(service.preMarketRepository.archiveExpiredSearchConfirmation)
      .toHaveBeenCalledWith(
        requestId,
        "expired-token",
        expect.any(Date),
        expect.arrayContaining([
          expect.objectContaining({
            agentId: registeredAgentId,
            reason: "search_inactive_automatic",
            source: "system",
          }),
        ]),
      );
    expect(emailService.sendRenterArchiveNotification).not.toHaveBeenCalled();
  });

  it("sends one archive email only after the conditional archive remains archived", async () => {
    const service = buildService();
    const staleSweepRequest = buildRequest();
    const archivedRequest = buildRequest({
      agentArchives: [
        {
          agentId: registeredAgentId,
          archivedByAgentId: registeredAgentId,
          reason: "search_inactive_automatic",
          source: "system",
          archivedAt: sweepNow,
        },
      ],
      searchActivity: {
        ...staleSweepRequest.searchActivity,
        pendingConfirmationToken: null,
        pendingConfirmationSentAt: null,
        pendingConfirmationExpiresAt: null,
      },
    });

    service.preMarketRepository.findActiveRequestsForSearchConfirmationSweep
      .mockResolvedValue([staleSweepRequest]);
    service.preMarketRepository.getRequestById
      .mockResolvedValueOnce(staleSweepRequest)
      .mockResolvedValueOnce(archivedRequest);
    service.preMarketRepository.archiveExpiredSearchConfirmation
      .mockResolvedValue(archivedRequest);

    const result = await service.processAutomaticSearchConfirmationSweep();

    expect(result.archivedRequests).toBe(1);
    expect(emailService.sendRenterArchiveNotification).toHaveBeenCalledTimes(1);
  });
});

describe("PreMarketService upcoming search expansion reminder sweep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(sweepNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not send Template 32 before 10 days after the request entered Upcoming mode", async () => {
    const service = buildService();
    const request = buildRequest({
      searchActivity: {
        upcomingScopeSelectedAt: new Date("2026-06-10T21:22:00.000Z"),
        upcomingSearchExpansionReminderSentAt: null,
      },
    });

    service.preMarketRepository.findActiveUpcomingRequestsForSearchExpansionReminderSweep
      .mockResolvedValue([request]);

    const result = await service.processUpcomingSearchExpansionReminderSweep();

    expect(result).toEqual({
      remindersSent: 0,
      skippedCount: 1,
      failedCount: 0,
    });
    expect(service.preMarketRepository.markUpcomingSearchExpansionReminderSent).not.toHaveBeenCalled();
    expect(emailService.sendUpcomingRequestSearchExpansionReminder).not.toHaveBeenCalled();
  });

  it("sends Template 32 once after 10 days for an active Upcoming request", async () => {
    const service = buildService();
    const request = buildRequest({
      searchActivity: {
        upcomingScopeSelectedAt: new Date("2026-06-08T21:22:00.000Z"),
        upcomingSearchExpansionReminderSentAt: null,
      },
    });

    service.preMarketRepository.findActiveUpcomingRequestsForSearchExpansionReminderSweep
      .mockResolvedValue([request]);
    service.preMarketRepository.markUpcomingSearchExpansionReminderSent
      .mockResolvedValue(request);

    const result = await service.processUpcomingSearchExpansionReminderSweep();

    expect(result).toEqual({
      remindersSent: 1,
      skippedCount: 0,
      failedCount: 0,
    });
    expect(service.preMarketRepository.markUpcomingSearchExpansionReminderSent)
      .toHaveBeenCalledWith(requestId, sweepNow);
    expect(emailService.sendUpcomingRequestSearchExpansionReminder)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          to: "renter@example.com",
          renterName: "Test Renter",
          replyTo: "agent@example.com",
          subject:
            "Trouble Securing an Apartment? Increase Your Chances with a Rental Specialist – BeforeListed™",
          templateType: "UPCOMING_REQUEST_SEARCH_EXPANSION_REMINDER",
          bodyHtml: expect.stringContaining(
            `/renter/saved-requests/${requestId}`,
          ),
        }),
      );
  });

  it("does not send Template 32 when the request is no longer Upcoming", async () => {
    const service = buildService();
    const request = buildRequest({
      scope: "All Market",
      searchActivity: {
        upcomingScopeSelectedAt: new Date("2026-06-01T21:22:00.000Z"),
        upcomingSearchExpansionReminderSentAt: null,
      },
    });

    service.preMarketRepository.findActiveUpcomingRequestsForSearchExpansionReminderSweep
      .mockResolvedValue([request]);

    const result = await service.processUpcomingSearchExpansionReminderSweep();

    expect(result).toEqual({
      remindersSent: 0,
      skippedCount: 1,
      failedCount: 0,
    });
    expect(emailService.sendUpcomingRequestSearchExpansionReminder).not.toHaveBeenCalled();
  });

  it("does not send Template 32 again after it was already sent", async () => {
    const service = buildService();
    const request = buildRequest({
      searchActivity: {
        upcomingScopeSelectedAt: new Date("2026-06-01T21:22:00.000Z"),
        upcomingSearchExpansionReminderSentAt: new Date("2026-06-11T21:22:00.000Z"),
      },
    });

    service.preMarketRepository.findActiveUpcomingRequestsForSearchExpansionReminderSweep
      .mockResolvedValue([request]);

    const result = await service.processUpcomingSearchExpansionReminderSweep();

    expect(result).toEqual({
      remindersSent: 0,
      skippedCount: 1,
      failedCount: 0,
    });
    expect(emailService.sendUpcomingRequestSearchExpansionReminder).not.toHaveBeenCalled();
  });
});
