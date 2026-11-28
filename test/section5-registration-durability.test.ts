import { afterEach, describe, expect, it, vi } from "vitest";

import { logger } from "../src/middlewares/pino-logger.js";
import { AgentProfile } from "../src/modules/agent/agent.model.js";
import { RenterService } from "../src/modules/renter/renter.service.js";
import { CrmRegistrationOutboxRepository } from "../src/services/crm-registration-outbox.service.js";
import { TransactionHelper } from "../src/utils/transaction.utils.js";

const user = { _id: "507f1f77bcf86cd799439011", email: "renter@example.invalid", fullName: "Riley Example", phoneNumber: "5551234567", role: "Renter", accountStatus: "active" };
const agentId = "507f1f77bcf86cd799439012";
const payload = { email: user.email, fullName: user.fullName, phoneNumber: user.phoneNumber, password: "synthetic-password", referralCode: "AGT-ABCDEFGH" };

afterEach(() => vi.restoreAllMocks());

function registrationService() {
  vi.spyOn(TransactionHelper, "withRegistrationTransaction").mockImplementation(async callback => callback({} as never));
  vi.spyOn(CrmRegistrationOutboxRepository.prototype, "createWaiting").mockResolvedValue(undefined);
  vi.spyOn(CrmRegistrationOutboxRepository.prototype, "resolveEligibility").mockResolvedValue(true);
  vi.spyOn(AgentProfile, "findOne").mockReturnValue({ session: () => ({ lean: async () => ({ secondaryEmail: "crm@example.invalid", secondaryEmailIsCrm: true }) }) } as never);
  const service = Object.create(RenterService.prototype) as any;
  service.blockedEmailService = { assertEmailNotBlocked: vi.fn() };
  service.userService = { getUserByEmail: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue(user), markEmailAsVerified: vi.fn(), toUserResponse: vi.fn().mockReturnValue({}) };
  service.emailVerificationService = { prepareRegistrationOTP: vi.fn().mockReturnValue({ code: "1234" }), persistRegistrationOTP: vi.fn(), sendRegistrationOTP: vi.fn().mockResolvedValue(true) };
  service.repository = { createRenter: vi.fn().mockResolvedValue({ _id: "synthetic" }) };
  service.referralService = { recordReferral: vi.fn() };
  service.emailService = { dispatchCrmOutbox: vi.fn(), sendAdminReferralEmail: vi.fn().mockResolvedValue({ success: false }) };
  service.validateAndGetAgentFromReferralCode = vi.fn().mockResolvedValue(agentId);
  service.validateAndGetAdminFromReferralCode = vi.fn().mockResolvedValue("507f1f77bcf86cd799439013");
  service.getDefaultAssignedAgentId = vi.fn().mockResolvedValue(agentId);
  service.getAssignedAgentWelcomeDetails = vi.fn().mockResolvedValue({});
  service.sendMovingDiscountCodesEmailForRenter = vi.fn();
  service.generateTokens = vi.fn().mockReturnValue({});
  service.updateRenterConsolidatedExcel = vi.fn().mockResolvedValue(undefined);
  service.schedulePreMarketConsolidatedExcelRefresh = vi.fn();
  service.toRenterResponse = vi.fn().mockReturnValue({});
  return service;
}

describe("registration durability behavior", () => {
  it("stops before email dispatch when the renter profile write fails", async () => {
    const service = registrationService();
    service.repository.createRenter.mockRejectedValue(new Error("synthetic interruption"));
    await expect(service.registerRenter(payload)).rejects.toThrow("synthetic interruption");
    expect(service.userService.create).toHaveBeenCalledOnce();
    expect(service.emailVerificationService.persistRegistrationOTP).toHaveBeenCalledOnce();
    expect(service.repository.createRenter).toHaveBeenCalledOnce();
    expect(service.emailService.dispatchCrmOutbox).not.toHaveBeenCalled();
  });

  it("does not dispatch when the referral update fails in the transaction", async () => {
    const service = registrationService();
    service.referralService.recordReferral.mockRejectedValue(new Error("synthetic interruption"));
    await expect(service.registerRenter(payload)).rejects.toThrow("synthetic interruption");
    expect(service.repository.createRenter).toHaveBeenCalledOnce();
    expect(service.repository.createRenter.mock.calls[0][0]).not.toHaveProperty("crmRegistrationDelivery");
    expect(service.emailService.dispatchCrmOutbox).not.toHaveBeenCalled();
  });

  it("does not dispatch when admin profile creation fails in the transaction", async () => {
    const service = registrationService();
    service.repository.createRenter.mockRejectedValue(new Error("synthetic interruption"));
    const adminPayload = { ...payload, password: undefined, referralCode: "ADM-ABCDEFGH" };
    await expect(service.registerRenter(adminPayload)).rejects.toThrow("synthetic interruption");
    expect(service.referralService.recordReferral).toHaveBeenCalledOnce();
    expect(service.userService.create.mock.calls[0][0]).toMatchObject({ accountStatus: "active", emailVerified: true });
    expect(service.emailService.dispatchCrmOutbox).not.toHaveBeenCalled();
  });

  it("does not commit or dispatch if admin welcome-detail lookup fails", async () => {
    const service = registrationService();
    service.getAssignedAgentWelcomeDetails.mockRejectedValue(new Error("synthetic interruption"));
    await expect(service.registerRenter({ ...payload, password: undefined, referralCode: "ADM-ABCDEFGH" })).rejects.toThrow("synthetic interruption");
    expect(service.repository.createRenter).not.toHaveBeenCalled();
    expect(service.userService.create).not.toHaveBeenCalled();
    expect(service.emailService.dispatchCrmOutbox).not.toHaveBeenCalled();
  });

  it("returns a committed registration when post-commit delivery work fails", async () => {
    const service = registrationService();
    service.emailService.dispatchCrmOutbox.mockRejectedValue(new Error("synthetic dispatch failure"));
    service.sendMovingDiscountCodesEmailForRenter.mockRejectedValue(new Error("synthetic discount failure"));
    const result = await service.registerRenter({ ...payload, password: undefined, referralCode: "ADM-ABCDEFGH" });
    expect(result.registrationType).toBe("admin_referral");
    expect(service.userService.create).toHaveBeenCalledOnce();
    expect(service.referralService.recordReferral).toHaveBeenCalledOnce();
    expect(service.emailService.sendAdminReferralEmail).toHaveBeenCalledOnce();
  });

  it.each(["result", "exception"])("reports a post-commit OTP %s failure without repeating signup or leaking errors", async (kind) => {
    const service = registrationService();
    if (kind === "result")
      service.emailVerificationService.sendRegistrationOTP.mockResolvedValue(false);
    else
      service.emailVerificationService.sendRegistrationOTP.mockRejectedValue(new Error("synthetic provider secret and OTP"));
    const warn = vi.spyOn(logger, "warn");
    const error = vi.spyOn(logger, "error");
    const result = await service.registerRenter(payload);
    expect(result.registrationType).toBe("agent_referral");
    expect(result.verificationEmailConfirmed).toBe(false);
    expect(service.userService.create).toHaveBeenCalledOnce();
    expect(service.emailVerificationService.persistRegistrationOTP).toHaveBeenCalledOnce();
    expect(service.emailVerificationService.sendRegistrationOTP).toHaveBeenCalledOnce();
    expect(service.referralService.recordReferral).toHaveBeenCalledOnce();
    expect(JSON.stringify([...warn.mock.calls, ...error.mock.calls])).not.toContain("synthetic provider secret and OTP");
  });

  it("rejects an already-registered user before another profile or CRM attempt", async () => {
    const service = registrationService();
    service.userService.getUserByEmail.mockResolvedValue(user);
    await expect(service.registerRenter(payload)).rejects.toThrow("Email already registered");
    expect(service.userService.create).not.toHaveBeenCalled();
    expect(service.repository.createRenter).not.toHaveBeenCalled();
    expect(service.emailService.dispatchCrmOutbox).not.toHaveBeenCalled();
  });
});
