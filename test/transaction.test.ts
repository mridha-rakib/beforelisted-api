import mongoose from "mongoose";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TransactionHelper } from "../src/utils/transaction.utils";

afterEach(() => vi.restoreAllMocks());

describe("TransactionHelper", () => {
  it("uses the driver's transaction helper and always closes the session", async () => {
    const session = {
      withTransaction: vi.fn(async run => run()),
      endSession: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(mongoose, "startSession").mockResolvedValue(session as any);
    const callback = vi.fn().mockResolvedValue("saved");
    await expect(TransactionHelper.withTransaction(callback)).resolves.toBe("saved");
    expect(session.withTransaction).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(session);
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it("propagates persistence failure and still closes the session", async () => {
    const session = {
      withTransaction: vi.fn(async run => run()),
      endSession: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(mongoose, "startSession").mockResolvedValue(session as any);
    await expect(TransactionHelper.withTransaction(async () => {
      throw new Error("write failed");
    })).rejects.toThrow("write failed");
    expect(session.endSession).toHaveBeenCalledOnce();
  });
});
