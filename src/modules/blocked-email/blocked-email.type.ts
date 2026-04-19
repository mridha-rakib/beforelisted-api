export const BLOCKED_EMAIL_REASONS = [
  "Spam Activity",
  "Fake Registration",
  "Suspicious Behavior",
  "Duplicate Account",
  "Policy Violation",
  "Admin Decision",
] as const;

export type BlockedEmailReason = (typeof BLOCKED_EMAIL_REASONS)[number];
export type BlockedEmailStatus = "active" | "removed";

export type CreateBlockedEmailPayload = {
  email: string;
  reason: BlockedEmailReason;
};
