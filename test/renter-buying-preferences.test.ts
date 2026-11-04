import { afterEach, describe, expect, it, vi } from "vitest";

import { BaseRepository } from "../src/modules/base/base.repository";
import { PreMarketService } from "../src/modules/pre-market/pre-market.service";
import { RenterRepository } from "../src/modules/renter/renter.repository";
import { TransactionHelper } from "../src/utils/transaction.utils";

const renterId = "665f1f77bcf86cd799439055";
const requestId = "665f1f77bcf86cd799439011";
const interest = (purchaseTimeline: string) => ({ buyerSpecialistNeeded: true, purchaseTimeline });
const clone = <T>(value: T): T => structuredClone(value);

function fixture() {
  let profile: any = {
    userId: renterId,
    email: "renter@example.invalid",
    registrationType: "agent_referral",
    questionnaire: {
      ...interest("0–3 months"),
      lookingToPurchase: true,
      renterSpecialistNeeded: true,
    },
  };
  let request: any = null;
  const session = {} as any;
  const repository = Object.create(RenterRepository.prototype) as any;
  repository.model = {
    findOneAndUpdate: vi.fn(async (_filter, update, options) => {
      expect(options.session).toBe(session);
      // Apply MongoDB's dotted $set behavior to the in-memory profile.
      for (const [key, value] of Object.entries(update.$set)) {
        if (key.startsWith("questionnaire.")) {
          profile.questionnaire[key.slice("questionnaire.".length)] = value;
        }
        else {
          profile[key] = value;
        }
      }
      return clone(profile);
    }),
  };
  repository.findRenterWithReferrer = vi.fn(async () => clone(profile));
  const updateProfile = vi.spyOn(repository, "updateProfile");
  const transactions = vi.spyOn(TransactionHelper, "withTransaction").mockImplementation(async (run) => {
    const previousProfile = clone(profile);
    const previousRequest = clone(request);
    try {
      return await run(session);
    }
    catch (error) {
      profile = previousProfile;
      request = previousRequest;
      throw error;
    }
  });
  const service = Object.create(PreMarketService.prototype) as any;
  Object.assign(service, {
    renterRepository: repository,
    blockedEmailService: { assertEmailNotBlocked: vi.fn().mockResolvedValue(undefined) },
    preMarketRepository: {
      countActiveByRenterId: vi.fn(async () => request && !request.isDeleted ? 1 : 0),
      create: vi.fn(async (data, suppliedSession) => {
        if (data.buyerInterest) expect(suppliedSession).toBe(session);
        request = clone({ ...data, _id: requestId });
        return clone(request);
      }),
      updateById: vi.fn(async (_id, data, suppliedSession) => {
        if (data.buyerInterest) expect(suppliedSession).toBe(session);
        request = { ...request, ...clone(data) };
        return clone(request);
      }),
      softDelete: vi.fn(async () => {
        request.isDeleted = true;
        return clone(request);
      }),
    },
    generateUniqueRequestId: vi.fn().mockResolvedValue("R-FIXTURE"),
    resolveRegisteredAgentIdFromRenter: vi.fn().mockResolvedValue("agent-1"),
    getRequestById: vi.fn(async () => clone(request)),
    sendNotifications: vi.fn().mockResolvedValue(undefined),
    createRenterNotification: vi.fn().mockResolvedValue(undefined),
    scheduleConsolidatedExcelRefresh: vi.fn(),
    buildChangedFieldsSummary: vi.fn().mockReturnValue({ summary: "", newValues: {} }),
    resetSearchConfirmationActivity: vi.fn((_old, values) => values),
    notifier: { notifyAgentsAboutUpdatedRequest: vi.fn().mockResolvedValue(undefined) },
    getMatchedAgentIdsForClosedAlert: vi.fn().mockResolvedValue([]),
    notifyAssociatedAgentsRequestClosed: vi.fn().mockResolvedValue(undefined),
    notifyRenterRequestClosed: vi.fn().mockResolvedValue(undefined),
    deleteGrantAccessRecords: vi.fn().mockResolvedValue(undefined),
  });
  return { service, repository, session, updateProfile, transactions, profile: () => clone(profile), request: () => clone(request) };
}

function payload(buyerInterest?: { buyerSpecialistNeeded: boolean; purchaseTimeline?: string }) {
  return {
    movingDateRange: { earliest: new Date("2028-01-01"), latest: new Date("2028-02-01") },
    priceRange: { min: 1000, max: 2000 },
    locations: [{ borough: "Manhattan", neighborhoods: ["Chelsea"] }],
    bathrooms: ["1"],
    ...(buyerInterest ? { buyerInterest } : {}),
  };
}

afterEach(() => vi.restoreAllMocks());

describe("latest buying preferences survive request deletion", () => {
  it("saves 12+ months from a new request and prefills the next one after deletion", async () => {
    const f = fixture();
    await f.service.createRequest(renterId, payload(interest(" 12+ months ")));
    await f.service.deleteRequest(renterId, requestId);
    expect(f.profile().questionnaire).toEqual({
      ...interest("12+ months"), lookingToPurchase: true, renterSpecialistNeeded: true,
    });
    const next = await f.service.createRequest(renterId, payload(f.profile().questionnaire));
    expect(next.buyerInterest).toEqual(interest("12+ months"));
  });

  it("uses the last request edit and leaves historical snapshots independent", async () => {
    const f = fixture();
    await f.service.createRequest(renterId, payload(interest("0–3 months")));
    await f.service.updateRequest(renterId, requestId, { buyerInterest: interest("12+ months") });
    await f.service.deleteRequest(renterId, requestId);
    expect(f.profile().questionnaire.purchaseTimeline).toBe("12+ months");
  });

  it("persists explicit opt-out and clears the previous timeline", async () => {
    const f = fixture();
    await f.service.createRequest(renterId, payload(interest("12+ months")));
    await f.service.updateRequest(renterId, requestId, {
      buyerInterest: { buyerSpecialistNeeded: false, purchaseTimeline: "0–3 months" },
    });
    await f.service.deleteRequest(renterId, requestId);
    expect(f.profile().questionnaire).toMatchObject({ buyerSpecialistNeeded: false, purchaseTimeline: "" });
  });

  it("does not change saved preferences when a legacy request omits buyer interest", async () => {
    const f = fixture();
    await f.service.createRequest(renterId, payload());
    expect(f.profile().questionnaire.purchaseTimeline).toBe("0–3 months");
    expect(f.transactions).not.toHaveBeenCalled();
    expect(f.updateProfile).not.toHaveBeenCalled();
  });

  it("does not let an unrelated edit restore a request's older timeline", async () => {
    const f = fixture();
    await f.service.createRequest(renterId, payload(interest("0–3 months")));
    await f.repository.updateProfile(renterId, { questionnaire: interest("12+ months") }, f.session);
    f.updateProfile.mockClear();
    await f.service.updateRequest(renterId, requestId, { preferences: ["Lots of Light"] });
    expect(f.profile().questionnaire.purchaseTimeline).toBe("12+ months");
    expect(f.request().buyerInterest.purchaseTimeline).toBe("0–3 months");
    expect(f.updateProfile).not.toHaveBeenCalled();
  });

  it("rejects an invalid checked timeline without changing either record", async () => {
    const f = fixture();
    await expect(f.service.createRequest(renterId, payload(interest("   ")))).rejects.toThrow("Purchase timeline is required");
    expect(f.profile().questionnaire.purchaseTimeline).toBe("0–3 months");
    expect(f.request()).toBeNull();
    expect(f.transactions).not.toHaveBeenCalled();
  });

  it("does not change defaults or notify anyone when request persistence fails", async () => {
    const f = fixture();
    f.service.preMarketRepository.create.mockRejectedValueOnce(new Error("write failed"));
    await expect(f.service.createRequest(renterId, payload(interest("12+ months")))).rejects.toThrow("write failed");
    expect(f.updateProfile).not.toHaveBeenCalled();
    expect(f.profile().questionnaire.purchaseTimeline).toBe("0–3 months");
    expect(f.service.sendNotifications).not.toHaveBeenCalled();
  });

  it("rolls back request creation when profile persistence fails", async () => {
    const f = fixture();
    f.repository.model.findOneAndUpdate.mockRejectedValueOnce(new Error("profile write failed"));
    await expect(f.service.createRequest(renterId, payload(interest("12+ months")))).rejects.toThrow("profile write failed");
    expect(f.request()).toBeNull();
    expect(f.profile().questionnaire.purchaseTimeline).toBe("0–3 months");
    expect(f.service.sendNotifications).not.toHaveBeenCalled();
  });
});

describe("transaction sessions reach both request writes", () => {
  it("creates a request with the MongoDB session", async () => {
    const document = { _id: requestId };
    const model = { create: vi.fn().mockResolvedValue([document]) };
    const repository = new BaseRepository(model as any);
    const session = {} as any;
    expect(await repository.create({} as any, session)).toBe(document);
    expect(model.create).toHaveBeenCalledWith([{}], { session });
  });

  it("updates a request with the same MongoDB session", async () => {
    const query = { exec: vi.fn().mockResolvedValue({ _id: requestId }) };
    const model = { findByIdAndUpdate: vi.fn().mockReturnValue(query) };
    const repository = new BaseRepository(model as any);
    const session = {} as any;
    await repository.updateById(requestId, {} as any, session);
    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(requestId, {}, { new: true, session });
  });
});
