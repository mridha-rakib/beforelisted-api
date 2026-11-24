import ExcelJS from "exceljs";
import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { errorHandler } from "../src/middlewares/error-handler.middleware.js";
import { AgentProfile } from "../src/modules/agent/agent.model.js";
import { AgentProfileRepository } from "../src/modules/agent/agent.repository.js";
import agentRouter from "../src/modules/agent/agent.route.js";
import { adminSecondaryEmailSchema, updateAgentProfileSchema } from "../src/modules/agent/agent.schema.js";
import { AgentService } from "../src/modules/agent/agent.service.js";
import { AuthService } from "../src/modules/auth/auth.service.js";
import { AuthUtil } from "../src/modules/auth/auth.utils.js";
import { BlockedEmailService } from "../src/modules/blocked-email/blocked-email.service.js";
import { RenterService } from "../src/modules/renter/renter.service.js";
import { User } from "../src/modules/user/user.model.js";
import { UserRepository } from "../src/modules/user/user.repository.js";
import { crmRegistrationOptions, findSecondarySystemRecipients, structuredCrmRegistration } from "../src/services/agent-secondary-email.service.js";
import { CrmRegistrationOutboxRepository } from "../src/services/crm-registration-outbox.service.js";
import { EmailService } from "../src/services/email.service.js";
import { PostmarkEmailTransporter } from "../src/services/email.transporter.js";
import { ExcelService } from "../src/services/excel.service.js";
import { SecondaryCopyOutboxService } from "../src/services/secondary-copy-outbox.service.js";
import { TransactionHelper } from "../src/utils/transaction.utils.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("agent secondary email profile", () => {
  it("rejects agent attempts to change administrator-managed fields", async () => {
    for (const body of [{ secondaryEmail: "synthetic@example.invalid" }, { secondaryEmailIsCrm: true }]) {
      expect((await updateAgentProfileSchema.safeParseAsync({ body })).success).toBe(false);
    }
    expect((await updateAgentProfileSchema.safeParseAsync({ body: { brokerageName: "Example" } })).success).toBe(true);
  });

  it("does not persist secondary-email fields through the agent profile service", async () => {
    const profile = { userId: "synthetic", secondaryEmail: "original@example.invalid", secondaryEmailIsCrm: false, brokerageName: "Original" };
    const service = Object.create(AgentService.prototype) as any;
    service.repository = { findByUserId: vi.fn().mockResolvedValue(profile), updateProfile: vi.fn().mockResolvedValue(undefined) };
    await service.updateAgentProfile("synthetic", { brokerageName: "Updated", secondaryEmail: "attacker@example.invalid", secondaryEmailIsCrm: true });
    expect(service.repository.updateProfile).toHaveBeenCalledWith("synthetic", { brokerageName: "Updated" });
    expect(profile.secondaryEmail).toBe("original@example.invalid");
    expect(profile.secondaryEmailIsCrm).toBe(false);
  });

  it("exposes the secondary address to the profile without enabling CRM for an absent address", async () => {
    const service = Object.create(AgentService.prototype) as any;
    service.repository = { findByUserId: vi.fn().mockResolvedValue({ userId: "synthetic", secondaryEmail: "synthetic@example.invalid", secondaryEmailIsCrm: true }) };
    expect(await service.getAgentProfile("synthetic")).toMatchObject({ secondaryEmail: "synthetic@example.invalid", secondaryEmailIsCrm: true });
    service.repository.findByUserId.mockResolvedValue({ userId: "synthetic", secondaryEmailIsCrm: true });
    expect(await service.getAgentProfile("synthetic")).toMatchObject({ secondaryEmailIsCrm: false });
  });

  it("adds secondary and CRM columns after the existing export columns", async () => {
    const service = Object.create(ExcelService.prototype) as any;
    service.agentRepository = { findAll: vi.fn().mockResolvedValue([{ userId: { fullName: "Synthetic Agent", email: "agent@example.invalid" }, secondaryEmail: "crm@example.invalid", secondaryEmailIsCrm: true }]) };
    const { buffer } = await service.generateConsolidatedAgentExcel();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet("All Agents")!;
    expect(sheet.getCell("J1").value).toBe("Total Referrals");
    expect(sheet.getCell("K1").value).toBe("Secondary Email");
    expect(sheet.getCell("L1").value).toBe("CRM (Yes/No)");
    expect(sheet.getCell("K2").value).toBe("crm@example.invalid");
    expect(sheet.getCell("L2").value).toBe("Yes");
  });

  it("validates admin settings and resets CRM when the address is removed", async () => {
    const params = { userId: "507f1f77bcf86cd799439011" };
    expect((await adminSecondaryEmailSchema.safeParseAsync({ params, body: { secondaryEmail: "bad" } })).success).toBe(false);
    expect((await adminSecondaryEmailSchema.parseAsync({ params, body: { secondaryEmail: "" } })).body.secondaryEmailIsCrm).toBe(false);
    const service = Object.create(AgentService.prototype) as any;
    service.repository = { findByUserId: vi.fn().mockResolvedValue({ userId: { role: "Agent" } }), updateProfile: vi.fn() };
    service.updateAgentConsolidatedExcel = vi.fn().mockResolvedValue(undefined);
    await service.adminUpdateSecondaryEmail(params.userId, { secondaryEmail: "crm@example.invalid", secondaryEmailIsCrm: true });
    expect(service.repository.updateProfile).toHaveBeenCalledWith(params.userId, { secondaryEmail: "crm@example.invalid", secondaryEmailIsCrm: true });
    await service.adminUpdateSecondaryEmail(params.userId, { secondaryEmail: "", secondaryEmailIsCrm: true });
    expect(service.repository.updateProfile).toHaveBeenCalledWith(params.userId, { secondaryEmail: "", secondaryEmailIsCrm: false });
    service.repository.findByUserId.mockResolvedValue({ userId: { role: "Renter" } });
    await expect(service.adminUpdateSecondaryEmail(params.userId, { secondaryEmail: "agent@example.invalid", secondaryEmailIsCrm: false })).rejects.toThrow();
  });

  it("saves and clears a secondary address while preserving other profile data", async () => {
    const id = "507f1f77bcf86cd799439011";
    const profile: any = { userId: { role: "Agent" }, licenseNumber: "synthetic-license", brokerageName: "Synthetic brokerage" };
    const service = Object.create(AgentService.prototype) as any;
    service.updateAgentConsolidatedExcel = vi.fn().mockResolvedValue(undefined);
    service.repository = {
      findByUserId: vi.fn().mockImplementation(async () => profile),
      updateProfile: vi.fn().mockImplementation(async (_id, changes) => Object.assign(profile, changes)),
    };
    const saved = await service.adminUpdateSecondaryEmail(id, { secondaryEmail: "copy@example.invalid", secondaryEmailIsCrm: false });
    expect(saved).toMatchObject({ secondaryEmail: "copy@example.invalid", secondaryEmailIsCrm: false, licenseNumber: "synthetic-license", brokerageName: "Synthetic brokerage" });
    const cleared = await service.adminUpdateSecondaryEmail(id, { secondaryEmail: "", secondaryEmailIsCrm: true });
    expect(cleared).toMatchObject({ secondaryEmail: "", secondaryEmailIsCrm: false, licenseNumber: "synthetic-license" });
    expect(service.updateAgentConsolidatedExcel).toHaveBeenCalledTimes(2);
  });

  it("authorizes only admins to update a secondary address", async () => {
    const id = "507f1f77bcf86cd799439011";
    let role = "Agent";
    vi.spyOn(AuthUtil, "verifyAccessToken").mockReturnValue({ userId: id } as never);
    vi.spyOn(UserRepository.prototype, "findById").mockImplementation(async () => ({ _id: id, role, email: "actor@example.invalid", accountStatus: "active", emailVerified: true }) as never);
    vi.spyOn(BlockedEmailService.prototype, "assertEmailNotBlocked").mockResolvedValue(undefined);
    vi.spyOn(AgentProfileRepository.prototype, "findByUserId").mockResolvedValue({ isActive: true } as never);
    const update = vi.spyOn(AgentService.prototype, "adminUpdateSecondaryEmail").mockResolvedValue({ secondaryEmail: "copy@example.invalid" } as never);
    const app = express();
    app.use(express.json(), agentRouter, errorHandler);
    await request(app).put(`/admin/${id}/secondary-email`).send({ secondaryEmail: "copy@example.invalid" }).expect(401);
    await request(app).put(`/admin/${id}/secondary-email`).set("Authorization", "Bearer synthetic").send({ secondaryEmail: "copy@example.invalid" }).expect(403);
    role = "Admin";
    await request(app).put(`/admin/${id}/secondary-email`).set("Authorization", "Bearer synthetic").send({ secondaryEmail: "copy@example.invalid" }).expect(200);
    expect(update).toHaveBeenCalledOnce();
  });

  it("finds separate non-CRM recipients for To and CC while deduplicating", async () => {
    const users = [{ _id: "one" }, { _id: "two" }];
    const userSelect = vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(users) });
    const profileSelect = vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([{ secondaryEmail: "copy@example.invalid" }, { secondaryEmail: "COPY@example.invalid" }]) });
    const findUsers = vi.spyOn(User, "find").mockReturnValue({ select: userSelect } as never);
    const findProfiles = vi.spyOn(AgentProfile, "find").mockReturnValue({ select: profileSelect } as never);
    const result = await findSecondarySystemRecipients({ to: "agent@example.invalid", cc: ["agent@example.invalid", "other@example.invalid"], subject: "Test", html: "Test" });
    expect(result).toEqual(["copy@example.invalid"]);
    expect(findUsers.mock.calls[0][0]).toMatchObject({ email: { $in: ["agent@example.invalid", "other@example.invalid"] }, role: "Agent" });
    expect(findProfiles.mock.calls[0][0]).toMatchObject({ secondaryEmailIsCrm: { $ne: true } });
  });

  it("does not return removed, invalid, or already-addressed secondary emails", async () => {
    vi.spyOn(User, "find").mockReturnValue({ select: () => ({ lean: async () => [{ _id: "one" }] }) } as never);
    vi.spyOn(AgentProfile, "find").mockReturnValue({ select: () => ({ lean: async () => [
      { secondaryEmail: "" },
      { secondaryEmail: "invalid" },
      { secondaryEmail: "admin@example.invalid" },
    ] }) } as never);
    expect(await findSecondarySystemRecipients({ to: "agent@example.invalid", cc: "admin@example.invalid", subject: "Test", html: "Test" })).toEqual([]);
  });

  it("prepares a secondary intent before the primary without sending a copy in the request", async () => {
    const agentId = "507f1f77bcf86cd799439011";
    const key = Buffer.alloc(32, 1).toString("base64");
    vi.stubEnv("SECONDARY_COPY_KEYS", JSON.stringify({ v1: key }));
    vi.stubEnv("SECONDARY_COPY_ACTIVE_KEY_VERSION", "v1");
    vi.stubEnv("SECONDARY_COPY_IDENTITY_KEY", key);
    vi.stubEnv("SECONDARY_COPY_RETENTION_HOURS", "24");
    vi.spyOn(User, "find").mockReturnValue({ select: () => ({ lean: async () => [{ _id: agentId }] }) } as never);
    vi.spyOn(AgentProfile, "find").mockReturnValue({ select: () => ({ lean: async () => [{ userId: agentId, secondaryEmail: "copy@example.invalid" }] }) } as never);
    const prepare = vi.spyOn(SecondaryCopyOutboxService.prototype, "prepare").mockResolvedValue("event-id");
    const ready = vi.spyOn(SecondaryCopyOutboxService.prototype, "markPrimaryAccepted").mockResolvedValue();
    const service = Object.create(EmailService.prototype) as any;
    const send = vi.fn().mockResolvedValue({ messageId: "synthetic", timestamp: new Date(), retries: 0 });
    service.transporter = { send };
    service.config = { maxRetries: 1 };
    const primary = { to: "admin@example.invalid", cc: ["agent@example.invalid"], subject: "Original", html: "<p>Original</p>" };
    expect((await service.sendEmail(primary, "TEST", "admin@example.invalid")).success).toBe(true);
    expect(prepare).toHaveBeenCalledOnce();
    expect(prepare.mock.invocationCallOrder[0]).toBeLessThan(send.mock.invocationCallOrder[0]);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0]).toMatchObject(primary);
    expect(ready).toHaveBeenCalledWith("event-id");
  });

  it("builds an exact four-line text-only CRM message for structured data", () => {
    const options = crmRegistrationOptions("crm@example.invalid", { firstName: "Riley", lastName: "Example", email: "renter@example.invalid", phone: "555-0100" });
    expect(options.subject).toBe("New Renter Registration | BeforeListed");
    expect(options.text).toBe("First Name: Riley\nLast Name: Example\nEmail: renter@example.invalid\nPhone: 555-0100");
    expect(options.to).toBe("crm@example.invalid");
    expect(options.cc).toBeUndefined();
    const transporter = Object.create(PostmarkEmailTransporter.prototype) as any;
    transporter.config = { from: { name: "Test", email: "sender@example.invalid" } };
    transporter.postmarkConfig = { messageStream: "outbound" };
    const payload = transporter.preparePostmarkPayload(options);
    expect(payload).not.toHaveProperty("HtmlBody");
    expect(payload.TextBody).toBe(options.text);
    expect(() => crmRegistrationOptions("crm@example.invalid", { firstName: "Riley", lastName: "", email: "renter@example.invalid", phone: "" })).toThrow();
  });
  it("maps the first word and retains all remaining name parts", () => {
    expect(structuredCrmRegistration("Riley Example", "renter@example.invalid", "555-123-4567")).toEqual({ firstName: "Riley", lastName: "Example", email: "renter@example.invalid", phone: "555-123-4567" });
    expect(structuredCrmRegistration("  Riley  De   La Example  ", "renter@example.invalid", "555-123-4567")).toEqual({ firstName: "Riley", lastName: "De La Example", email: "renter@example.invalid", phone: "555-123-4567" });
    expect(structuredCrmRegistration("Riley De Example", "renter@example.invalid", "555-123-4567")).toEqual({ firstName: "Riley", lastName: "De Example", email: "renter@example.invalid", phone: "555-123-4567" });
    for (const name of ["Riley", ""]) {
      expect(structuredCrmRegistration(name, "renter@example.invalid", "555-123-4567")).toBeNull();
    }
    expect(structuredCrmRegistration("Riley Example", "renter@example.invalid", undefined)).toBeNull();
    expect(structuredCrmRegistration("Riley Example", "renter@example.invalid", "bad")).toBeNull();
  });
  it("passes the verified renter and registered agent to CRM once after OTP verification", async () => {
    const id = "507f1f77bcf86cd799439011";
    const agentId = "507f1f77bcf86cd799439012";
    const user = { _id: id, email: "renter@example.invalid", fullName: "Riley Example", phoneNumber: "555-123-4567", role: "Renter", createdAt: new Date("2025-01-01") };
    const service = Object.create(AuthService.prototype) as any;
    service.emailVerificationService = { verifyOTP: vi.fn().mockResolvedValue({ userId: id, userType: "Renter" }) };
    service.userService = { getUserByEmail: vi.fn().mockResolvedValue(user), markEmailAsVerified: vi.fn().mockResolvedValue(user), toUserResponse: vi.fn().mockReturnValue({ role: "Renter" }) };
    service.renterRepository = { findRenterWithReferrer: vi.fn().mockResolvedValue({ referredByAgentId: { _id: agentId, fullName: "Alex Agent", email: "agent@example.invalid" } }) };
    service.emailService = { dispatchCrmOutbox: vi.fn().mockResolvedValue(undefined), sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }), sendRenterRegistrationVerifiedAdminNotification: vi.fn().mockResolvedValue({ success: true }) };
    vi.spyOn(AgentProfileRepository.prototype, "findByUserId").mockResolvedValue({ title: "Agent", brokerageName: "Synthetic" } as never);
    await service.verifyEmail({ email: user.email, code: "1234" });
    expect(service.emailService.dispatchCrmOutbox).toHaveBeenCalledOnce();
    expect(service.emailService.dispatchCrmOutbox).toHaveBeenCalledWith(id);
    expect(service.emailService.sendWelcomeEmail).toHaveBeenCalledOnce();
    expect(service.emailService.sendRenterRegistrationVerifiedAdminNotification).toHaveBeenCalledWith(expect.objectContaining({ secondaryEventId: `renter-registration-verified:${id}` }));
  });
  it("sends CRM registration once on the admin-referral path", async () => {
    const user = { _id: "507f1f77bcf86cd799439011", fullName: "Riley Example", email: "renter@example.invalid", phoneNumber: "555-123-4567", role: "Renter", accountStatus: "active" };
    const agentId = "507f1f77bcf86cd799439012";
    vi.spyOn(TransactionHelper, "withRegistrationTransaction").mockImplementation(async callback => callback({} as never));
    vi.spyOn(CrmRegistrationOutboxRepository.prototype, "createWaiting").mockResolvedValue(undefined);
    vi.spyOn(CrmRegistrationOutboxRepository.prototype, "resolveEligibility").mockResolvedValue(true);
    vi.spyOn(AgentProfile, "findOne").mockReturnValue({ session: () => ({ lean: async () => ({ secondaryEmail: "crm@example.invalid", secondaryEmailIsCrm: true }) }) } as never);
    const service = Object.create(RenterService.prototype) as any;
    service.validateAndGetAdminFromReferralCode = vi.fn().mockResolvedValue("admin");
    service.getDefaultAssignedAgentId = vi.fn().mockResolvedValue(agentId);
    service.getAssignedAgentWelcomeDetails = vi.fn().mockResolvedValue({});
    service.referralService = { recordReferral: vi.fn() };
    service.userService = { getUserByEmail: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue(user), markEmailAsVerified: vi.fn(), toUserResponse: vi.fn().mockReturnValue({}) };
    service.repository = { createRenter: vi.fn().mockResolvedValue({ _id: "507f1f77bcf86cd799439013" }) };
    service.emailService = { dispatchCrmOutbox: vi.fn(), sendAdminReferralEmail: vi.fn().mockResolvedValue({ success: false }) };
    service.sendMovingDiscountCodesEmailForRenter = vi.fn();
    service.generateTokens = vi.fn().mockReturnValue({});
    service.updateRenterConsolidatedExcel = vi.fn().mockResolvedValue(undefined);
    service.schedulePreMarketConsolidatedExcelRefresh = vi.fn();
    service.toRenterResponse = vi.fn().mockReturnValue({});
    await service.registerAdminReferralRenter({ email: user.email, fullName: user.fullName, phoneNumber: user.phoneNumber, referralCode: "ADM-ABCDEFGH" });
    expect(service.emailService.dispatchCrmOutbox).toHaveBeenCalledOnce();
    expect(service.emailService.dispatchCrmOutbox).toHaveBeenCalledWith(user._id);
    expect(service.emailService.sendAdminReferralEmail).toHaveBeenCalledOnce();
  });
});
