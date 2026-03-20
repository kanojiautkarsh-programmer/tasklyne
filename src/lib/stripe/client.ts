import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Lazily initialised Stripe client.
 * Avoids crashing at module-evaluation time when STRIPE_SECRET_KEY is not set
 * (e.g. during `next build` in CI where env vars aren't available).
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY environment variable is not set. Cannot initialise Stripe.",
      );
    }
    _stripe = new Stripe(key, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return _stripe;
}

/**
 * @deprecated Use `getStripe()` instead. Kept for backwards-compat — will
 * throw at runtime if the env var is missing rather than at import time.
 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getStripe() as any)[prop];
  },
});

// Re-export PLANS from the client-safe plans module so existing server-side
// imports (`import { PLANS } from "@/lib/stripe/client"`) continue to work.
export { PLANS, FREE_PLAN } from "./plans";
