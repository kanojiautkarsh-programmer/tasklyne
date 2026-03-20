export type SubscriptionTier = "free" | "starter" | "pro" | "scale";

export interface PlanConfig {
  name: string;
  price: number;
  priceId: string;
  features: string[];
  taskLimit: number;
}

export type PlanType = "starter" | "pro" | "scale";
