import { afterEach, describe, expect, it, vi } from "vitest";

import { logger } from "../src/middlewares/pino-logger.js";
import { EmailVerificationService } from "../src/modules/email-verification/email-verification.service.js";
import { User } from "../src/modules/user/user.model.js";
import { EmailService } from "../src/services/email.service.js";
import { PostmarkEmailTransporter } from "../src/services/email.transporter.js";

afterEach(() => vi.restoreAllMocks());

describe("registration OTP storage and delivery", () => {
  it("prepares once and persists with the provided session before email dispatch", async () => {
    const service = Object.create(EmailVerificationService.prototype) as any;
    service.config = { OTP_EXPIRY_MINUTES: 5, MAX_OTP_ATTEMPTS: 100 };
    service.otpService = { generate: vi.fn().mockReturnValue({ code: "1234", expiresAt: new Date("2030-01-01T00:00:00Z") }) };
    service.repository = { createOTP: vi.fn().mockResolvedValue({}) };
    service.emailService = { sendEmailVerification: vi.fn().mockResolvedValue({ success: true }) };
    const request = { userId: "synthetic", email: "renter@example.invalid", userType: "Renter", userName: "Riley Example" };
    const session = { id: "synthetic" } as any;
    const otp = service.prepareRegistrationOTP();
    await service.persistRegistrationOTP(request, otp, session);
    expect(service.repository.createOTP).toHaveBeenCalledWith(expect.objectContaining({ code: "1234", userId: "synthetic" }), session);
    expect(service.emailService.sendEmailVerification).not.toHaveBeenCalled();
    await service.sendRegistrationOTP(request, otp);
    expect(service.emailService.sendEmailVerification).toHaveBeenCalledOnce();
    expect(service.otpService.generate).toHaveBeenCalledOnce();
  });
  it.each([
    [{ success: false, error: "provider detail" }, false],
    [{ success: true, skipped: true }, false],
    [{ success: true }, true],
  ])("reports actual verification email delivery status", async (result, expected) => {
    const service = Object.create(EmailVerificationService.prototype) as any;
    service.emailService = { sendEmailVerification: vi.fn().mockResolvedValue(result) };
    const request = { userId: "synthetic", email: "renter@example.invalid", userType: "Renter", userName: "Riley Example" };
    const otp = { code: "1234", expiresInMinutes: 5 };
    expect(await service.sendRegistrationOTP(request, otp)).toBe(expected);
    expect(service.emailService.sendEmailVerification).toHaveBeenCalledOnce();
  });

  it("propagates an exceptional OTP dispatch failure without retrying", async () => {
    const service = Object.create(EmailVerificationService.prototype) as any;
    service.emailService = { sendEmailVerification: vi.fn().mockRejectedValue(new Error("synthetic provider detail")) };
    await expect(service.sendRegistrationOTP({ userId: "synthetic", email: "renter@example.invalid", userType: "Renter", userName: "Riley Example" }, { code: "1234", expiresInMinutes: 5 })).rejects.toThrow();
    expect(service.emailService.sendEmailVerification).toHaveBeenCalledOnce();
  });

  it("recognizes sandbox suppression without claiming verification was sent", async () => {
    vi.spyOn(User, "find").mockReturnValue({ select: () => ({ lean: async () => [] }) } as never);
    const log = vi.spyOn(logger, "info");
    const email = Object.create(EmailService.prototype) as any;
    email.templates = { emailVerification: vi.fn().mockReturnValue("<p>synthetic</p>") };
    email.config = { maxRetries: 1 };
    email.transporter = { send: vi.fn().mockResolvedValue({ messageId: "synthetic-sandbox", deliveryOutcome: "suppressed", retries: 0, timestamp: new Date() }) };
    const service = Object.create(EmailVerificationService.prototype) as any;
    service.emailService = email;
    const request = { userId: "synthetic", email: "renter@example.invalid", userType: "Renter", userName: "Riley Example" };
    expect(await service.sendRegistrationOTP(request, { code: "1234", expiresInMinutes: 5 })).toBe(false);
    expect(email.transporter.send.mock.calls[0][0].deliveryPolicy).toBe("otp-single-attempt");
    expect(JSON.stringify(log.mock.calls)).not.toContain("Email sent successfully");
  });

  it("sanitizes OTP provider errors before logging or returning", async () => {
    vi.spyOn(User, "find").mockReturnValue({ select: () => ({ lean: async () => [] }) } as never);
    const log = vi.spyOn(logger, "error");
    const email = Object.create(EmailService.prototype) as any;
    email.templates = { emailVerification: vi.fn().mockReturnValue("<p>synthetic</p>") };
    email.config = { maxRetries: 1 };
    email.transporter = { send: vi.fn().mockResolvedValue({ error: new Error("sensitive OTP 1234"), retries: 0, timestamp: new Date() }) };
    const result = await email.sendEmailVerification({ to: "renter@example.invalid", userName: "Riley Example", userType: "Renter", verificationCode: "1234", expiresIn: 5 });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Email delivery failed");
    expect(JSON.stringify(log.mock.calls)).not.toContain("1234");
  });

  it("treats an uncertain single-attempt OTP as unconfirmed without provider details", async () => {
    vi.spyOn(User, "find").mockReturnValue({ select: () => ({ lean: async () => [] }) } as never);
    const log = vi.spyOn(logger, "error");
    const email = Object.create(EmailService.prototype) as any;
    email.templates = { emailVerification: vi.fn().mockReturnValue("<p>synthetic</p>") };
    email.config = { maxRetries: 100 };
    email.transporter = { send: vi.fn().mockResolvedValue({ deliveryOutcome: "uncertain", messageId: "", retries: 0, timestamp: new Date() }) };
    const service = Object.create(EmailVerificationService.prototype) as any;
    service.emailService = email;
    expect(await service.sendRegistrationOTP({ userId: "synthetic", email: "renter@example.invalid", userType: "Renter", userName: "Riley Example" }, { code: "1234", expiresInMinutes: 5 })).toBe(false);
    expect(email.transporter.send).toHaveBeenCalledOnce();
    expect(JSON.stringify(log.mock.calls)).not.toContain("1234");
  });

  it("suppresses the initial OTP provider call in sandbox", async () => {
    const post = vi.fn();
    const transporter = Object.create(PostmarkEmailTransporter.prototype) as any;
    transporter.client = { post };
    transporter.postmarkConfig = { sandboxMode: true, messageStream: "outbound" };
    const response = await transporter.send({ to: "renter@example.invalid", subject: "Verification", html: "synthetic", deliveryPolicy: "otp-single-attempt" });
    expect(response.deliveryOutcome).toBe("suppressed");
    expect(post).not.toHaveBeenCalled();
  });

  it("does not automatically resend an initial OTP after an uncertain timeout", async () => {
    const post = vi.fn().mockRejectedValue(new Error("synthetic timeout with code 1234"));
    const transporter = Object.create(PostmarkEmailTransporter.prototype) as any;
    transporter.client = { post };
    transporter.config = { from: { name: "Example", email: "sender@example.invalid" } };
    transporter.postmarkConfig = { sandboxMode: false, messageStream: "outbound" };
    transporter.maxRetries = 100;
    const response = await transporter.send({ to: "renter@example.invalid", subject: "Verification", html: "synthetic", deliveryPolicy: "otp-single-attempt" });
    expect(response.deliveryOutcome).toBe("uncertain");
    expect(post).toHaveBeenCalledOnce();
  });

  it("preserves the existing OTP resend flow", async () => {
    const service = Object.create(EmailVerificationService.prototype) as any;
    service.config = { OTP_EXPIRY_MINUTES: 5, MAX_OTP_ATTEMPTS: 100 };
    const current = { userId: "synthetic", verified: false };
    service.repository = { findByEmail: vi.fn().mockResolvedValue(current), invalidatePreviousOTPs: vi.fn().mockResolvedValue(1), createOTP: vi.fn().mockResolvedValue({}) };
    service.otpService = { generate: vi.fn().mockReturnValue({ code: "4321", expiresAt: new Date("2030-01-01T00:00:00Z"), expiresInSeconds: 300 }) };
    service.checkResendEligibility = vi.fn().mockResolvedValue({ canResend: true, attemptsRemaining: 4 });
    service.emailService = { resendEmailVerification: vi.fn().mockResolvedValue({ success: true }) };
    await service.resendOTP({ email: "renter@example.invalid", userName: "Riley Example", userType: "Renter" });
    expect(service.repository.invalidatePreviousOTPs).toHaveBeenCalledWith("synthetic");
    expect(service.repository.createOTP).toHaveBeenCalledWith(expect.objectContaining({ userId: "synthetic", code: "4321", verified: false }));
    expect(service.emailService.resendEmailVerification).toHaveBeenCalledOnce();
  });
});
