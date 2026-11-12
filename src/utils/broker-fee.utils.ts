export const RENTER_BROKER_FEE_REQUIRED_MESSAGE
  = "Please select a broker fee when representing the renter.";

export function isRenterBrokerFeeMissing(
  representationType: string | undefined,
  brokerFee: string | undefined,
): boolean {
  return (representationType ?? "renter_representation") === "renter_representation"
    && !brokerFee?.trim();
}
