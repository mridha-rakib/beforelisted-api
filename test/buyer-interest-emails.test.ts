import { describe, expect, it, vi } from "vitest";

import { preMarketNotifier } from "../src/modules/pre-market/pre-market-notifier.js";
import { PreMarketService } from "../src/modules/pre-market/pre-market.service.js";
import { renterRequestConfirmationTemplate, renterRequestExpiredTemplate } from "../src/services/email-notification.templates.js";
import { EmailService } from "../src/services/email.service.js";
import { htmlToPlainText, PostmarkEmailTransporter } from "../src/services/email.transporter.js";

vi.mock("@/services/email.transporter", async importOriginal => ({
  ...await importOriginal<typeof import("../src/services/email.transporter")>(),
  createEmailTransporter: () => ({ verify: vi.fn(), send: vi.fn() }),
}));

const intent = "Renter indicated intent to buy and interest in upcoming sales";
const timelines = [undefined, "3–6 months", `A & B < 2 > 1 "quoted" 'apostrophe' &amp; &#39;`];

function setup() {
  // Bypass the constructor so these tests cannot initialize a real transporter.
  const service = Object.create(EmailService.prototype) as any;
  service.config = { brandColor: "#1890FF", maxRetries: 1 };
  service.sendEmail = vi.fn().mockResolvedValue({ success: true });
  return service;
}

function postmarkText(options: any): string {
  // Exercise payload generation without initializing or calling a network client.
  const transporter = Object.create(PostmarkEmailTransporter.prototype) as any;
  transporter.config = { from: { name: "Example", email: "sender@example.invalid" } };
  transporter.postmarkConfig = { messageStream: "outbound" };
  return transporter.preparePostmarkPayload(options).TextBody;
}

describe("buyer interest in agent emails", () => {
  for (const timeline of timelines) {
    it(`renders the registration notification with timeline ${String(timeline)}`, async () => {
      const service = setup();
      await service.sendRenterRegistrationVerifiedAdminNotification({
        to: "admin@example.invalid",
        registeredAgentEmail: "agent@example.invalid",
        registeredAgentName: "Alex Agent",
        registeredAgentBrokerage: "Example Brokerage",
        renterName: "Riley Renter",
        renterPhone: "555-0100",
        renterEmail: "renter@example.invalid",
        registrationDate: "Jan 1, 2026",
        purchaseTimeline: timeline,
      });
      const [options, kind, recipient] = service.sendEmail.mock.calls[0];
      expect(options).toMatchObject({
        to: { email: "admin@example.invalid", name: "Admin" },
        cc: ["agent@example.invalid"],
        replyTo: "support@beforelisted.com",
        subject: "New Renter Registration Completed | BeforeListed™",
      });
      expect([kind, recipient]).toEqual(["RENTER_REGISTRATION_VERIFIED_ADMIN", "admin@example.invalid"]);
      expect(options.html).toContain("Riley Renter");
      expect(options.html).toContain("Example Brokerage");
      verifyInterest(options, timeline);
    });

    it(`renders the request confirmation with timeline ${String(timeline)}`, async () => {
      const service = setup();
      await service.sendRenterRequestConfirmationToAgent({
        to: "agent@example.invalid",
        cc: ["copy@example.invalid"],
        agentName: "Alex Agent",
        renterName: "Riley Renter",
        renterEmail: "renter@example.invalid",
        renterPhoneNumber: "555-0100",
        requestId: "R-SYNTHETIC",
        marketScope: "Upcoming",
        minPrice: "$1,000",
        maxPrice: "$2,000",
        earliestDate: "Jan 1, 2026",
        latestDate: "Feb 1, 2026",
        bedrooms: "1",
        bathrooms: "1",
        location: "Example",
        features: "None",
        preferencesByOrder: "Not specified",
        submittedAt: "Jan 1, 2026",
        purchaseTimeline: timeline,
      });
      const [options, kind, recipient] = service.sendEmail.mock.calls[0];
      expect(options).toMatchObject({
        to: { email: "agent@example.invalid", name: "Alex Agent" },
        cc: ["copy@example.invalid"],
        replyTo: "support@beforelisted.com",
        subject: "New renter request submitted | BeforeListed™",
      });
      expect([kind, recipient]).toEqual(["PRE_MARKET_REQUEST_CONFIRMATION_AGENT", "agent@example.invalid"]);
      expect(options.html).toContain("R-SYNTHETIC");
      expect(options.html).toContain("Riley Renter");
      verifyInterest(options, timeline);
    });
  }

  it.each([
    [{ buyerSpecialistNeeded: true, purchaseTimeline: "12+ months" }, "12+ months"],
    [{ buyerSpecialistNeeded: false, purchaseTimeline: "stale timeline" }, undefined],
    [undefined, undefined],
  ])("maps request buyer interest to the notifier", async (buyerInterest, expected) => {
    const service = Object.create(PreMarketService.prototype) as any;
    service.renterRepository = {
      findRenterWithReferrer: vi.fn().mockResolvedValue({
        userId: "renter-synthetic",
        fullName: "Riley Renter",
        email: "renter@example.invalid",
        registrationType: "normal",
      }),
    };
    const notify = vi.spyOn(preMarketNotifier, "notifyNewRequest").mockResolvedValue(undefined as never);
    try {
      await service.sendNotifications({ _id: "request-synthetic", buyerInterest }, "renter-synthetic");
      expect(notify.mock.calls[0][1].purchaseTimeline).toBe(expected);
    }
    finally {
      notify.mockRestore();
    }
  });
});

function verifyInterest(options: any, timeline: string | undefined) {
  const html = options.html;
  expect(html.match(/Buyer interest:/g)).toHaveLength(1);
  const text = postmarkText(options);
  if (timeline) {
    expect(html).toContain(intent);
    expect(html).toContain("Purchase Timeline:");
    const escaped = timeline.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    expect(html).toContain(escaped);
    expect(text).toContain(`Buyer interest: ${intent} Purchase Timeline: ${timeline}`);
  }
  else {
    expect(text).toContain("Buyer interest: None");
    expect(html).not.toContain("Purchase Timeline:");
    expect(html).not.toContain(intent);
  }
}

describe("existing shared plain-text conversion", () => {
  it("retains existing fallback and explicit-text behavior for other emails", () => {
    const html = "<p>Existing&nbsp;notice &amp; updates</p>";
    expect(htmlToPlainText(html)).toBe("Existing notice updates");
    const options = { to: "user@example.invalid", subject: "Notice", html };
    expect(postmarkText(options)).toBe("Existing notice updates");
    expect(postmarkText({ ...options, text: "Explicit & <text>" })).toBe("Explicit & <text>");
  });

  it("preserves the previous conversion of existing renter emails", () => {
    const legacy = (html: string) => html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&#?\w+;/g, " ").replace(/\s+/g, " ").trim();
    for (const html of [
      renterRequestExpiredTemplate("Riley Renter"),
      renterRequestConfirmationTemplate("Riley Renter", "Alex Agent", "Agent", "Example Brokerage"),
    ]) {
      expect(postmarkText({ to: "renter@example.invalid", subject: "Renter notice", html })).toBe(legacy(html));
    }
  });
});
