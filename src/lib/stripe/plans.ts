import type { PlanConfig, PlanType } from "@/types/stripe";

export const PLANS: Record<PlanType, PlanConfig> = {
  starter: {
    name: "Starter",
    price: 29,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? "",
    features: [
      "50 agent tasks/month",
      "Apollo & SendGrid integrations",
      "Task sharing",
      "3 AI model keys",
      "Email support"
    ],
    taskLimit: 50,
  },
  pro: {
    name: "Pro",
    price: 99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "",
    features: [
      "200 agent tasks/month",
      "All integrations",
      "Advanced analytics",
      "Priority execution",
      "10 AI model keys",
      "Priority support"
    ],
    taskLimit: 200,
  },
  scale: {
    name: "Scale",
    price: 299,
    priceId: process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID ?? "",
    features: [
      "Unlimited tasks",
      "All integrations",
      "Unlimited team seats",
      "Custom branding",
      "SSO & audit logs",
      "Dedicated support"
    ],
    taskLimit: -1,
  },
};

export const FREE_PLAN: {
  name: string;
  price: number;
  features: string[];
  taskLimit: number;
} = {
  name: "Free",
  price: 0,
  features: [
    "5 agent tasks/month",
    "Research, Build & Growth agents",
    "Basic reporting",
    "1 AI model key",
    "Community support"
  ],
  taskLimit: 5,
};
