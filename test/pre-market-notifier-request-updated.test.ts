// @vitest-environment node
// Use vi.hoisted so the mock factory can record sent emails and tests can
// inspect / reset the recorder.
type StubEmailCall = {
  to: string;
  agentName: string;
  cc?: string[];
};

const { sentEmails, sendMock } = vi.hoisted(() => {
  const sentEmails: StubEmailCall[] = [];
  const sendMock = vi.fn(async (_payload: StubEmailCall) => ({
    success: true,
  }));
  return { sentEmails, sendMock };
});

// Record calls into the hoisted `sentEmails` array by wrapping sendMock.
sendMock.mockImplementation(async (payload: StubEmailCall) => {
  sentEmails.push({
    to: payload.to,
    agentName: payload.agentName,
    ...(payload.cc ? { cc: payload.cc } : {}),
  });
  return { success: true };
});

vi.mock("@/services/email.service", () => ({
  get emailService() {
    return {
      sendPreMarketRequestUpdatedNotificationToAgent: sendMock,
    };
  },
}));

// Stub the env module so the suite doesn't depend on the runtime-only
// configuration of @/env.
vi.mock("@/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/env")>();
  return {
    ...actual,
    env: {
      ...actual.env,
      POSTMARK_SANDBOX_MODE: "true",
    },
  };
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import { PreMarketNotifier } from "../src/modules/pre-market/pre-market-notifier";

const stubRequest = {
  _id: "req-1",
  requestId: "REQ-001",
  renterId: "renter-1",
  scope: "All Market",
  visibility: "PRIVATE",
};

const stubRenter = {
  fullName: "Jane Renter",
  registrationType: "agent_referral",
  referredByAgentId: {
    _id: "registered-agent-user-1",
    fullName: "Registered Agent",
    email: "registered@example.com",
  },
};

const stubRegisteredAgentUser = {
  _id: "registered-agent-user-1",
  fullName: "Registered Agent",
  email: "registered@example.com",
};
const stubMatchedAgentA = {
  _id: "matched-agent-a",
  fullName: "Matched Agent A",
  email: "matched-a@example.com",
};
const stubMatchedAgentB = {
  _id: "matched-agent-b",
  fullName: "Matched Agent B",
  email: "matched-b@example.com",
};

const buildNotifier = (mocks: {
  matchedAccessRecords: Array<{ agentId: any; status: string }>;
  usersById: Record<string, any>;
  renter?: any;
}) => {
  const notifier = new PreMarketNotifier();
  const notifierAny = notifier as any;

  notifierAny.renterRepository = {
    findRenterWithReferrer: async () => mocks.renter ?? stubRenter,
  };
  notifierAny.userRepository = {
    findById: async (id: string) => mocks.usersById[id] ?? null,
  };
  notifierAny.grantAccessRepository = {
    findByPreMarketRequestId: async () => mocks.matchedAccessRecords,
  };

  return notifier;
};

describe("PreMarketNotifier.notifyAgentsAboutUpdatedRequest", () => {
  beforeEach(() => {
    sentEmails.length = 0;
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("sends ONE email with registered agent in `to` and matched agents in `cc`", async () => {
    const notifier = buildNotifier({
      matchedAccessRecords: [
        { agentId: stubMatchedAgentA._id, status: "free" },
        { agentId: stubMatchedAgentB._id, status: "paid" },
      ],
      usersById: {
        [stubMatchedAgentA._id]: stubMatchedAgentA,
        [stubMatchedAgentB._id]: stubMatchedAgentB,
      },
    });

    await notifier.notifyAgentsAboutUpdatedRequest(
      stubRequest as any,
      ["Market Scope"],
      ["All Market"],
      new Date("2026-08-15T12:00:00Z"),
    );

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0]).toEqual({
      to: "registered@example.com",
      agentName: "Registered Agent",
      cc: ["matched-a@example.com", "matched-b@example.com"],
    });
  });

  it("falls back to first matched agent in `to` when no registered agent exists", async () => {
    const renterWithoutReferrer = {
      fullName: "Jane Renter",
      registrationType: "self",
      referredByAgentId: null,
    };
    const notifier = buildNotifier({
      renter: renterWithoutReferrer,
      matchedAccessRecords: [
        { agentId: stubMatchedAgentA._id, status: "free" },
      ],
      usersById: {
        [stubMatchedAgentA._id]: stubMatchedAgentA,
      },
    });

    await notifier.notifyAgentsAboutUpdatedRequest(
      stubRequest as any,
      ["Market Scope"],
      ["All Market"],
      new Date("2026-08-15T12:00:00Z"),
    );

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0]).toEqual({
      to: "matched-a@example.com",
      agentName: "Matched Agent A",
      cc: undefined,
    });
  });

  it("does NOT include the registered agent in `cc` if they are also a matched agent", async () => {
    const notifier = buildNotifier({
      matchedAccessRecords: [
        // Registered agent is ALSO a matched agent.
        { agentId: stubRegisteredAgentUser._id, status: "free" },
        { agentId: stubMatchedAgentA._id, status: "free" },
      ],
      usersById: {
        [stubRegisteredAgentUser._id]: stubRegisteredAgentUser,
        [stubMatchedAgentA._id]: stubMatchedAgentA,
      },
    });

    await notifier.notifyAgentsAboutUpdatedRequest(
      stubRequest as any,
      ["Market Scope"],
      ["All Market"],
      new Date("2026-08-15T12:00:00Z"),
    );

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0]).toEqual({
      to: "registered@example.com",
      agentName: "Registered Agent",
      cc: ["matched-a@example.com"],
    });
  });

  it("sends no email when there are no matched agents and no registered agent", async () => {
    const renterWithoutReferrer = {
      fullName: "Jane Renter",
      registrationType: "self",
      referredByAgentId: null,
    };
    const notifier = buildNotifier({
      renter: renterWithoutReferrer,
      matchedAccessRecords: [],
      usersById: {},
    });

    await notifier.notifyAgentsAboutUpdatedRequest(
      stubRequest as any,
      ["Market Scope"],
      ["All Market"],
      new Date("2026-08-15T12:00:00Z"),
    );

    expect(sentEmails).toHaveLength(0);
  });
});
