import { describe, expect, it } from "vitest";

import { renterOpportunityFoundOtherAgentTemplate } from "../src/services/email-notification.templates";
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

  it("uses Template 6A scope for normal Upcoming request matches", () => {
    const emailScope = resolveRenterOpportunityEmailScope("Upcoming", false);
    const html = renderTemplate(emailScope);

    expect(emailScope).toBe("Upcoming");
    expect(html).toContain("additional agent");
    expect(html).toContain(
      "rental opportunities that may not yet be publicly advertised",
    );
  });
});

function renderTemplate(requestScope: "Upcoming" | "All Market") {
  return renterOpportunityFoundOtherAgentTemplate(
    "Calyn MarkwickSmith",
    requestScope,
    "Matched Agent",
    "Licensed Real Estate Agent",
    "BeforeListed",
    "agent@example.com",
    "555-0100",
    "https://example.com/disclosure",
  );
}
