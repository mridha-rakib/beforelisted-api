import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { EmailVerificationOTP } from "../src/modules/email-verification/email-verification.model.js";
import { EmailVerificationOTPRepository } from "../src/modules/email-verification/email-verification.repository.js";
import { RenterModel } from "../src/modules/renter/renter.model.js";
import { RenterRepository } from "../src/modules/renter/renter.repository.js";
import { User } from "../src/modules/user/user.model.js";
import { UserRepository } from "../src/modules/user/user.repository.js";
import { crmRegistrationEventId, CrmRegistrationOutbox, CrmRegistrationOutboxRepository } from "../src/services/crm-registration-outbox.service.js";

// Opt in only for the explicitly isolated loopback replica set. No environment URI is accepted.
const integration = process.env.SECTION5_LOCAL_REPLICA === "1" ? describe : describe.skip;

integration("CRM outbox repository on a local replica set", () => {
  const repo = new CrmRegistrationOutboxRepository();
  const agent = new Types.ObjectId();
  beforeAll(async () => {
    await mongoose.connect("mongodb://127.0.0.1:29480/section5_synthetic?replicaSet=section5outbox", { serverSelectionTimeoutMS: 5000 });
    await CrmRegistrationOutbox.init();
  });
  afterAll(async () => mongoose.disconnect());

  it("rolls back user, profile, OTP, referral counter and intent together", async () => {
    const users = new UserRepository();
    const renters = new RenterRepository();
    const otps = new EmailVerificationOTPRepository();
    const id = new Types.ObjectId();
    const referrer = await User.create({ email: `ref-${id}@example.invalid`, fullName: "Synthetic Agent", password: "synthetic-password", role: "Agent", totalReferrals: 0 });
    const session = await mongoose.startSession();
    await expect(session.withTransaction(async () => {
      await users.create({ _id: id, email: `renter-${id}@example.invalid`, fullName: "Riley Example", password: "synthetic-password", role: "Renter" } as never, session);
      await renters.createRenter({ userId: id, fullName: "Riley Example", email: `renter-${id}@example.invalid` } as never, session);
      await otps.createOTP({ userId: id.toString(), email: `renter-${id}@example.invalid`, userType: "Renter", code: "1234", expiresAt: new Date(Date.now() + 300000) }, session);
      await users.incrementReferralCount(referrer._id.toString(), session);
      await repo.createWaiting(id, referrer._id, session);
      throw new Error("synthetic rollback");
    })).rejects.toThrow("synthetic rollback");
    await session.endSession();
    expect(await User.findById(id)).toBeNull();
    expect(await RenterModel.findOne({ userId: id })).toBeNull();
    expect(await EmailVerificationOTP.findOne({ userId: id.toString() })).toBeNull();
    expect(await CrmRegistrationOutbox.findById(crmRegistrationEventId(id.toString()))).toBeNull();
    expect((await User.findById(referrer._id))?.totalReferrals).toBe(0);
  });

  it("commits session-aware registration records and counter together", async () => {
    const users = new UserRepository();
    const renters = new RenterRepository();
    const otps = new EmailVerificationOTPRepository();
    const id = new Types.ObjectId();
    const referrer = await User.create({ email: `commit-ref-${id}@example.invalid`, fullName: "Synthetic Agent", password: "synthetic-password", role: "Agent", totalReferrals: 0 });
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await users.create({ _id: id, email: `commit-${id}@example.invalid`, fullName: "Riley Example", password: "synthetic-password", role: "Renter" } as never, session);
      await renters.createRenter({ userId: id, fullName: "Riley Example", email: `commit-${id}@example.invalid` } as never, session);
      await otps.createOTP({ userId: id.toString(), email: `commit-${id}@example.invalid`, userType: "Renter", code: "1234", expiresAt: new Date(Date.now() + 300000) }, session);
      await users.incrementReferralCount(referrer._id.toString(), session);
      await repo.createWaiting(id, referrer._id, session);
    }, { writeConcern: { w: "majority" } });
    await session.endSession();
    expect(await User.findById(id)).not.toBeNull();
    expect(await RenterModel.findOne({ userId: id })).not.toBeNull();
    expect(await EmailVerificationOTP.findOne({ userId: id.toString() })).not.toBeNull();
    expect(await CrmRegistrationOutbox.findById(crmRegistrationEventId(id.toString()))).toMatchObject({ state: "waiting_verification" });
    expect((await User.findById(referrer._id))?.totalReferrals).toBe(1);
  });

  it("rolls back a waiting intent with its transaction", async () => {
    const renter = new Types.ObjectId();
    const session = await mongoose.startSession();
    await expect(session.withTransaction(async () => {
      await repo.createWaiting(renter, agent, session);
      throw new Error("synthetic rollback");
    })).rejects.toThrow("synthetic rollback");
    await session.endSession();
    expect(await CrmRegistrationOutbox.findById(crmRegistrationEventId(renter.toString())).lean()).toBeNull();
  });

  it("commits a unique intent and permits only one concurrent claim", async () => {
    const renter = new Types.ObjectId();
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await repo.createWaiting(renter, agent, session);
      expect(await repo.resolveEligibility(renter.toString(), "crm@example.invalid", session)).toBe(true);
    }, { writeConcern: { w: "majority" } });
    await session.endSession();
    const duplicate = await mongoose.startSession();
    await expect(duplicate.withTransaction(() => repo.createWaiting(renter, agent, duplicate))).rejects.toMatchObject({ code: 11000 });
    await duplicate.endSession();
    const claims = await Promise.all([repo.claim(renter.toString()), repo.claim(renter.toString())]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(claims.find(Boolean)).toMatchObject({ state: "pending", recipient: "crm@example.invalid", attemptCount: 1 });
    expect(await repo.recordOutcome(renter.toString(), "uncertain")).toBe(true);
    expect(await repo.claim(renter.toString())).toBeNull();
  });

  it("keeps a skipped event skipped when settings later change", async () => {
    const renter = new Types.ObjectId();
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await repo.createWaiting(renter, agent, session);
      expect(await repo.resolveEligibility(renter.toString(), null, session)).toBe(true);
    });
    await session.withTransaction(async () => {
      expect(await repo.resolveEligibility(renter.toString(), "later@example.invalid", session)).toBe(false);
    });
    await session.endSession();
    expect(await repo.claim(renter.toString())).toBeNull();
  });
});
