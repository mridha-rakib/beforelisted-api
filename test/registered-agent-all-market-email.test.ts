import { describe, expect, it, vi } from "vitest";

import { registeredAgentAllMarketMatchTemplate } from "../src/services/email-notification.templates";
import { EmailService } from "../src/services/email.service";

vi.mock("../src/services/email.transporter", () => ({
  createEmailTransporter: () => ({ verify: vi.fn().mockResolvedValue(true) }),
}));

const payload = {
  to: "jamie@example.invalid",
  renterName: "Jamie Renter",
  requestScope: "All Market" as const,
  registeredAgentFullName: "Casey Agent",
  registeredAgentTitle: "Licensed Real Estate Agent",
  registeredAgentBrokerage: "Example Brokerage",
  registeredAgentEmail: "casey@example.invalid",
  registeredAgentPhone: "555-0100",
  opportunityDetails: "A tour can be arranged on Thursday.",
  matchSummary: {
    compatibilityMisses: ["Elevator", "Laundry in unit"],
    preferenceMatches: ["Lots of light", "High ceilings"],
    preferenceDetails: ["Lots of light", "High ceilings", "Private outdoor space"],
  },
};

describe("Template #6C — registered agent matches their own All Market renter", () => {
  it("uses the client's copy, agent message, actual matches, and agent contact details", () => {
    const html = registeredAgentAllMarketMatchTemplate(payload);
    expect(html).toContain("Hi Jamie,");
    expect(html).toContain("including assistance with publicly listed apartments, your registered agent will be the renter specialist assisting with your rental search.");
    expect(html).toContain("landlord and building screening, scheduling and coordinating tours, negotiations, and support through the rental process.");
    expect(html).toContain("Message from the agent Casey Agent:");
    expect(html).toContain(payload.opportunityDetails);
    expect(html).toContain("Elevator | Laundry in unit");
    expect(html).toContain("Lots of light | High ceilings");
    expect(html).not.toContain("Private outdoor space");
    expect(html).toContain("Casey Agent, Licensed Real Estate Agent with Example Brokerage");
    expect(html).toContain("Email: casey@example.invalid");
    expect(html).toContain("Phone: 555-0100");
    expect(html).toContain("The fee is paid only once and does not change based on the number of agents assisting you.");
    expect(html).toContain("Your reply will be directed to your registered agent.");
    expect(html).not.toContain("may not be publicly advertised");
    expect(html).not.toContain("Referral Acknowledgment");
  });

  it("escapes all renter and agent authored HTML", () => {
    const html = registeredAgentAllMarketMatchTemplate({
      ...payload,
      renterName: "<script>Jamie</script>",
      registeredAgentFullName: "Casey <script>agent</script>",
      opportunityDetails: "<img src=x onerror=alert(1)>",
      matchSummary: { compatibilityMisses: ["<script>bad</script>"], preferenceMatches: ["<b>Light</b>"] },
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("&lt;b&gt;Light&lt;/b&gt;");
  });

  it("does not invent compatibility data when the match has no search context", () => {
    const html = registeredAgentAllMarketMatchTemplate({ ...payload, matchSummary: undefined, opportunityDetails: undefined });
    expect(html).toContain("Compatibility Misses:</strong> None");
    expect(html).toContain("Preferences Matches:</strong> None");
    expect(html).not.toContain("Message from the agent");
  });

  it("sends exactly one #6C email to the renter with the agent CC'd and as Reply-To", async () => {
    const service = Object.create(EmailService.prototype) as any;
    service.config = { brandColor: "#1890FF", maxRetries: 1 };
    service.sendEmail = vi.fn().mockResolvedValue({ success: true });
    await service.sendRenterOpportunityFoundByRegisteredAgent(payload);
    expect(service.sendEmail).toHaveBeenCalledOnce();
    expect(service.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: { email: payload.to, name: payload.renterName },
      cc: [payload.registeredAgentEmail],
      replyTo: payload.registeredAgentEmail,
      subject: "A renter specialist may assist with your rental search – BeforeListed",
      html: expect.stringContaining("including assistance with publicly listed apartments"),
    }), "REGISTERED_AGENT_MATCH_ALL_MARKET_6C", payload.to);
  });

  it("preserves the registered-agent Upcoming email and additional-opportunity subject", async () => {
    const service = Object.create(EmailService.prototype) as any;
    service.config = { brandColor: "#1890FF", maxRetries: 1 };
    service.sendEmail = vi.fn().mockResolvedValue({ success: true });
    await service.sendRenterOpportunityFoundByRegisteredAgent({ ...payload, requestScope: "Upcoming", additionalOpportunity: true });
    const [options, template] = service.sendEmail.mock.calls[0];
    expect(template).toBe("RENTER_OPPORTUNITY_FOUND_REGISTERED_AGENT");
    expect(options.cc).toBeUndefined();
    expect(options.subject).toContain("An additional opportunity");
    expect(options.html).toContain("may not be publicly advertised");
  });
});
