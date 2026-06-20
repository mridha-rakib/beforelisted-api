import { describe, expect, it } from "vitest";

import {
  agentMatchRequestSchema,
  requestAccessSchema,
} from "../src/modules/pre-market/pre-market.schema";
import {
  hasRiskyOpportunityDetailsWording,
  OPPORTUNITY_DETAILS_RISKY_WORDING_MESSAGE,
} from "../src/utils/opportunity-details.utils";

const validObjectId = "507f1f77bcf86cd799439011";

describe("opportunity details risky wording validation", () => {
  it.each([
    "I have a listing",
    "I have",
    "exclusive",
    "my owner",
    "my landlord",
    "my building",
    "private listing",
    "only through me",
    "off-market listing",
    "guaranteed",
    "no one else has access",
  ])("flags risky phrase: %s", (phrase) => {
    expect(hasRiskyOpportunityDetailsWording(`Details: ${phrase}.`)).toBe(true);
  });

  it("allows neutral factual opportunity details", () => {
    expect(
      hasRiskyOpportunityDetailsWording(
        "123 W 85th St - Available Thursday at 3pm.",
      ),
    ).toBe(false);
  });

  it("accepts 350 characters and rejects 351 characters", () => {
    const request = (opportunityDetails: string) => ({
      params: { requestId: validObjectId },
      body: {
        representation_type: "renter_representation" as const,
        opportunityDetails,
      },
    });

    expect(agentMatchRequestSchema.safeParse(request("a".repeat(350))).success).toBe(true);
    expect(agentMatchRequestSchema.safeParse(request("a".repeat(351))).success).toBe(false);
  });

  it("rejects risky wording on match requests", () => {
    const result = agentMatchRequestSchema.safeParse({
      params: { requestId: validObjectId },
      body: {
        representation_type: "renter_representation",
        opportunityDetails: "I have a listing available Thursday.",
      },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      OPPORTUNITY_DETAILS_RISKY_WORDING_MESSAGE,
    );
  });

  it("rejects risky wording on access requests", () => {
    const result = requestAccessSchema.safeParse({
      body: {
        preMarketRequestId: validObjectId,
        representation_type: "renter_representation",
        opportunityDetails: "No one else has access to this apartment.",
      },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      OPPORTUNITY_DETAILS_RISKY_WORDING_MESSAGE,
    );
  });
});
