import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { AgentProfile } from "../src/modules/agent/agent.model.js";
import { AuthService } from "../src/modules/auth/auth.service.js";
import { BlockedEmailService } from "../src/modules/blocked-email/blocked-email.service.js";
import { EmailVerificationOTP } from "../src/modules/email-verification/email-verification.model.js";
import { EmailVerificationService } from "../src/modules/email-verification/email-verification.service.js";
import { RenterModel } from "../src/modules/renter/renter.model.js";
import { RenterService } from "../src/modules/renter/renter.service.js";
import { User } from "../src/modules/user/user.model.js";
import { crmRegistrationEventId, CrmRegistrationOutbox, CrmRegistrationOutboxRepository } from "../src/services/crm-registration-outbox.service.js";
import { EmailService } from "../src/services/email.service.js";

const integration = process.env.SECTION5_LOCAL_REPLICA === "1" ? describe : describe.skip;
integration("transactional registration and verification application paths", () => {
  const email = `agent-renter-${Date.now()}@example.invalid`;
  const referralCode = `AGT-${Math.random().toString(36).slice(2, 10).toUpperCase().padEnd(8, "0")}`;
  let agentId: string;
  let adminId: string;
  let adminRenterId: string;
  let otpDelivered = false;
  const actualDispatch = EmailService.prototype.dispatchCrmOutbox;
  const actualRecovery = EmailService.prototype.dispatchReadyCrmOutbox;
  beforeAll(async () => {
    await mongoose.connect(`mongodb://127.0.0.1:29480/section5_app_${process.pid}?replicaSet=section5outbox`, { serverSelectionTimeoutMS: 8000 });
    await Promise.all([User.init(), AgentProfile.init(), RenterModel.init(), CrmRegistrationOutbox.init(), EmailVerificationOTP.init()]);
    const agent = await User.create({ email: `agent-${Date.now()}@example.invalid`, password: "synthetic-password", fullName: "Synthetic Agent", role: "Agent", accountStatus: "active", emailVerified: true, referralCode });
    agentId = agent._id.toString();
    const admin = await User.create({ email: `admin-${Date.now()}@example.invalid`, password: "synthetic-password", fullName: "Synthetic Admin", role: "Admin", accountStatus: "active", emailVerified: true });
    adminId = admin._id.toString();
    await AgentProfile.create({ userId: agent._id, licenseNumber: `license-${Date.now()}`, brokerageName: "Synthetic", title: "Licensed Real Estate Salesperson", isActive: true, secondaryEmail: "crm@example.invalid", secondaryEmailIsCrm: true });
    vi.spyOn(BlockedEmailService.prototype, "assertEmailNotBlocked").mockResolvedValue(undefined);
    vi.spyOn(EmailService.prototype, "sendEmailVerification").mockImplementation(async (data: any) => {
      const user = await User.findOne({ email: data.to });
      expect(user).not.toBeNull();
      expect(await RenterModel.findOne({ userId: user!._id })).not.toBeNull();
      expect(await EmailVerificationOTP.findOne({ userId: user!._id.toString() })).not.toBeNull();
      expect(await CrmRegistrationOutbox.findById(crmRegistrationEventId(user!._id.toString()))).toMatchObject({ state: "waiting_verification" });
      otpDelivered = true;
      return { success: true } as never;
    });
    vi.spyOn(EmailService.prototype, "dispatchCrmOutbox").mockResolvedValue(undefined);
    vi.spyOn(EmailService.prototype, "sendAdminReferralEmail").mockResolvedValue({ success: false } as never);
    vi.spyOn(EmailService.prototype, "sendWelcomeEmail").mockResolvedValue({ success: true } as never);
    vi.spyOn(EmailService.prototype, "sendRenterRegistrationVerifiedAdminNotification").mockResolvedValue({ success: true } as never);
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    await mongoose.disconnect();
  });
  it("commits user, OTP, renter, event and referral before sending OTP, then verifies and snapshots CRM", async () => {
    const service = new RenterService() as any;
    service.updateRenterConsolidatedExcel = vi.fn().mockResolvedValue(undefined);
    service.schedulePreMarketConsolidatedExcelRefresh = vi.fn();
    const result = await service.registerRenter({ email, fullName: "Riley De Example", phoneNumber: "5551234567", password: "synthetic-password", referralCode });
    const user = await User.findOne({ email });
    expect(result.registrationType).toBe("agent_referral");
    expect(otpDelivered).toBe(true);
    expect((await User.findById(agentId))?.totalReferrals).toBe(1);
    const otp = await EmailVerificationOTP.findOne({ userId: user!._id.toString(), verified: false });
    const auth = new AuthService();
    await auth.verifyEmail({ email, code: otp!.code });
    expect((await User.findById(user!._id))?.emailVerified).toBe(true);
    expect(await CrmRegistrationOutbox.findById(crmRegistrationEventId(user!._id.toString())).select("+recipient")).toMatchObject({ state: "ready", recipient: "crm@example.invalid" });
    await AgentProfile.updateOne({ userId: agentId }, { $set: { secondaryEmail: "new@example.invalid" } });
    const send = vi.fn().mockResolvedValue({ deliveryOutcome: "accepted", messageId: "provider-synthetic" });
    const dispatcher = Object.create(EmailService.prototype) as any;
    dispatcher.transporter = { send };
    await Promise.all([actualDispatch.call(dispatcher, user!._id.toString()), actualDispatch.call(dispatcher, user!._id.toString())]);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0]).toMatchObject({ to: "crm@example.invalid", subject: "New Renter Registration | BeforeListed", html: "", text: `First Name: Riley\nLast Name: De Example\nEmail: ${email}\nPhone: 5551234567` });
    expect(send.mock.calls[0][0].cc).toBeUndefined();
    expect(await CrmRegistrationOutbox.findById(crmRegistrationEventId(user!._id.toString()))).toMatchObject({ state: "accepted", messageId: "provider-synthetic" });
    await AgentProfile.updateOne({ userId: agentId }, { $set: { secondaryEmail: "crm@example.invalid" } });
  });
  it("rolls back agent user, OTP, profile, outbox and referral after profile creation fails", async () => {
    const failedEmail = `agent-rollback-${Date.now()}@example.invalid`;
    const before = (await User.findById(agentId))!.totalReferrals;
    const service = new RenterService() as any;
    vi.spyOn(service.repository, "createRenter").mockRejectedValue(new Error("synthetic profile failure"));
    await expect(service.registerRenter({ email: failedEmail, fullName: "Riley Example", phoneNumber: "5551234567", password: "synthetic-password", referralCode })).rejects.toThrow("synthetic profile failure");
    expect(await User.findOne({ email: failedEmail })).toBeNull();
    expect(await EmailVerificationOTP.findOne({ email: failedEmail })).toBeNull();
    expect(await RenterModel.findOne({ email: failedEmail })).toBeNull();
    expect((await User.findById(agentId))?.totalReferrals).toBe(before);
  });

  it("commits active admin referral and ready snapshot with one referral increment", async () => {
    const adminEmail = `admin-renter-${Date.now()}@example.invalid`;
    const service = new RenterService() as any;
    service.validateAndGetAdminFromReferralCode = vi.fn().mockResolvedValue(adminId);
    service.getDefaultAssignedAgentId = vi.fn().mockResolvedValue(agentId);
    service.sendMovingDiscountCodesEmailForRenter = vi.fn();
    service.updateRenterConsolidatedExcel = vi.fn().mockResolvedValue(undefined);
    service.schedulePreMarketConsolidatedExcelRefresh = vi.fn();
    const before = (await User.findById(adminId))!.totalReferrals;
    const result = await service.registerRenter({ email: adminEmail, fullName: "Riley Example", phoneNumber: "5551234567", referralCode: "ADM-TEST1234" });
    expect(result.registrationType).toBe("admin_referral");
    const user = await User.findOne({ email: adminEmail });
    expect(user).toMatchObject({ accountStatus: "active", emailVerified: true });
    adminRenterId = user!._id.toString();
    expect(await CrmRegistrationOutbox.findById(crmRegistrationEventId(user!._id.toString())).select("+recipient")).toMatchObject({ state: "ready", recipient: "crm@example.invalid" });
    expect((await User.findById(adminId))?.totalReferrals).toBe(before + 1);
  });

  it("rolls back admin user and referral counter if the profile write fails", async () => {
    const failedEmail = `admin-rollback-${Date.now()}@example.invalid`;
    const service = new RenterService() as any;
    service.validateAndGetAdminFromReferralCode = vi.fn().mockResolvedValue(adminId);
    service.getDefaultAssignedAgentId = vi.fn().mockResolvedValue(agentId);
    vi.spyOn(service.repository, "createRenter").mockRejectedValue(new Error("synthetic profile failure"));
    const before = (await User.findById(adminId))!.totalReferrals;
    await expect(service.registerRenter({ email: failedEmail, fullName: "Riley Example", phoneNumber: "5551234567", referralCode: "ADM-TEST1234" })).rejects.toThrow("synthetic profile failure");
    expect(await User.findOne({ email: failedEmail })).toBeNull();
    expect(await RenterModel.findOne({ email: failedEmail })).toBeNull();
    expect((await User.findById(adminId))?.totalReferrals).toBe(before);
  });
  it.each([false, true])("skips registration when the agent secondary is not CRM or missing", async (isCrm) => {
    await AgentProfile.updateOne({ userId: agentId }, { $set: { secondaryEmailIsCrm: isCrm, secondaryEmail: isCrm ? "" : "copy@example.invalid" } });
    const renterEmail = `skip-${isCrm}-${Date.now()}@example.invalid`;
    const service = new RenterService() as any;
    service.updateRenterConsolidatedExcel = vi.fn().mockResolvedValue(undefined);
    service.schedulePreMarketConsolidatedExcelRefresh = vi.fn();
    await service.registerRenter({ email: renterEmail, fullName: "Riley Example", phoneNumber: "5551234567", password: "synthetic-password", referralCode });
    const user = await User.findOne({ email: renterEmail });
    const otp = await EmailVerificationOTP.findOne({ userId: user!._id.toString(), verified: false });
    await new AuthService().verifyEmail({ email: renterEmail, code: otp!.code });
    const id = crmRegistrationEventId(user!._id.toString());
    expect(await CrmRegistrationOutbox.findById(id)).toMatchObject({ state: "skipped" });
    await AgentProfile.updateOne({ userId: agentId }, { $set: { secondaryEmailIsCrm: true, secondaryEmail: "crm@example.invalid" } });
    const send = vi.fn();
    const dispatcher = Object.create(EmailService.prototype) as any;
    dispatcher.transporter = { send };
    await actualDispatch.call(dispatcher, user!._id.toString());
    expect(send).not.toHaveBeenCalled();
    expect(await CrmRegistrationOutbox.findById(id)).toMatchObject({ state: "skipped" });
  });
  it("rolls back OTP and user activation if event eligibility cannot be saved", async () => {
    const renterEmail = `verify-rollback-${Date.now()}@example.invalid`;
    const service = new RenterService() as any;
    service.updateRenterConsolidatedExcel = vi.fn().mockResolvedValue(undefined);
    service.schedulePreMarketConsolidatedExcelRefresh = vi.fn();
    await service.registerRenter({ email: renterEmail, fullName: "Riley Example", phoneNumber: "5551234567", password: "synthetic-password", referralCode });
    const user = await User.findOne({ email: renterEmail });
    const otp = await EmailVerificationOTP.findOne({ userId: user!._id.toString(), verified: false });
    const fail = vi.spyOn(CrmRegistrationOutboxRepository.prototype, "resolveEligibility").mockRejectedValue(new Error("synthetic transition failure"));
    await expect(new AuthService().verifyEmail({ email: renterEmail, code: otp!.code })).rejects.toThrow("synthetic transition failure");
    fail.mockRestore();
    expect((await User.findById(user!._id))?.emailVerified).toBe(false);
    expect((await EmailVerificationOTP.findById(otp!._id))?.verified).toBe(false);
    expect(await CrmRegistrationOutbox.findById(crmRegistrationEventId(user!._id.toString()))).toMatchObject({ state: "waiting_verification" });
    await new AuthService().verifyEmail({ email: renterEmail, code: otp!.code });
    expect(await CrmRegistrationOutbox.findById(crmRegistrationEventId(user!._id.toString()))).toMatchObject({ state: "ready" });
    await expect(new AuthService().verifyEmail({ email: renterEmail, code: otp!.code })).rejects.toThrow();
    expect(await CrmRegistrationOutbox.countDocuments({ renterUserId: user!._id })).toBe(1);
  });

  it("records uncertain provider outcomes without a retry", async () => {
    const ready = await CrmRegistrationOutbox.findOne({ state: "ready", renterUserId: { $ne: new mongoose.Types.ObjectId(adminRenterId) } }).lean();
    expect(ready).not.toBeNull();
    const send = vi.fn().mockResolvedValue({ deliveryOutcome: "uncertain", messageId: "" });
    const dispatcher = Object.create(EmailService.prototype) as any;
    dispatcher.transporter = { send };
    await actualDispatch.call(dispatcher, ready!.renterUserId.toString());
    await actualDispatch.call(dispatcher, ready!.renterUserId.toString());
    expect(send).toHaveBeenCalledOnce();
    expect(await CrmRegistrationOutbox.findById(ready!._id)).toMatchObject({ state: "uncertain", attemptCount: 1, errorCategory: "delivery_unknown" });
  });

  it("keeps a claim pending when outcome persistence fails and never resends", async () => {
    const ready = await CrmRegistrationOutbox.findById(crmRegistrationEventId(adminRenterId)).lean();
    expect(ready).not.toBeNull();
    const send = vi.fn().mockResolvedValue({ deliveryOutcome: "accepted", messageId: "provider-synthetic" });
    const fail = vi.spyOn(CrmRegistrationOutboxRepository.prototype, "recordOutcome").mockRejectedValue(new Error("synthetic failure"));
    const dispatcher = Object.create(EmailService.prototype) as any;
    dispatcher.transporter = { send };
    await actualDispatch.call(dispatcher, ready!.renterUserId.toString());
    fail.mockRestore();
    await actualDispatch.call(dispatcher, ready!.renterUserId.toString());
    expect(send).toHaveBeenCalledOnce();
    expect(await CrmRegistrationOutbox.findById(ready!._id)).toMatchObject({ state: "pending", attemptCount: 1 });
  });
  it("recovers a committed ready event after request dispatch is interrupted", async () => {
    const renter = await User.create({ email: `recovery-${Date.now()}@example.invalid`, password: "synthetic-password", fullName: "Riley Example", phoneNumber: "5551234567", role: "Renter", accountStatus: "active", emailVerified: true });
    const repository = new CrmRegistrationOutboxRepository();
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await repository.createWaiting(renter._id, new mongoose.Types.ObjectId(agentId), session);
      await repository.resolveEligibility(renter._id.toString(), "crm@example.invalid", session);
    });
    await session.endSession();
    const send = vi.fn().mockResolvedValue({ deliveryOutcome: "suppressed", messageId: "" });
    const dispatcher = Object.create(EmailService.prototype) as any;
    dispatcher.transporter = { send };
    dispatcher.dispatchCrmOutbox = (id: string) => actualDispatch.call(dispatcher, id);
    await actualRecovery.call(dispatcher);
    expect(await CrmRegistrationOutbox.findById(crmRegistrationEventId(renter._id.toString()))).toMatchObject({ state: "suppressed", attemptCount: 1 });
    const count = send.mock.calls.length;
    await actualRecovery.call(dispatcher);
    expect(send).toHaveBeenCalledTimes(count);
  });
  it("commits at most one registration under concurrent duplicate requests", async () => {
    const duplicateEmail = `duplicate-${Date.now()}@example.invalid`;
    const before = (await User.findById(agentId))!.totalReferrals;
    const first = new RenterService() as any;
    const second = new RenterService() as any;
    for (const service of [first, second]) {
      service.updateRenterConsolidatedExcel = vi.fn().mockResolvedValue(undefined);
      service.schedulePreMarketConsolidatedExcelRefresh = vi.fn();
    }
    const request = { email: duplicateEmail, fullName: "Riley Example", phoneNumber: "5551234567", password: "synthetic-password", referralCode };
    const results = await Promise.allSettled([first.registerRenter(request), second.registerRenter(request)]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(await User.countDocuments({ email: duplicateEmail })).toBe(1);
    const user = await User.findOne({ email: duplicateEmail });
    expect(await RenterModel.countDocuments({ userId: user!._id })).toBe(1);
    expect(await CrmRegistrationOutbox.countDocuments({ renterUserId: user!._id })).toBe(1);
    expect((await User.findById(agentId))?.totalReferrals).toBe(before + 1);
  });

  it("keeps a claim pending if the provider call is interrupted", async () => {
    const renter = await User.create({ email: `interrupted-${Date.now()}@example.invalid`, password: "synthetic-password", fullName: "Riley Example", phoneNumber: "5551234567", role: "Renter", accountStatus: "active", emailVerified: true });
    const repository = new CrmRegistrationOutboxRepository();
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await repository.createWaiting(renter._id, new mongoose.Types.ObjectId(agentId), session);
      await repository.resolveEligibility(renter._id.toString(), "crm@example.invalid", session);
    });
    await session.endSession();
    const send = vi.fn().mockRejectedValue(new Error("synthetic crash"));
    const dispatcher = Object.create(EmailService.prototype) as any;
    dispatcher.transporter = { send };
    await actualDispatch.call(dispatcher, renter._id.toString());
    await actualDispatch.call(dispatcher, renter._id.toString());
    expect(send).toHaveBeenCalledOnce();
    expect(await CrmRegistrationOutbox.findById(crmRegistrationEventId(renter._id.toString()))).toMatchObject({ state: "pending", attemptCount: 1 });
  });
  it.each([false, true])("skips admin referral CRM delivery for disabled or missing secondary", async (isCrm) => {
    await AgentProfile.updateOne({ userId: agentId }, { $set: { secondaryEmailIsCrm: isCrm, secondaryEmail: isCrm ? "" : "copy@example.invalid" } });
    const renterEmail = `admin-skip-${isCrm}-${Date.now()}@example.invalid`;
    const service = new RenterService() as any;
    service.validateAndGetAdminFromReferralCode = vi.fn().mockResolvedValue(adminId);
    service.getDefaultAssignedAgentId = vi.fn().mockResolvedValue(agentId);
    service.sendMovingDiscountCodesEmailForRenter = vi.fn();
    service.updateRenterConsolidatedExcel = vi.fn().mockResolvedValue(undefined);
    service.schedulePreMarketConsolidatedExcelRefresh = vi.fn();
    await service.registerRenter({ email: renterEmail, fullName: "Riley Example", phoneNumber: "5551234567", referralCode: "ADM-TEST1234" });
    const user = await User.findOne({ email: renterEmail });
    expect(await CrmRegistrationOutbox.findById(crmRegistrationEventId(user!._id.toString()))).toMatchObject({ state: "skipped" });
    await AgentProfile.updateOne({ userId: agentId }, { $set: { secondaryEmailIsCrm: true, secondaryEmail: "crm@example.invalid" } });
    const dispatcher = Object.create(EmailService.prototype) as any;
    dispatcher.transporter = { send: vi.fn() };
    await actualDispatch.call(dispatcher, user!._id.toString());
    expect(dispatcher.transporter.send).not.toHaveBeenCalled();
  });
  it("recovers an admin registration left ready after the request ended", async () => {
    await AgentProfile.updateOne({ userId: agentId }, { $set: { secondaryEmailIsCrm: true, secondaryEmail: "recovery@example.invalid" } });
    const renterEmail = `admin-recover-${Date.now()}@example.invalid`;
    const service = new RenterService() as any;
    service.validateAndGetAdminFromReferralCode = vi.fn().mockResolvedValue(adminId);
    service.getDefaultAssignedAgentId = vi.fn().mockResolvedValue(agentId);
    service.sendMovingDiscountCodesEmailForRenter = vi.fn();
    service.updateRenterConsolidatedExcel = vi.fn().mockResolvedValue(undefined);
    service.schedulePreMarketConsolidatedExcelRefresh = vi.fn();
    await service.registerRenter({ email: renterEmail, fullName: "Riley Example", phoneNumber: "5551234567", referralCode: "ADM-TEST1234" });
    const user = await User.findOne({ email: renterEmail });
    expect(await CrmRegistrationOutbox.findById(crmRegistrationEventId(user!._id.toString()))).toMatchObject({ state: "ready" });
    await AgentProfile.updateOne({ userId: agentId }, { $set: { secondaryEmail: "changed@example.invalid" } });
    const send = vi.fn().mockResolvedValue({ deliveryOutcome: "accepted", messageId: "synthetic-provider" });
    const dispatcher = Object.create(EmailService.prototype) as any;
    dispatcher.transporter = { send };
    dispatcher.dispatchCrmOutbox = (id: string) => actualDispatch.call(dispatcher, id);
    await actualRecovery.call(dispatcher);
    expect(send.mock.calls.filter(([options]) => options.to === "recovery@example.invalid")).toHaveLength(1);
    expect(await CrmRegistrationOutbox.findById(crmRegistrationEventId(user!._id.toString()))).toMatchObject({ state: "accepted", messageId: "synthetic-provider" });
    await AgentProfile.updateOne({ userId: agentId }, { $set: { secondaryEmail: "crm@example.invalid" } });
  });
  it.each(["agent", "admin"])("rolls back %s signup when the outbox write fails", async (kind) => {
    const renterEmail = `outbox-rollback-${kind}-${Date.now()}@example.invalid`;
    const service = new RenterService() as any;
    service.validateAndGetAdminFromReferralCode = vi.fn().mockResolvedValue(adminId);
    service.getDefaultAssignedAgentId = vi.fn().mockResolvedValue(agentId);
    const failure = vi.spyOn(CrmRegistrationOutboxRepository.prototype, "createWaiting").mockRejectedValue(new Error("synthetic outbox failure"));
    const referrerId = kind === "agent" ? agentId : adminId;
    const before = (await User.findById(referrerId))!.totalReferrals;
    const request = { email: renterEmail, fullName: "Riley Example", phoneNumber: "5551234567", ...(kind === "agent" ? { password: "synthetic-password", referralCode } : { referralCode: "ADM-TEST1234" }) };
    await expect(service.registerRenter(request)).rejects.toThrow("synthetic outbox failure");
    failure.mockRestore();
    expect(await User.findOne({ email: renterEmail })).toBeNull();
    expect(await RenterModel.findOne({ email: renterEmail })).toBeNull();
    expect(await EmailVerificationOTP.findOne({ email: renterEmail })).toBeNull();
    expect((await User.findById(referrerId))?.totalReferrals).toBe(before);
  });

  it("snapshots CRM settings at verification, not at initial signup", async () => {
    await AgentProfile.updateOne({ userId: agentId }, { $set: { secondaryEmailIsCrm: true, secondaryEmail: "signup@example.invalid" } });
    const renterEmail = `verify-snapshot-${Date.now()}@example.invalid`;
    const service = new RenterService() as any;
    service.updateRenterConsolidatedExcel = vi.fn().mockResolvedValue(undefined);
    service.schedulePreMarketConsolidatedExcelRefresh = vi.fn();
    await service.registerRenter({ email: renterEmail, fullName: "Riley Example", phoneNumber: "5551234567", password: "synthetic-password", referralCode });
    const user = await User.findOne({ email: renterEmail });
    await AgentProfile.updateOne({ userId: agentId }, { $set: { secondaryEmail: "verification@example.invalid" } });
    const otp = await EmailVerificationOTP.findOne({ userId: user!._id.toString(), verified: false });
    await new AuthService().verifyEmail({ email: renterEmail, code: otp!.code });
    expect(await CrmRegistrationOutbox.findById(crmRegistrationEventId(user!._id.toString())).select("+recipient")).toMatchObject({ state: "ready", recipient: "verification@example.invalid" });
    await AgentProfile.updateOne({ userId: agentId }, { $set: { secondaryEmail: "crm@example.invalid" } });
  });
  it("preserves invalid OTP attempt tracking without activating the user or event", async () => {
    const renterEmail = `otp-invalid-${Date.now()}@example.invalid`;
    const service = new RenterService() as any;
    service.updateRenterConsolidatedExcel = vi.fn().mockResolvedValue(undefined);
    service.schedulePreMarketConsolidatedExcelRefresh = vi.fn();
    await service.registerRenter({ email: renterEmail, fullName: "Riley Example", phoneNumber: "5551234567", password: "synthetic-password", referralCode });
    const user = await User.findOne({ email: renterEmail });
    const otp = await EmailVerificationOTP.findOne({ userId: user!._id.toString(), verified: false });
    const invalid = otp!.code === "0000" ? "1111" : "0000";
    await expect(new AuthService().verifyEmail({ email: renterEmail, code: invalid })).rejects.toThrow("Invalid verification code");
    expect(await EmailVerificationOTP.findById(otp!._id)).toMatchObject({ attempts: 1, verified: false });
    expect((await User.findById(user!._id))?.emailVerified).toBe(false);
    expect(await CrmRegistrationOutbox.findById(crmRegistrationEventId(user!._id.toString()))).toMatchObject({ state: "waiting_verification" });
    await new AuthService().verifyEmail({ email: renterEmail, code: otp!.code });
    expect(await CrmRegistrationOutbox.findById(crmRegistrationEventId(user!._id.toString()))).toMatchObject({ state: "ready" });
  });
  it("keeps non-renter OTP verification on the existing path", async () => {
    const agent = await User.findById(agentId);
    const otp = await EmailVerificationOTP.create({ userId: agentId, email: agent!.email, userType: "Agent", code: "4321", expiresAt: new Date(Date.now() + 300000), verified: false, attempts: 0, maxAttempts: 100 });
    const activation = vi.fn();
    const result = await new EmailVerificationService().verifyOTP({ email: agent!.email, code: "4321" }, activation);
    expect(result.verified).toBe(true);
    expect(activation).not.toHaveBeenCalled();
    expect((await EmailVerificationOTP.findById(otp._id))?.verified).toBe(true);
  });
  it("fails before creating an account if the admin welcome lookup fails", async () => {
    const renterEmail = `lookup-fail-${Date.now()}@example.invalid`;
    const before = (await User.findById(adminId))!.totalReferrals;
    const count = await CrmRegistrationOutbox.countDocuments();
    const service = new RenterService() as any;
    service.validateAndGetAdminFromReferralCode = vi.fn().mockResolvedValue(adminId);
    service.getDefaultAssignedAgentId = vi.fn().mockResolvedValue(agentId);
    service.getAssignedAgentWelcomeDetails = vi.fn().mockRejectedValue(new Error("synthetic failure"));
    await expect(service.registerRenter({ email: renterEmail, fullName: "Riley Example", phoneNumber: "5551234567", referralCode: "ADM-TEST1234" })).rejects.toThrow("synthetic failure");
    expect(await User.findOne({ email: renterEmail })).toBeNull();
    expect(await RenterModel.findOne({ email: renterEmail })).toBeNull();
    expect(await CrmRegistrationOutbox.countDocuments()).toBe(count);
    expect((await User.findById(adminId))?.totalReferrals).toBe(before);
  });

  it("returns success and retains one committed event despite post-commit secondary failures", async () => {
    const renterEmail = `postcommit-${Date.now()}@example.invalid`;
    const service = new RenterService() as any;
    service.validateAndGetAdminFromReferralCode = vi.fn().mockResolvedValue(adminId);
    service.getDefaultAssignedAgentId = vi.fn().mockResolvedValue(agentId);
    service.updateRenterConsolidatedExcel = vi.fn().mockResolvedValue(undefined);
    service.schedulePreMarketConsolidatedExcelRefresh = vi.fn();
    service.sendMovingDiscountCodesEmailForRenter = vi.fn().mockRejectedValue(new Error("synthetic failure"));
    vi.mocked(EmailService.prototype.dispatchCrmOutbox).mockRejectedValueOnce(new Error("synthetic failure"));
    const result = await service.registerRenter({ email: renterEmail, fullName: "Riley Example", phoneNumber: "5551234567", referralCode: "ADM-TEST1234" });
    expect(result.registrationType).toBe("admin_referral");
    const user = await User.findOne({ email: renterEmail });
    expect(user).not.toBeNull();
    expect(await RenterModel.countDocuments({ userId: user!._id })).toBe(1);
    expect(await CrmRegistrationOutbox.countDocuments({ renterUserId: user!._id })).toBe(1);
  });

  it("leaves a ready event unclaimed after a transient renter lookup error and recovers", async () => {
    const user = await User.create({ email: `lookup-recovery-${Date.now()}@example.invalid`, password: "synthetic-password", fullName: "Riley Example", phoneNumber: "5551234567", role: "Renter", accountStatus: "active", emailVerified: true });
    const repo = new CrmRegistrationOutboxRepository();
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await repo.createWaiting(user._id, new mongoose.Types.ObjectId(agentId), session);
      await repo.resolveEligibility(user._id.toString(), "crm@example.invalid", session);
    });
    await session.endSession();
    const id = crmRegistrationEventId(user._id.toString());
    const send = vi.fn().mockResolvedValue({ deliveryOutcome: "accepted", messageId: "synthetic-id" });
    const dispatcher = Object.create(EmailService.prototype) as any;
    dispatcher.transporter = { send };
    const lookup = vi.spyOn(User, "findById").mockReturnValueOnce({ lean: () => Promise.reject(new Error("synthetic failure")) } as never);
    await actualDispatch.call(dispatcher, user._id.toString());
    lookup.mockRestore();
    expect(await CrmRegistrationOutbox.findById(id)).toMatchObject({ state: "ready", attemptCount: 0 });
    expect(send).not.toHaveBeenCalled();
    await actualDispatch.call(dispatcher, user._id.toString());
    expect(await CrmRegistrationOutbox.findById(id)).toMatchObject({ state: "accepted", messageId: "synthetic-id", attemptCount: 1 });
    expect(send).toHaveBeenCalledOnce();
  });

  it("records invalid legacy renter data for review without claiming or sending", async () => {
    const user = await User.create({ email: `invalid-data-${Date.now()}@example.invalid`, password: "synthetic-password", fullName: "Riley", phoneNumber: "5551234567", role: "Renter", accountStatus: "active", emailVerified: true });
    const repo = new CrmRegistrationOutboxRepository();
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await repo.createWaiting(user._id, new mongoose.Types.ObjectId(agentId), session);
      await repo.resolveEligibility(user._id.toString(), "crm@example.invalid", session);
    });
    await session.endSession();
    const dispatcher = Object.create(EmailService.prototype) as any;
    dispatcher.transporter = { send: vi.fn() };
    await actualDispatch.call(dispatcher, user._id.toString());
    expect(await CrmRegistrationOutbox.findById(crmRegistrationEventId(user._id.toString()))).toMatchObject({ state: "review", errorCategory: "invalid_registration_data", attemptCount: 0 });
    expect(dispatcher.transporter.send).not.toHaveBeenCalled();
  });
  it.each(["result", "exception"])("keeps one committed registration and OTP after %s delivery failure", async (failure) => {
    const renterEmail = `otp-delivery-${failure}-${Date.now()}@example.invalid`;
    const service = new RenterService() as any;
    service.updateRenterConsolidatedExcel = vi.fn().mockResolvedValue(undefined);
    service.schedulePreMarketConsolidatedExcelRefresh = vi.fn();
    const sender = vi.mocked(EmailService.prototype.sendEmailVerification);
    sender.mockClear();
    if (failure === "result")
      sender.mockResolvedValueOnce({ success: false, error: "synthetic provider detail" } as never);
    else
      sender.mockRejectedValueOnce(new Error("synthetic provider detail"));
    const before = (await User.findById(agentId))!.totalReferrals;
    const result = await service.registerRenter({ email: renterEmail, fullName: "Riley Example", phoneNumber: "5551234567", password: "synthetic-password", referralCode });
    expect(result.verificationEmailConfirmed).toBe(false);
    const user = await User.findOne({ email: renterEmail });
    expect(user).not.toBeNull();
    expect(await EmailVerificationOTP.countDocuments({ userId: user!._id.toString(), verified: false })).toBe(1);
    expect(await RenterModel.countDocuments({ userId: user!._id })).toBe(1);
    expect(await CrmRegistrationOutbox.countDocuments({ renterUserId: user!._id, state: "waiting_verification" })).toBe(1);
    expect((await User.findById(agentId))?.totalReferrals).toBe(before + 1);
    expect(sender).toHaveBeenCalledOnce();
  });
});
