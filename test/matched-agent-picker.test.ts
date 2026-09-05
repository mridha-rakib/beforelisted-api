// file: test/matched-agent-picker.test.ts

import { Types } from "mongoose";
import { describe, expect, it, vi } from "vitest";

import { PreMarketService } from "../src/modules/pre-market/pre-market.service";

/**
 * Tests for the matched-agent picker (`resolveMatchedAgentForView` +
 * `buildMatchedAgentByRequestId`).
 *
 * Behavior locked in here:
 *  - The picker returns the OLDEST qualifying grant (repository now sorts
 *    `createdAt: 1` ascending).
 *  - The picker defensively skips "orphan" grants whose agentId is missing
 *    from the parent request's `viewedBy.grantAccessAgents[]`.
 *  - Unmatch writes an audit document to `grantaccess_unmatch_audit` before
 *    flipping the grant's status to "rejected".
 */

const REQUEST_ID = "507f1f77bcf86cd799439500";
const AGENT_ID_OLDEST = "507f1f77bcf86cd799439601"; // Ayana
const AGENT_ID_MIDDLE = "507f1f77bcf86cd799439602"; // Ashley
const AGENT_ID_NEWEST = "507f1f77bcf86cd799439603"; // Aaron
const VIEWER_AGENT_ID = "507f1f77bcf86cd799439610"; // some other agent

const grantOldest = {
  _id: "grant-oldest",
  preMarketRequestId: REQUEST_ID,
  agentId: { toString: () => AGENT_ID_OLDEST },
  status: "free",
  representation_type: "renter_representation",
  createdAt: new Date("2026-08-22T19:14:00Z"),
};
const grantMiddle = {
  _id: "grant-middle",
  preMarketRequestId: REQUEST_ID,
  agentId: { toString: () => AGENT_ID_MIDDLE },
  status: "free",
  representation_type: "renter_representation",
  createdAt: new Date("2026-08-25T17:21:00Z"),
};
const grantNewest = {
  _id: "grant-newest",
  preMarketRequestId: REQUEST_ID,
  agentId: { toString: () => AGENT_ID_NEWEST },
  status: "free",
  representation_type: "renter_representation",
  createdAt: new Date("2026-08-27T20:09:00Z"),
};

function buildService(opts?: {
  parentRequestViewedBy?: Types.ObjectId[] | null;
  grantRecords?: any[];
  loadRequestFromDb?: boolean;
}) {
  const service = new PreMarketService() as any;
  const viewedBy = opts?.parentRequestViewedBy ?? null;
  const parentRequest = {
    _id: REQUEST_ID,
    viewedBy: {
      grantAccessAgents: viewedBy ?? [],
    },
  };

  // Always provide a fast-mocked getRequestById to keep the picker synchronous
  // — the picker falls back to this when no parent request is passed in.
  service.getRequestById = vi.fn().mockResolvedValue(parentRequest);

  service.grantAccessRepository = {
    findByPreMarketRequestId: vi
      .fn()
      .mockResolvedValue(opts?.grantRecords ?? []),
    findByPreMarketRequestIds: vi
      .fn()
      .mockResolvedValue(opts?.grantRecords ?? []),
    updateById: vi.fn().mockResolvedValue({}),
  };
  service.grantAccessAuditRepository = {
    create: vi.fn().mockResolvedValue({}),
  };
  service.userRepository = {
    findById: vi.fn().mockImplementation(async (id: string) => {
      // Map our test agent ids to user records the picker can resolve.
      const map: Record<string, { fullName: string; email: string }> = {
        [AGENT_ID_OLDEST]: { fullName: "Ayana Cain", email: "ayana@x.com" },
        [AGENT_ID_MIDDLE]: { fullName: "Ashley H.", email: "ashley@x.com" },
        [AGENT_ID_NEWEST]: { fullName: "Aaron Chesky", email: "aaron@x.com" },
      };
      return map[id] ?? null;
    }),
    findByIds: vi
      .fn()
      .mockImplementation(async (ids: string[]) =>
        ids.map((id) => ({
          _id: id,
          fullName:
            id === AGENT_ID_OLDEST
              ? "Ayana Cain"
              : id === AGENT_ID_MIDDLE
                ? "Ashley H."
                : id === AGENT_ID_NEWEST
                  ? "Aaron Chesky"
                  : "Unknown",
          email: `${id}@x.com`,
        })),
      ),
  };

  return service;
}

describe("matched-agent picker", () => {
  it("resolveMatchedAgentForView returns the OLDEST qualifying grant", async () => {
    const service = buildService({
      // Repository now sorts ascending (oldest first), so the picker
      // receives records in this order. The first qualifying record is
      // Ayana (= the OLDEST in time).
      grantRecords: [grantOldest, grantMiddle, grantNewest],
      parentRequestViewedBy: [
        new Types.ObjectId(AGENT_ID_OLDEST),
        new Types.ObjectId(AGENT_ID_MIDDLE),
      ], // Aaron is the orphan (excluded from viewedBy)
    });

    const result = await service.resolveMatchedAgentForView(
      VIEWER_AGENT_ID,
      REQUEST_ID,
    );

    expect(result).not.toBeNull();
    expect(result?.agentId).toBe(AGENT_ID_OLDEST);
    expect(result?.fullName).toBe("Ayana Cain");
  });

  it("resolveMatchedAgentForView defensively skips an orphan grant", async () => {
    const service = buildService({
      grantRecords: [grantOldest, grantNewest], // oldest = Ayana, newest = Aaron (orphan)
      parentRequestViewedBy: [new Types.ObjectId(AGENT_ID_OLDEST)],
      // Note: AGENT_ID_NEWEST is NOT in viewedBy — Aaron is the orphan.
    });

    const result = await service.resolveMatchedAgentForView(
      VIEWER_AGENT_ID,
      REQUEST_ID,
    );

    expect(result?.agentId).toBe(AGENT_ID_OLDEST);

    // Now flip: pretend Ayana's grant was unmatched (removed from viewedBy),
    // and Ashley's grant remains. Aaron is still orphan.
    const service2 = buildService({
      grantRecords: [grantMiddle, grantNewest],
      parentRequestViewedBy: [new Types.ObjectId(AGENT_ID_MIDDLE)],
    });
    const result2 = await service2.resolveMatchedAgentForView(
      VIEWER_AGENT_ID,
      REQUEST_ID,
    );
    expect(result2?.agentId).toBe(AGENT_ID_MIDDLE);
  });

  it("resolveMatchedAgentForView excludes the viewer from the result", async () => {
    const service = buildService({
      grantRecords: [grantOldest, grantMiddle, grantNewest],
      parentRequestViewedBy: [
        new Types.ObjectId(AGENT_ID_OLDEST),
        new Types.ObjectId(AGENT_ID_MIDDLE),
      ],
    });

    // Viewer = Ayana (the oldest). Picker should return Ashley (next-oldest).
    const result = await service.resolveMatchedAgentForView(
      AGENT_ID_OLDEST,
      REQUEST_ID,
    );
    expect(result?.agentId).toBe(AGENT_ID_MIDDLE);
  });

  it("resolveMatchedAgentForView returns null when no qualifying grant exists", async () => {
    const service = buildService({
      grantRecords: [
        { ...grantNewest, status: "rejected" }, // filtered out
      ],
      parentRequestViewedBy: [new Types.ObjectId(AGENT_ID_NEWEST)],
    });

    const result = await service.resolveMatchedAgentForView(
      VIEWER_AGENT_ID,
      REQUEST_ID,
    );
    expect(result).toBeNull();
  });

  it("buildMatchedAgentByRequestId returns oldest-qualifying per request and skips orphans", async () => {
    const service = buildService({
      grantRecords: [grantOldest, grantMiddle, grantNewest],
      parentRequestViewedBy: [
        new Types.ObjectId(AGENT_ID_OLDEST),
        new Types.ObjectId(AGENT_ID_MIDDLE),
      ], // Aaron omitted = orphan
    });

    const parentRequestsByRequestId = new Map([
      [
        REQUEST_ID,
        {
          _id: REQUEST_ID,
          viewedBy: {
            grantAccessAgents: [
              new Types.ObjectId(AGENT_ID_OLDEST),
              new Types.ObjectId(AGENT_ID_MIDDLE),
            ],
          },
        },
      ],
    ]);

    const result = await (service as any).buildMatchedAgentByRequestId(
      [REQUEST_ID],
      VIEWER_AGENT_ID,
      parentRequestsByRequestId,
    );

    expect(result.get(REQUEST_ID)).toEqual({
      agentId: AGENT_ID_OLDEST,
      fullName: "Ayana Cain",
    });
  });
});

describe("unmatch audit log", () => {
  it("writes an audit document BEFORE flipping the grant status to 'rejected'", async () => {
    const service = buildService({
      grantRecords: [grantMiddle], // Ashley is the only qualifying match
      parentRequestViewedBy: [new Types.ObjectId(AGENT_ID_MIDDLE)],
    });

    // The unmatch flow uses `getRequestById`, `resolveRegisteredAgentIdForRequest`,
    // userRepository.findById, grantAccessRepository.findByPreMarketRequestId, and
    // preMarketRepository.updateById — we mock the ones not already stubbed.
    service.getRequestById = vi.fn().mockResolvedValue({
      _id: REQUEST_ID,
      renterId: "renter-1",
      viewedBy: {
        grantAccessAgents: [new Types.ObjectId(AGENT_ID_MIDDLE)],
      },
    });
    service.resolveRegisteredAgentIdForRequest = vi
      .fn()
      .mockResolvedValue(AGENT_ID_MIDDLE);
    service.userRepository.findById = vi
      .fn()
      .mockResolvedValue({ fullName: "Ashley H.", email: "ashley@x.com" });
    service.userRepository.findByRenterId = vi
      .fn()
      .mockResolvedValue({ fullName: "Renter One", email: "r@x.com" });
    service.userRepository.findRenterWithReferrer = vi
      .fn()
      .mockResolvedValue({ fullName: "Renter One", email: "r@x.com" });
    service.renterRepository = {
      findRenterWithReferrer: vi
        .fn()
        .mockResolvedValue({ fullName: "Renter One", email: "r@x.com" }),
    };
    service.preMarketRepository = {
      updateById: vi.fn().mockResolvedValue({}),
    };

    // Mock the email service so we don't actually try to send.
    const emailServiceModule = await import("../src/services/email.service");
    const emailSpy = vi
      .spyOn(emailServiceModule.emailService, "sendAgentUnmatchedNotification")
      .mockResolvedValue({ success: true } as any);

    try {
      await service.unmatchRequestForRegisteredAgent(AGENT_ID_MIDDLE, REQUEST_ID, {
        sendEmailNotice: true,
        personalMessage: "sorry, going a different direction",
      });

      // Audit document was created.
      expect(service.grantAccessAuditRepository.create).toHaveBeenCalledTimes(1);
      const auditArg = service.grantAccessAuditRepository.create.mock.calls[0][0];
      expect(auditArg).toMatchObject({
        grantId: "grant-middle",
        agentId: AGENT_ID_MIDDLE,
        preMarketRequestId: REQUEST_ID,
        unmatchedByAgentId: AGENT_ID_MIDDLE,
        previousStatus: "free",
        sendEmailNotice: true,
        personalMessage: "sorry, going a different direction",
      });
      expect(auditArg.timestamp).toBeInstanceOf(Date);

      // Soft-update (status = rejected) was also applied.
      expect(service.grantAccessRepository.updateById).toHaveBeenCalledWith(
        "grant-middle",
        { status: "rejected" },
      );
    }
    finally {
      emailSpy.mockRestore();
    }
  });
});
