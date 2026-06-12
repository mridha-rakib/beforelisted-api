import { describe, expect, it } from "vitest";

import {
  ownerRepresentationMatchReferralAcknowledgmentTemplate,
  renterOpportunityFoundOtherAgentTemplate,
  renterOpportunityFoundRegisteredAgentTemplate,
} from "../src/services/email-notification.templates";
import { resolveRenterOpportunityEmailScope } from "../src/modules/pre-market/pre-market-email-scope.utils";

describe("resolveRenterOpportunityEmailScope", () => {
  it("uses Template 6B scope for the first match on an All Market request", () => {
    const emailScope = resolveRenterOpportunityEmailScope("All Market", false);
    const html = renderTemplate(emailScope);

    expect(emailScope).toBe("All Market");
    expect(html).toContain("renter specialist");
    expect(html).toContain(
      "including assistance with publicly listed apartments",
    );
  });

  it("uses Template 6A scope for a later match after All Market becomes Upcoming (M)", () => {
    const emailScope = resolveRenterOpportunityEmailScope("All Market", true);
    const html = renderTemplate(emailScope);

    expect(emailScope).toBe("Upcoming");
    expect(html).toContain("additional agent");
    expect(html).toContain(
      "rental opportunities that may not yet be publicly advertised",
    );
  });

  it("renders Template 6B agent message only when opportunity details are provided", () => {
    const html = renderTemplate(
      "All Market",
      "123 W 85th St - Available Thursday at 3pm.",
    );

    expect(html).toContain("Message from the agent Matched Agent:");
    expect(html).toContain("123 W 85th St - Available Thursday at 3pm.");
    expect(html).not.toContain("Opportunity Details");
    expect(html.indexOf("Message from the agent Matched Agent:")).toBeLessThan(
      html.indexOf("For your reference, the agent"),
    );
  });

  it("omits the Template 6B agent message block when no message was submitted", () => {
    const html = renderTemplate("All Market");

    expect(html).not.toContain("Message from the agent Matched Agent:");
    expect(html).not.toContain("Opportunity Details");
  });

  it("uses Template 6A scope for normal Upcoming request matches", () => {
    const emailScope = resolveRenterOpportunityEmailScope("Upcoming", false);
    const html = renderTemplate(emailScope);

    expect(emailScope).toBe("Upcoming");
    expect(html).toContain("additional agent");
    expect(html).toContain(
      "rental opportunities that may not yet be publicly advertised",
    );
  });

  it("renders Template 6A agent message only when opportunity details are provided", () => {
    const html = renderTemplate(
      "Upcoming",
      "123 W 85th St - Available Thursday at 3pm.",
    );

    expect(html).toContain("Message from the agent Matched Agent:");
    expect(html).toContain('class="agent-message-label"');
    expect(html).toContain('class="agent-message-box"');
    expect(html).toContain("123 W 85th St - Available Thursday at 3pm.");
    expect(html).not.toContain("Opportunity Details");
    expect(html.indexOf("Message from the agent Matched Agent:")).toBeLessThan(
      html.indexOf("For your reference, the additional agent"),
    );
  });

  it("omits the Template 6A agent message block when no message was submitted", () => {
    const html = renderTemplate("Upcoming");

    expect(html).not.toContain("Message from the agent Matched Agent:");
    expect(html).not.toContain('class="agent-message-box"');
    expect(html).not.toContain("Opportunity Details");
  });

  it("renders Template 31B additional opportunity copy without disclosure instructions", () => {
    const html = renderTemplate(
      "Upcoming",
      "123 W 85th St - Available Thursday at 3pm.",
      true,
    );

    expect(html).toContain(
      "the additional agent may be able to assist with your request for another rental opportunities that may not yet be publicly advertised",
    );
    expect(html).toContain("Message from the agent Matched Agent:");
    expect(html).toContain('class="agent-message-box"');
    expect(html).toContain("123 W 85th St - Available Thursday at 3pm.");
    expect(html).toContain("For your reference, the additional agent");
    expect(html).not.toContain("Please sign the document using the link below");
    expect(html).not.toContain("Agent Disclosure");
    expect(html).not.toContain("confirm you received the disclosure");
    expect(html.indexOf("Message from the agent Matched Agent:")).toBeLessThan(
      html.indexOf("For your reference, the additional agent"),
    );
  });

  it("omits Template 31B agent message when no message was submitted", () => {
    const html = renderTemplate("Upcoming", undefined, true);

    expect(html).toContain(
      "the additional agent may be able to assist with your request for another rental opportunities that may not yet be publicly advertised",
    );
    expect(html).not.toContain("Message from the agent Matched Agent:");
    expect(html).not.toContain('class="agent-message-box"');
    expect(html).not.toContain("Agent Disclosure");
  });
});

describe("renterOpportunityFoundRegisteredAgentTemplate", () => {
  it("renders Template 5 agent message only when opportunity details are provided", () => {
    const html = renterOpportunityFoundRegisteredAgentTemplate(
      "Calyn MarkwickSmith",
      "Registered Agent",
      "Licensed Real Estate Agent",
      "BeforeListed Brokerage",
      "registered@example.com",
      "555-0101",
      "123 W 85th St - Available Thursday at 3pm.",
    );

    expect(html).toContain("Good news!");
    expect(html).toContain("Message from the agent Registered Agent:");
    expect(html).toContain("123 W 85th St - Available Thursday at 3pm.");
    expect(html).not.toContain("Opportunity Details");
    expect(html.indexOf("Message from the agent Registered Agent:")).toBeLessThan(
      html.indexOf("Your agent may reach out separately"),
    );
  });

  it("omits the Template 5 agent message block when no message was submitted", () => {
    const html = renterOpportunityFoundRegisteredAgentTemplate(
      "Calyn MarkwickSmith",
      "Registered Agent",
      "Licensed Real Estate Agent",
      "BeforeListed Brokerage",
      "registered@example.com",
      "555-0101",
    );

    expect(html).not.toContain("Message from the agent Registered Agent:");
    expect(html).not.toContain("Opportunity Details");
  });

  it("renders Template 31A additional opportunity copy", () => {
    const html = renterOpportunityFoundRegisteredAgentTemplate(
      "Calyn MarkwickSmith",
      "Registered Agent",
      "Licensed Real Estate Agent",
      "BeforeListed Brokerage",
      "registered@example.com",
      "555-0101",
      "123 W 85th St - Available Thursday at 3pm.",
      undefined,
      "#1890FF",
      true,
    );

    expect(html).toContain(
      "An additional opportunity matching your request has been identified",
    );
    expect(html).toContain(
      "an additional opportunity related to your request has been identified",
    );
    expect(html).toContain("Message from the agent Registered Agent:");
    expect(html).toContain("123 W 85th St - Available Thursday at 3pm.");
    expect(html.indexOf("Message from the agent Registered Agent:")).toBeLessThan(
      html.indexOf("Your agent may reach out separately"),
    );
  });

  it("omits Template 31A agent message when no message was submitted", () => {
    const html = renterOpportunityFoundRegisteredAgentTemplate(
      "Calyn MarkwickSmith",
      "Registered Agent",
      "Licensed Real Estate Agent",
      "BeforeListed Brokerage",
      "registered@example.com",
      "555-0101",
      undefined,
      undefined,
      "#1890FF",
      true,
    );

    expect(html).toContain(
      "an additional opportunity related to your request has been identified",
    );
    expect(html).not.toContain("Message from the agent Registered Agent:");
    expect(html).not.toContain("Opportunity Details");
  });
});

describe("ownerRepresentationMatchReferralAcknowledgmentTemplate", () => {
  it("renders Template 29 agent message before the match confirmation", () => {
    const html = renderOwnerRepresentationTemplate(
      "123 W 85th St - Available Thursday at 3pm.",
    );

    expect(html).toContain("Message from the agent Matched Agent:");
    expect(html).toContain('class="agent-message-label"');
    expect(html).toContain('class="agent-message-box"');
    expect(html).toContain("123 W 85th St - Available Thursday at 3pm.");
    expect(html).not.toContain("Opportunity Details");
    expect(html.indexOf("Message from the agent Matched Agent:")).toBeLessThan(
      html.indexOf("This email confirms that a renter request"),
    );
    expect(html).toContain("Submit Facilitator Referral Agreement");
  });

  it("omits Template 29 agent message when no message was submitted", () => {
    const html = renderOwnerRepresentationTemplate();

    expect(html).not.toContain("Message from the agent Matched Agent:");
    expect(html).not.toContain('class="agent-message-box"');
    expect(html).not.toContain("Opportunity Details");
  });
});

function renderTemplate(
  requestScope: "Upcoming" | "All Market",
  opportunityDetails?: string,
  additionalOpportunity?: boolean,
) {
  return renterOpportunityFoundOtherAgentTemplate(
    "Calyn MarkwickSmith",
    requestScope,
    "Matched Agent",
    "Licensed Real Estate Agent",
    "BeforeListed",
    "agent@example.com",
    "555-0100",
    "https://example.com/disclosure",
    opportunityDetails,
    undefined,
    "#1890FF",
    additionalOpportunity,
  );
}

function renderOwnerRepresentationTemplate(opportunityDetails?: string) {
  return ownerRepresentationMatchReferralAcknowledgmentTemplate(
    "Regina",
    "Calyn MarkwickSmith",
    "REQ-123",
    "Registered Agent",
    "Licensed Real Estate Agent",
    "BeforeListed Brokerage",
    "Matched Agent",
    "Licensed Real Estate Agent",
    "Matched Brokerage",
    "matched@example.com",
    "555-0102",
    opportunityDetails,
    undefined,
    "#1890FF",
    false,
    "https://example.com/facilitator-referral",
  );
}
