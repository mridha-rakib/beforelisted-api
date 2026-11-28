import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AgentProfile } from "../src/modules/agent/agent.model.js";
import { User } from "../src/modules/user/user.model.js";
import { EmailService } from "../src/services/email.service.js";
import { SecondaryCopyOutbox, SecondaryCopyOutboxService } from "../src/services/secondary-copy-outbox.service.js";

const integration = process.env.SECTION5_LOCAL_REPLICA === "1" ? describe : describe.skip;
integration("secondary copy application integration", () => {
  let agentId: string;
  let email: EmailService;
  const send = vi.fn();
  const key = Buffer.alloc(32, 8).toString("base64");
  beforeAll(async () => {
    process.env.SECONDARY_COPY_KEYS = JSON.stringify({ v1: key });
    process.env.SECONDARY_COPY_ACTIVE_KEY_VERSION = "v1";
    process.env.SECONDARY_COPY_IDENTITY_KEY = Buffer.alloc(32, 9).toString("base64");
    process.env.SECONDARY_COPY_RETENTION_HOURS = "24";
    await mongoose.connect(`mongodb://127.0.0.1:29480/section5_secondary_app_${process.pid}?replicaSet=section5outbox`, { serverSelectionTimeoutMS: 5000 });
    await Promise.all([User.init(), AgentProfile.init(), SecondaryCopyOutbox.init()]);
    await Promise.all([User.deleteMany({}), AgentProfile.deleteMany({}), SecondaryCopyOutbox.deleteMany({})]);
    const user = await User.create({ email: "agent@example.invalid", password: "synthetic-password", fullName: "Synthetic Agent", role: "Agent" });
    agentId = user.id;
    await AgentProfile.create({ userId: user._id, licenseNumber: "synthetic-license", brokerageName: "Synthetic", title: "Licensed Real Estate Salesperson", secondaryEmail: "copy@example.invalid", secondaryEmailIsCrm: false });
    email = new EmailService();
    (email as any).transporter = { send };
  });
  beforeEach(async () => {
    sentReset();
    await SecondaryCopyOutbox.deleteMany({});
    await AgentProfile.updateOne({ userId: agentId }, { $set: { secondaryEmail: "copy@example.invalid", secondaryEmailIsCrm: false } });
  });
  function sentReset() {
    send.mockReset().mockResolvedValue({ messageId: "primary-id", timestamp: new Date(), retries: 0 });
  }
  afterAll(async () => {
    await mongoose.disconnect();
    delete process.env.SECONDARY_COPY_KEYS;
    delete process.env.SECONDARY_COPY_ACTIVE_KEY_VERSION;
    delete process.env.SECONDARY_COPY_IDENTITY_KEY;
    delete process.env.SECONDARY_COPY_RETENTION_HOURS;
  });

  it("queues a welcome copy before primary and lets the worker send a separate envelope", async () => {
    send.mockImplementationOnce(async () => {
      expect(await SecondaryCopyOutbox.countDocuments({ state: "waiting_primary" })).toBe(1);
      return { messageId: "primary-id", timestamp: new Date(), retries: 0 };
    }).mockResolvedValueOnce({ messageId: "copy-id", deliveryOutcome: "accepted", timestamp: new Date(), retries: 0 });
    const result = await email.sendWelcomeEmail({ to: "agent@example.invalid", userName: "Synthetic Agent", userType: "Agent", loginLink: "https://example.invalid/login" });
    expect(result.success).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    const record = await SecondaryCopyOutbox.findOne().select("+payload").lean();
    expect(record?.state).toBe("ready");
    expect(JSON.stringify(record)).not.toContain("copy@example.invalid");
    await email.recoverSecondaryCopies();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][0]).toMatchObject({ to: "copy@example.invalid", deliveryPolicy: "secondary-copy-single-attempt" });
    expect(send.mock.calls[1][0].cc).toBeUndefined();
    expect(send.mock.calls[1][0].bcc).toBeUndefined();
    expect((await SecondaryCopyOutbox.findById(record!._id).lean())?.state).toBe("accepted");
  });

  it("excludes CRM mode and fails before primary if the key is missing", async () => {
    await AgentProfile.updateOne({ userId: agentId }, { $set: { secondaryEmailIsCrm: true } });
    expect((await email.sendWelcomeEmail({ to: "agent@example.invalid", userName: "Synthetic", userType: "Agent", loginLink: "https://example.invalid" })).success).toBe(true);
    expect(await SecondaryCopyOutbox.countDocuments()).toBe(0);
    await AgentProfile.updateOne({ userId: agentId }, { $set: { secondaryEmailIsCrm: false } });
    send.mockClear();
    delete process.env.SECONDARY_COPY_KEYS;
    expect((await email.sendWelcomeEmail({ to: "agent@example.invalid", userName: "Synthetic", userType: "Agent", loginLink: "https://example.invalid" })).success).toBe(false);
    expect(send).not.toHaveBeenCalled();
    process.env.SECONDARY_COPY_KEYS = JSON.stringify({ v1: key });
  });

  it("keeps a primary error reviewable and never sends the copy", async () => {
    send.mockResolvedValue({ messageId: "", error: new Error("synthetic"), timestamp: new Date(), retries: 0 });
    expect((await email.sendWelcomeEmail({ to: "agent@example.invalid", userName: "Synthetic", userType: "Agent", loginLink: "https://example.invalid" })).success).toBe(false);
    expect((await SecondaryCopyOutbox.findOne().lean())?.state).toBe("review");
    await email.recoverSecondaryCopies();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("does not release a copy when primary acceptance is uncertain", async () => {
    send.mockResolvedValue({ messageId: "null", deliveryOutcome: "uncertain", timestamp: new Date(), retries: 0 });
    await email.sendWelcomeEmail({ to: "agent@example.invalid", userName: "Synthetic", userType: "Agent", loginLink: "https://example.invalid" });
    expect((await SecondaryCopyOutbox.findOne().lean())?.state).toBe("review");
    await email.recoverSecondaryCopies();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("uses the saved deleted-agent snapshot and never blocks primary on secondary timeout", async () => {
    send.mockResolvedValueOnce({ messageId: "primary-id", timestamp: new Date(), retries: 0 }).mockResolvedValueOnce({ messageId: "", deliveryOutcome: "uncertain", timestamp: new Date(), retries: 0 });
    const result = await email.sendAgentAccountDeletedEmail({ to: "deleted@example.invalid", userName: "Synthetic", deletedAgentId: agentId, secondaryEmail: "copy@example.invalid" });
    expect(result.success).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    await email.recoverSecondaryCopies();
    await email.recoverSecondaryCopies();
    expect(send).toHaveBeenCalledTimes(2);
    expect((await SecondaryCopyOutbox.findOne().lean())?.state).toBe("uncertain");
  });

  it("creates a copy for each primary request email, including a repeated business event", async () => {
    const request = { to: "agent@example.invalid", agentName: "Synthetic", renterName: "Synthetic Renter", renterEmail: "renter@example.invalid", renterPhoneNumber: "5551234567", requestId: "synthetic-request-1", marketScope: "Upcoming", minPrice: "$1", maxPrice: "$2", earliestDate: "Soon", latestDate: "Later", bedrooms: "1", bathrooms: "1", location: "Synthetic", features: "None", preferencesByOrder: "None", submittedAt: "Today", cc: ["admin@example.invalid"] };
    expect((await email.sendRenterRequestConfirmationToAgent(request)).success).toBe(true);
    expect((await email.sendRenterRequestConfirmationToAgent(request)).success).toBe(true);
    expect(await SecondaryCopyOutbox.countDocuments()).toBe(2);
    expect((await email.sendRenterRequestConfirmationToAgent({ ...request, requestId: "synthetic-request-2" })).success).toBe(true);
    expect(await SecondaryCopyOutbox.countDocuments()).toBe(3);
    expect(send).toHaveBeenCalledTimes(3);
    send.mockResolvedValue({ messageId: "copy-id", deliveryOutcome: "accepted", timestamp: new Date(), retries: 0 });
    await email.recoverSecondaryCopies();
    expect(send).toHaveBeenCalledTimes(6);
    expect(await SecondaryCopyOutbox.countDocuments({ state: "accepted" })).toBe(3);
  });

  it("creates a copy for each actual renter-registration email", async () => {
    const registration = { to: "admin@example.invalid", renterName: "Synthetic Renter", renterPhone: "5551234567", renterEmail: "renter@example.invalid", registrationDate: "Today", registeredAgentName: "Synthetic Agent", registeredAgentBrokerage: "Synthetic", registeredAgentEmail: "agent@example.invalid", secondaryEventId: "renter-registration-verified:507f1f77bcf86cd799439011" };
    expect((await email.sendRenterRegistrationVerifiedAdminNotification(registration)).success).toBe(true);
    expect((await email.sendRenterRegistrationVerifiedAdminNotification(registration)).success).toBe(true);
    expect(await SecondaryCopyOutbox.countDocuments({ state: "ready" })).toBe(2);
    expect((await email.sendRenterRegistrationVerifiedAdminNotification({ ...registration, secondaryEventId: "renter-registration-verified:507f1f77bcf86cd799439012" })).success).toBe(true);
    expect(await SecondaryCopyOutbox.countDocuments({ state: "ready" })).toBe(3);
  });

  it("sends a separate copy even if the secondary address was in the primary envelope", async () => {
    const service = email as any;
    const result = await service.sendEmail({ to: "agent@example.invalid", cc: "copy@example.invalid", subject: "Synthetic", html: "Synthetic" }, "TEST", "agent@example.invalid");
    expect(result.success).toBe(true);
    expect(await SecondaryCopyOutbox.countDocuments({ state: "ready" })).toBe(1);
    send.mockResolvedValue({ messageId: "copy-id", deliveryOutcome: "accepted", timestamp: new Date(), retries: 0 });
    await email.recoverSecondaryCopies();
    expect(send.mock.calls[1][0].to).toBe("copy@example.invalid");
    expect(send.mock.calls[1][0].cc).toBeUndefined();
    expect(send.mock.calls[1][0].bcc).toBeUndefined();
  });

  it("preserves distinct agent identities when agents share a secondary address", async () => {
    const second = await User.create({ email: "agent2@example.invalid", password: "synthetic-password", fullName: "Second Agent", role: "Agent" });
    await AgentProfile.create({ userId: second._id, licenseNumber: "synthetic-license-two", brokerageName: "Synthetic", title: "Licensed Real Estate Salesperson", secondaryEmail: "copy@example.invalid", secondaryEmailIsCrm: false });
    try {
      const service = email as any;
      const result = await service.sendEmail({ to: "agent@example.invalid", cc: "agent2@example.invalid", bcc: "private@example.invalid", subject: "Synthetic", html: "Synthetic", secondaryEventId: "event:shared" }, "TEST", "agent@example.invalid");
      expect(result.success).toBe(true);
      expect(await SecondaryCopyOutbox.countDocuments({ state: "ready" })).toBe(2);
      send.mockResolvedValue({ messageId: "copy-id", deliveryOutcome: "accepted", timestamp: new Date(), retries: 0 });
      await email.recoverSecondaryCopies();
      expect(send).toHaveBeenCalledTimes(3);
      for (const call of send.mock.calls.slice(1)) {
        expect(call[0].to).toBe("copy@example.invalid");
        expect(call[0].cc).toBeUndefined();
        expect(call[0].bcc).toBeUndefined();
      }
    }
    finally {
      await AgentProfile.deleteOne({ userId: second._id });
      await User.deleteOne({ _id: second._id });
    }
  });

  it("leaves the intent reviewable if primary response is lost", async () => {
    send.mockRejectedValue(new Error("synthetic timeout"));
    expect((await email.sendWelcomeEmail({ to: "agent@example.invalid", userName: "Synthetic", userType: "Agent", loginLink: "https://example.invalid" })).success).toBe(false);
    expect((await SecondaryCopyOutbox.findOne().lean())?.state).toBe("waiting_primary");
    await email.recoverSecondaryCopies();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("preserves primary success if the post-acceptance write fails", async () => {
    const mark = vi.spyOn(SecondaryCopyOutboxService.prototype, "markPrimaryAccepted").mockRejectedValue(new Error("synthetic write failure"));
    try {
      expect((await email.sendWelcomeEmail({ to: "agent@example.invalid", userName: "Synthetic", userType: "Agent", loginLink: "https://example.invalid" })).success).toBe(true);
      expect((await SecondaryCopyOutbox.findOne().lean())?.state).toBe("waiting_primary");
      await email.recoverSecondaryCopies();
      expect(send).toHaveBeenCalledTimes(1);
    }
    finally { mark.mockRestore(); }
  });

  it("does not call the provider when the durable intent cannot be saved", async () => {
    const prepare = vi.spyOn(SecondaryCopyOutboxService.prototype, "prepare").mockRejectedValue(new Error("synthetic storage failure"));
    try {
      expect((await email.sendWelcomeEmail({ to: "agent@example.invalid", userName: "Synthetic", userType: "Agent", loginLink: "https://example.invalid" })).success).toBe(false);
      expect(send).not.toHaveBeenCalled();
    }
    finally { prepare.mockRestore(); }
  });

  it("decrypts older ready payloads after a key rotation", async () => {
    expect((await email.sendWelcomeEmail({ to: "agent@example.invalid", userName: "Synthetic", userType: "Agent", loginLink: "https://example.invalid" })).success).toBe(true);
    process.env.SECONDARY_COPY_KEYS = JSON.stringify({ v1: key, v2: Buffer.alloc(32, 10).toString("base64") });
    process.env.SECONDARY_COPY_ACTIVE_KEY_VERSION = "v2";
    try {
      send.mockResolvedValue({ messageId: "copy-id", deliveryOutcome: "accepted", timestamp: new Date(), retries: 0 });
      await email.recoverSecondaryCopies();
      expect((await SecondaryCopyOutbox.findOne().lean())?.state).toBe("accepted");
    }
    finally {
      process.env.SECONDARY_COPY_KEYS = JSON.stringify({ v1: key });
      process.env.SECONDARY_COPY_ACTIVE_KEY_VERSION = "v1";
    }
  });

  it("keeps a claim pending if the secondary outcome write fails", async () => {
    expect((await email.sendWelcomeEmail({ to: "agent@example.invalid", userName: "Synthetic", userType: "Agent", loginLink: "https://example.invalid" })).success).toBe(true);
    send.mockResolvedValue({ messageId: "copy-id", deliveryOutcome: "accepted", timestamp: new Date(), retries: 0 });
    const original = SecondaryCopyOutbox.updateOne.bind(SecondaryCopyOutbox);
    const write = vi.spyOn(SecondaryCopyOutbox, "updateOne").mockImplementation(((filter: any, ...args: any[]) => {
      if (filter.state === "pending")
        throw new Error("synthetic outcome write failure");
      return original(filter, ...args as [any]);
    }) as any);
    try {
      await expect(email.recoverSecondaryCopies()).rejects.toThrow("synthetic outcome write failure");
      expect((await SecondaryCopyOutbox.findOne().lean())?.state).toBe("pending");
      expect(send).toHaveBeenCalledTimes(2);
    }
    finally { write.mockRestore(); }
    await email.recoverSecondaryCopies();
    expect(send).toHaveBeenCalledTimes(2);
  });
});
