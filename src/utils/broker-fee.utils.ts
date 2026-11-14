export const BROKER_FEE_REQUIRED_MESSAGE
  = "Please select a broker fee before confirming the match.";

export function isBrokerFeeMissing(brokerFee: string | undefined): boolean {
  return !brokerFee?.trim();
}
