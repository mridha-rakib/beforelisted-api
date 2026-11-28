import { afterEach, describe, expect, it, vi } from "vitest";

import { logger } from "../src/middlewares/pino-logger.js";
import { User } from "../src/modules/user/user.model.js";
import { crmRegistrationOptions } from "../src/services/agent-secondary-email.service.js";
import { CrmRegistrationOutboxRepository } from "../src/services/crm-registration-outbox.service.js";
import { EmailService } from "../src/services/email.service.js";
import { PostmarkEmailTransporter } from "../src/services/email.transporter.js";

const data = { firstName: "Riley", lastName: "Example", email: "renter@example.invalid", phone: "555-123-4567" };
afterEach(() => vi.restoreAllMocks());

describe("CRM delivery safety", () => {
  function transport(post: ReturnType<typeof vi.fn>, sandboxMode = false): any {
    const t = Object.create(PostmarkEmailTransporter.prototype);
    t.config = { from: { name: "Test", email: "sender@example.invalid" } };
    t.postmarkConfig = { sandboxMode, messageStream: "outbound" };
    t.client = { post };
    return t;
  }

  it.each([
    ["accepted", { status: 200, data: { MessageID: "provider-id" } }],
    ["failed", { status: 422, data: { Message: "sensitive" } }],
    ["uncertain", { status: 500, data: {} }],
  ])("records %s from one provider call", async (state, response) => {
    const post = vi.fn().mockResolvedValue(response);
    const result = await transport(post).send(crmRegistrationOptions("crm@example.invalid", data));
    expect(result.deliveryOutcome).toBe(state);
    expect(result.messageId).toBe(state === "accepted" ? "provider-id" : "");
    expect(post).toHaveBeenCalledOnce();
    const payload = post.mock.calls[0][1];
    expect(payload).not.toHaveProperty("HtmlBody");
    expect(payload.To).toBe("crm@example.invalid");
    expect(payload.Cc).toBeUndefined();
    expect(payload.TextBody).toBe("First Name: Riley\nLast Name: Example\nEmail: renter@example.invalid\nPhone: 555-123-4567");
  });

  it("sends all parts of a multipart name in the exact text-only CRM payload", async () => {
    const post = vi.fn().mockResolvedValue({ status: 200, data: { MessageID: "provider-id" } });
    const result = await transport(post).send(crmRegistrationOptions("crm@example.invalid", { ...data, lastName: "De La Example" }));
    expect(result.deliveryOutcome).toBe("accepted");
    const payload = post.mock.calls[0][1];
    expect(payload.Subject).toBe("New Renter Registration | BeforeListed");
    expect(payload.To).toBe("crm@example.invalid");
    expect(payload.Cc).toBeUndefined();
    expect(payload).not.toHaveProperty("HtmlBody");
    expect(payload.TextBody).toBe("First Name: Riley\nLast Name: De La Example\nEmail: renter@example.invalid\nPhone: 555-123-4567");
  });

  it("does not retry an uncertain timeout or call the provider in sandbox", async () => {
    const post = vi.fn().mockRejectedValue(new Error("sensitive timeout"));
    expect((await transport(post).send(crmRegistrationOptions("crm@example.invalid", data))).deliveryOutcome).toBe("uncertain");
    expect(post).toHaveBeenCalledOnce();
    post.mockClear();
    expect((await transport(post, true).send(crmRegistrationOptions("crm@example.invalid", data))).deliveryOutcome).toBe("suppressed");
    expect(post).not.toHaveBeenCalled();
  });

  it("uses one provider attempt for a secondary outbox copy", async () => {
    const post = vi.fn().mockRejectedValue(new Error("sensitive timeout"));
    const result = await transport(post).send({ to: "copy@example.invalid", subject: "Synthetic", html: "synthetic", deliveryPolicy: "secondary-copy-single-attempt" });
    expect(result.deliveryOutcome).toBe("uncertain");
    expect(post).toHaveBeenCalledOnce();
  });

  it.each([undefined, null, "", "   "])("does not confirm a primary response with an invalid message ID", async (messageId) => {
    const post = vi.fn().mockResolvedValue({ status: 200, data: { MessageID: messageId } });
    const t = transport(post);
    t.maxRetries = 1;
    const result = await t.send({ to: "agent@example.invalid", subject: "Synthetic", html: "Synthetic" });
    expect(result.deliveryOutcome).toBe("uncertain");
    expect(post).toHaveBeenCalledOnce();
  });

  it("leaves a ready event unclaimed when the renter lookup throws", async () => {
    const event = { renterUserId: "507f1f77bcf86cd799439011", recipient: "crm@example.invalid" };
    vi.spyOn(CrmRegistrationOutboxRepository.prototype, "findReady").mockResolvedValue(event as never);
    vi.spyOn(User, "findById").mockReturnValue({ lean: vi.fn().mockRejectedValue(new Error("sensitive database error")) } as never);
    const claim = vi.spyOn(CrmRegistrationOutboxRepository.prototype, "claim");
    const mark = vi.spyOn(CrmRegistrationOutboxRepository.prototype, "markInvalidData");
    const log = vi.spyOn(logger, "error");
    const service = Object.create(EmailService.prototype) as any;
    service.transporter = { send: vi.fn() };
    await service.dispatchCrmOutbox(event.renterUserId);
    expect(claim).not.toHaveBeenCalled();
    expect(mark).not.toHaveBeenCalled();
    expect(service.transporter.send).not.toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain("sensitive database error");
  });

  it.each([
    [{ fullName: "Riley", email: "renter@example.invalid", phoneNumber: "5551234567" }, "crm@example.invalid"],
    [{ fullName: undefined, email: "renter@example.invalid", phoneNumber: "5551234567" }, "crm@example.invalid"],
    [{ fullName: "Riley Example", email: "renter@example.invalid", phoneNumber: "5551234567" }, "bad-recipient"],
    [null, "crm@example.invalid"],
  ])("marks invalid registration data for review before claim", async (user, recipient) => {
    const event = { renterUserId: "507f1f77bcf86cd799439011", recipient };
    vi.spyOn(CrmRegistrationOutboxRepository.prototype, "findReady").mockResolvedValue(event as never);
    vi.spyOn(User, "findById").mockReturnValue({ lean: vi.fn().mockResolvedValue(user) } as never);
    const claim = vi.spyOn(CrmRegistrationOutboxRepository.prototype, "claim");
    const mark = vi.spyOn(CrmRegistrationOutboxRepository.prototype, "markInvalidData").mockResolvedValue(true);
    const service = Object.create(EmailService.prototype) as any;
    service.transporter = { send: vi.fn() };
    await service.dispatchCrmOutbox(event.renterUserId);
    expect(mark).toHaveBeenCalledWith(event.renterUserId);
    expect(claim).not.toHaveBeenCalled();
    expect(service.transporter.send).not.toHaveBeenCalled();
  });

  it("removes provider error details and recipient data from secondary-copy failure logs", async () => {
    const post = vi.fn().mockResolvedValue({ status: 422, data: { Message: "sensitive-provider-detail" } });
    const t = transport(post);
    t.maxRetries = 1;
    const warn = vi.spyOn(logger, "warn");
    const error = vi.spyOn(logger, "error");
    await t.send({ to: "private@example.invalid", subject: "private subject", html: "<p>text</p>", deliveryPolicy: "secondary-copy" });
    const logs = JSON.stringify([...warn.mock.calls, ...error.mock.calls]);
    expect(logs).not.toContain("sensitive-provider-detail");
    expect(logs).not.toContain("private@example.invalid");
    expect(logs).not.toContain("private subject");
  });

  it("bounds non-200 responses instead of looping forever", async () => {
    const post = vi.fn().mockResolvedValue({ status: 302, data: {} });
    const t = transport(post);
    t.maxRetries = 2;
    t.sleep = vi.fn().mockResolvedValue(undefined);
    const result = await t.send({ to: "copy@example.invalid", subject: "Test", html: "text", deliveryPolicy: "secondary-copy" });
    expect(post).toHaveBeenCalledTimes(2);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("does not expose a temporary password from provider errors and keeps normal retries", async () => {
    const post = vi.fn().mockResolvedValue({ status: 422, data: { Message: "synthetic-temporary-password" } });
    const t = transport(post);
    t.maxRetries = 2;
    t.sleep = vi.fn().mockResolvedValue(undefined);
    const warn = vi.spyOn(logger, "warn");
    const error = vi.spyOn(logger, "error");
    const result = await t.send({ to: "renter@example.invalid", subject: "Welcome", html: "synthetic-temporary-password", deliveryPolicy: "sensitive-email" });
    expect(post).toHaveBeenCalledTimes(2);
    expect(result.error.message).toBe("Email delivery failed");
    expect(JSON.stringify([...warn.mock.calls, ...error.mock.calls])).not.toContain("synthetic-temporary-password");
  });

  it("handles absent html in the shared logo pipeline", () => {
    const service = Object.create(EmailService.prototype) as any;
    expect(service.withDefaultEmailLogo({ to: "synthetic@example.invalid", subject: "Test", text: "text" })).toMatchObject({ text: "text" });
  });
});
