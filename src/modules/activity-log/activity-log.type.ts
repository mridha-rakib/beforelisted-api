export const ACTIVITY_LOG_ACTION_TYPES = [
  "Email added to blocklist",
  "Email unblocked",
  "Blocked login attempt",
  "Blocked registration attempt",
  "Blocked request submission",
] as const;

export type ActivityLogActionType =
  (typeof ACTIVITY_LOG_ACTION_TYPES)[number];

