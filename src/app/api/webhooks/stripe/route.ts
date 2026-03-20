import { NextRequest, NextResponse } from "next/server";
import { getStripe, PLANS } from "@/lib/stripe/client";
import { createClient } from "@supabase/supabase-js";
import type { PlanType, SubscriptionTier } from "@/types/stripe";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars for admin client.",
    );
  }
  return createClient(url, key);
}

function priceIdToTier(priceId: string): SubscriptionTier {
  for (const [tier, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) {
      return tier as PlanType;
    }
  }
  return "free";
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  const stripe = getStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;

        if (!userId) {
          console.error("No userId in checkout session metadata");
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const priceId = subscription.items.data[0]?.price.id;
        const tier = priceIdToTier(priceId);

        await supabaseAdmin
          .from("profiles")
          .update({
            stripe_customer_id: customerId,
            subscription_tier: tier,
            subscription_status: "active",
          })
          .eq("id", userId);

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id;
        const tier = priceIdToTier(priceId);

        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_tier: tier,
            subscription_status: subscription.status,
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_tier: "free",
            subscription_status: "canceled",
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;

        await supabaseAdmin
          .from("profiles")
          .update({ subscription_status: "past_due" })
          .eq("stripe_customer_id", customerId);

        break;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook handler failed: ${message}`);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
