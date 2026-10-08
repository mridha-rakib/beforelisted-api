import { env } from "@/env";

/**
 * The public BeforeListed website used in every outbound email.
 * Keep this sourced from CLIENT_URL so a future domain change has one setting.
 */
export function getProductionClientUrl(): string {
  return env.CLIENT_URL.replace(/\/+$/, "");
}

export function getPrivacyPolicyUrl(): string {
  return `${getProductionClientUrl()}/privacy-policy`;
}

export function getTermsAndConditionsUrl(): string {
  return `${getProductionClientUrl()}/terms-conditions`;
}
