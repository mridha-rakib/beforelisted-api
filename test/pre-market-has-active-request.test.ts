// @vitest-environment node
// Verifies the lightweight "has-active-request" helper that the frontend
// sign-in / homepage redirect uses to decide whether a renter should land
// on /renter/saved-requests or the marketing homepage.
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PreMarketService } from "../src/modules/pre-market/pre-market.service";

describe("PreMarketService.hasActiveRequestForRenter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when the renter has at least one currently active request", async () => {
    const service = new PreMarketService();
    const serviceAny = service as any;

    const countSpy = vi.fn().mockResolvedValue(1);
    serviceAny.preMarketRepository = {
      countActiveByRenterId: countSpy,
    };

    const result = await service.hasActiveRequestForRenter("renter-1");

    expect(result).toBe(true);
    expect(countSpy).toHaveBeenCalledWith("renter-1");
  });

  it("returns false when the renter has zero active requests", async () => {
    const service = new PreMarketService();
    const serviceAny = service as any;

    serviceAny.preMarketRepository = {
      countActiveByRenterId: vi.fn().mockResolvedValue(0),
    };

    const result = await service.hasActiveRequestForRenter("renter-2");

    expect(result).toBe(false);
  });

  it("propagates the repository error so the API surface stays honest", async () => {
    const service = new PreMarketService();
    const serviceAny = service as any;

    serviceAny.preMarketRepository = {
      countActiveByRenterId: vi
        .fn()
        .mockRejectedValue(new Error("db unavailable")),
    };

    await expect(
      service.hasActiveRequestForRenter("renter-3"),
    ).rejects.toThrow("db unavailable");
  });
});