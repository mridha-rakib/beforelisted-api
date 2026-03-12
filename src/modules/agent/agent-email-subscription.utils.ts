type AgentEmailSubscriptionFlags = {
  emailSubscriptionEnabled?: boolean | null;
  sharedRequestEmailSubscriptionEnabled?: boolean | null;
};

export const resolveSharedRequestEmailSubscriptionEnabled = (
  profile?: AgentEmailSubscriptionFlags | null,
): boolean => {
  if (!profile) {
    return true;
  }

  if (typeof profile.sharedRequestEmailSubscriptionEnabled === "boolean") {
    return profile.sharedRequestEmailSubscriptionEnabled;
  }

  if (typeof profile.emailSubscriptionEnabled === "boolean") {
    return profile.emailSubscriptionEnabled;
  }

  return true;
};
