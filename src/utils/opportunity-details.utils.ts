export const RISKY_OPPORTUNITY_DETAIL_PHRASES = [
  "I have a listing",
  "exclusive",
  "my owner",
  "my landlord",
  "my building",
  "private listing",
  "only through me",
  "off-market listing",
  "guaranteed",
  "no one else has access",
] as const;

const RISKY_OPPORTUNITY_DETAIL_PATTERN = new RegExp(
  RISKY_OPPORTUNITY_DETAIL_PHRASES.map(escapeRegExp).join("|"),
  "i",
);

export const OPPORTUNITY_DETAILS_RISKY_WORDING_MESSAGE
  = "Please revise this wording to use neutral, factual language. The message should not suggest that you represent the owner unless that has been properly selected and disclosed.";

export function hasRiskyOpportunityDetailsWording(value?: string | null): boolean {
  return RISKY_OPPORTUNITY_DETAIL_PATTERN.test(value || "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
