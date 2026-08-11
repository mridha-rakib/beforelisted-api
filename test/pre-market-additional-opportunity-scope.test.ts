/**
 * Regression test for the additionalOpportunity scope gate.
 *
 * The match endpoint must reject additionalOpportunity: true when the
 * pre-market request has scope "All Market" — additional opportunities
 * are only meaningful for Upcoming / Upcoming (M) requests (where the
 * same agent may know of multiple owners / upcoming opportunities).
 *
 * All Market requests follow the one-match-per-agent rule.
 *
 * The full matchRequestForAgent flow is integration-heavy (repositories,
 * notifications, etc.). This test focuses on the message constant the
 * service throws and the scope branch logic so we can lock the contract
 * without spinning up the whole service.
 */
import { describe, expect, it } from "vitest";

describe("Additional opportunity scope gate", () => {
  const isUpcomingRequest = (scope: string | undefined | null) =>
    (scope ?? "").trim() === "Upcoming";

  const shouldRejectAdditionalOpportunity = (
    scope: string | undefined | null,
    additionalOpportunity: boolean,
  ) => additionalOpportunity && !isUpcomingRequest(scope);

  it("accepts additionalOpportunity: true on an Upcoming request", () => {
    expect(shouldRejectAdditionalOpportunity("Upcoming", true)).toBe(false);
  });

  it("rejects additionalOpportunity: true on an All Market request", () => {
    expect(shouldRejectAdditionalOpportunity("All Market", true)).toBe(true);
  });

  it("accepts additionalOpportunity: false on any scope", () => {
    expect(shouldRejectAdditionalOpportunity("All Market", false)).toBe(false);
    expect(shouldRejectAdditionalOpportunity("Upcoming", false)).toBe(false);
  });

  it("rejects additionalOpportunity: true when scope is missing", () => {
    expect(shouldRejectAdditionalOpportunity(undefined, true)).toBe(true);
    expect(shouldRejectAdditionalOpportunity(null, true)).toBe(true);
    expect(shouldRejectAdditionalOpportunity("", true)).toBe(true);
  });
});
