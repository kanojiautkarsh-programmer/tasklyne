export type SubscriptionTier = "free" | "starter" | "pro" | "scale";

export interface PlanLimits {
  tasksPerMonth: number;
  teamMembers: number;
  apiKeys: number;
  integrations: boolean;
  sharing: boolean;
  advancedAnalytics: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
  sso: boolean;
  auditLogs: boolean;
}

export const PLAN_LIMITS: Record<SubscriptionTier, PlanLimits> = {
  free: {
    tasksPerMonth: 5,
    teamMembers: 1,
    apiKeys: 1,
    integrations: false,
    sharing: false,
    advancedAnalytics: false,
    prioritySupport: false,
    customBranding: false,
    sso: false,
    auditLogs: false,
  },
  starter: {
    tasksPerMonth: 50,
    teamMembers: 3,
    apiKeys: 3,
    integrations: true,
    sharing: true,
    advancedAnalytics: false,
    prioritySupport: false,
    customBranding: false,
    sso: false,
    auditLogs: false,
  },
  pro: {
    tasksPerMonth: 200,
    teamMembers: 10,
    apiKeys: 10,
    integrations: true,
    sharing: true,
    advancedAnalytics: true,
    prioritySupport: true,
    customBranding: false,
    sso: false,
    auditLogs: false,
  },
  scale: {
    tasksPerMonth: -1, // unlimited
    teamMembers: -1, // unlimited
    apiKeys: -1, // unlimited
    integrations: true,
    sharing: true,
    advancedAnalytics: true,
    prioritySupport: true,
    customBranding: true,
    sso: true,
    auditLogs: true,
  },
};

export function canUseFeature(
  tier: SubscriptionTier,
  feature: keyof PlanLimits
): boolean {
  const limits = PLAN_LIMITS[tier];
  const value = limits[feature];
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value > 0 || value === -1;
  }
  return false;
}

export function getTaskLimit(tier: SubscriptionTier): number {
  return PLAN_LIMITS[tier].tasksPerMonth;
}

export function getTeamLimit(tier: SubscriptionTier): number {
  return PLAN_LIMITS[tier].teamMembers;
}

export function canUpgrade(tier: SubscriptionTier): boolean {
  return tier !== "scale";
}

export function getNextTier(tier: SubscriptionTier): SubscriptionTier | null {
  switch (tier) {
    case "free":
      return "starter";
    case "starter":
      return "pro";
    case "pro":
      return "scale";
    case "scale":
      return null;
  }
}

export const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  scale: "Scale",
};

export const TIER_PRICES: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 29,
  pro: 99,
  scale: 299,
};
