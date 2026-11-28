import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { IEmailOptions, IEmailResponse, IEmailTransporter } from "../src/services/email.types.js";

import { SecondaryCopyOutbox, SecondaryCopyOutboxService } from "../src/services/secondary-copy-outbox.service.js";

const integration = process.env.SECTION5_LOCAL_REPLICA === "1" ? describe : describe.skip;

integration("secondary copy outbox on an isolated replica set", () => {
  const sent = vi.fn<(options: IEmailOptions) => Promise<IEmailResponse>>();
  const transport = { send: sent, verify: async () => true, close: async () => {}, isConnectionActive: () => true } satisfies IEmailTransporter;
  const service = new SecondaryCopyOutboxService(Buffer.alloc(32, 7), transport);
  const agent = new Types.ObjectId().toString();
  const options: IEmailOptions = { to: "primary@example.invalid", cc: "cc@example.invalid", bcc: "bcc@example.invalid", subject: "Synthetic", html: "private synthetic body", attachments: [{ filename: "x", content: Buffer.from("synthetic attachment") }] };
  const expiry = () => new Date(Date.now() + 60000);
  const response = (outcome: "accepted" | "failed" | "uncertain" | "suppressed"): IEmailResponse => ({ messageId: outcome === "accepted" ? "synthetic-id" : "", response: outcome, deliveryOutcome: outcome, retries: 0, timestamp: new Date() });

  beforeAll(async () => {
    await mongoose.connect("mongodb://127.0.0.1:29480/section5_secondary_synthetic?replicaSet=section5outbox", { serverSelectionTimeoutMS: 5000 });
    await SecondaryCopyOutbox.init();
    await SecondaryCopyOutbox.deleteMany({});
  });
  afterAll(async () => mongoose.disconnect());

  it("protects payloads, preserves the initial recipient and deduplicates the same event", async () => {
    const id = await service.prepare("request:1", agent, "TEST", "Copy@Example.invalid", options, expiry());
    expect(await service.prepare("request:1", agent, "TEST", "changed@example.invalid", options, expiry())).toBe(id);
    const raw = await SecondaryCopyOutbox.findById(id).select("+payload").lean();
    expect(JSON.stringify(raw)).not.toContain("private synthetic body");
    expect(JSON.stringify(raw)).not.toContain("copy@example.invalid");
    expect(await SecondaryCopyOutbox.countDocuments({ _id: id })).toBe(1);
    sent.mockResolvedValue(response("accepted"));
    await service.markPrimaryAccepted(id);
    await Promise.all([service.dispatch(id), service.dispatch(id)]);
    expect(sent).toHaveBeenCalledTimes(1);
    expect(sent.mock.calls[0][0]).toMatchObject({ to: "copy@example.invalid", deliveryPolicy: "secondary-copy-single-attempt" });
    expect(sent.mock.calls[0][0].cc).toBeUndefined();
    expect(sent.mock.calls[0][0].bcc).toBeUndefined();
    expect(sent.mock.calls[0][0].attachments?.[0].content).toEqual(Buffer.from("synthetic attachment"));
    expect(await SecondaryCopyOutbox.findById(id).lean()).toMatchObject({ state: "accepted", messageId: "synthetic-id", attemptCount: 1 });
  });

  it.each(["failed", "uncertain", "suppressed"] as const)("retains %s without automatic resend", async (outcome) => {
    sent.mockClear();
    sent.mockResolvedValue(response(outcome));
    const id = await service.prepare(`request:${outcome}`, agent, "TEST", "copy@example.invalid", options, expiry());
    await service.markPrimaryAccepted(id);
    await service.dispatch(id);
    await service.dispatch(id);
    expect(sent).toHaveBeenCalledTimes(1);
    expect(await SecondaryCopyOutbox.findById(id).lean()).toMatchObject({ state: outcome, attemptCount: 1 });
  });

  it("recovers only ready events and preserves interrupted claims", async () => {
    sent.mockClear();
    sent.mockResolvedValue(response("accepted"));
    const waiting = await service.prepare("request:waiting", agent, "TEST", "copy@example.invalid", options, expiry());
    const ready = await service.prepare("request:ready", agent, "TEST", "copy@example.invalid", options, expiry());
    const pending = await service.prepare("request:pending", agent, "TEST", "copy@example.invalid", options, expiry());
    await service.markPrimaryAccepted(ready);
    await SecondaryCopyOutbox.updateOne({ _id: pending }, { $set: { state: "pending", attemptCount: 1 } });
    await service.recoverReady();
    expect(sent).toHaveBeenCalledTimes(1);
    expect((await SecondaryCopyOutbox.findById(waiting).lean())?.state).toBe("waiting_primary");
    expect((await SecondaryCopyOutbox.findById(ready).lean())?.state).toBe("accepted");
    expect((await SecondaryCopyOutbox.findById(pending).lean())?.state).toBe("pending");
  });

  it("keeps different originating events separate and treats exceptions as uncertain", async () => {
    sent.mockClear();
    sent.mockRejectedValue(new Error("synthetic provider failure"));
    const first = await service.prepare("request:repeat-1", agent, "TEST", "copy@example.invalid", options, expiry());
    const second = await service.prepare("request:repeat-2", agent, "TEST", "copy@example.invalid", options, expiry());
    expect(first).not.toBe(second);
    await service.markPrimaryAccepted(first);
    await service.dispatch(first);
    expect((await SecondaryCopyOutbox.findById(first).lean())?.state).toBe("uncertain");
    expect((await SecondaryCopyOutbox.findById(second).lean())?.state).toBe("waiting_primary");
  });

  it("erases expired encrypted payloads while retaining review metadata", async () => {
    const id = await service.prepare("request:expiry", agent, "TEST", "copy@example.invalid", options, expiry());
    await SecondaryCopyOutbox.updateOne({ _id: id }, { $set: { expiresAt: new Date(0) } });
    await service.eraseExpiredPayloads();
    const record = await SecondaryCopyOutbox.findById(id).select("+payload").lean();
    expect(record?.state).toBe("review");
    expect(record?.payload).toBeUndefined();
  });
});
