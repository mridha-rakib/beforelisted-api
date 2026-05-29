export type RenterOpportunityEmailScope = "Upcoming" | "All Market";

export function resolveRenterOpportunityEmailScope(
  requestScope: string | undefined,
  alreadyMatched: boolean,
): RenterOpportunityEmailScope {
  if (requestScope === "All Market" && !alreadyMatched) {
    return "All Market";
  }

  return "Upcoming";
}
