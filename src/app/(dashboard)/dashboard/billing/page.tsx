"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PLANS, FREE_PLAN } from "@/lib/stripe/plans";
import { Header } from "@/components/dashboard/header";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  createCheckoutSession,
  createPortalSession,
} from "@/lib/stripe/actions";
import type { PlanType, SubscriptionTier } from "@/types/stripe";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  CreditCard,
  Loader2,
  ExternalLink,
  BarChart3,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

interface UserBillingData {
  userId: string;
  tier: SubscriptionTier;
  status: string;
  stripeCustomerId: string | null;
  usageCount: number;
}

// ── All plans for comparison grid ──────────────────────────────────────

const ALL_PLANS: {
  key: SubscriptionTier;
  name: string;
  price: number;
  features: string[];
  taskLimit: number;
}[] = [
  { key: "free", ...FREE_PLAN },
  { key: "starter", ...PLANS.starter },
  { key: "pro", ...PLANS.pro },
  { key: "scale", ...PLANS.scale },
];

// ── Billing page ───────────────────────────────────────────────────────

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Show toast for Stripe redirect results
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Subscription activated! Welcome to your new plan.");
    }
    if (searchParams.get("canceled") === "true") {
      toast.info("Checkout canceled. No changes were made.");
    }
  }, [searchParams]);

  const {
    data: billing,
    isLoading,
    isError,
  } = useQuery<UserBillingData>({
    queryKey: ["billing"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "subscription_tier, subscription_status, stripe_customer_id",
        )
        .eq("id", user.id)
        .single();

      // Count tasks created this month for usage tracking
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth.toISOString());

      return {
        userId: user.id,
        tier: profile?.subscription_tier ?? "free",
        status: profile?.subscription_status ?? "active",
        stripeCustomerId: profile?.stripe_customer_id ?? null,
        usageCount: count ?? 0,
      };
    },
  });

  const currentPlan = useMemo(() => {
    if (!billing) return ALL_PLANS[0];
    return ALL_PLANS.find((p) => p.key === billing.tier) ?? ALL_PLANS[0];
  }, [billing]);

  const taskLimit = currentPlan.taskLimit === -1 ? Infinity : currentPlan.taskLimit;
  const usagePercent =
    taskLimit === Infinity
      ? 0
      : Math.min(100, ((billing?.usageCount ?? 0) / taskLimit) * 100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !billing) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Failed to load billing information. Please try again.
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleUpgrade(planKey: PlanType) {
    if (!billing) return;
    const plan = PLANS[planKey];
    try {
      const url = await createCheckoutSession(plan.priceId);
      if (url) window.location.assign(url);
    } catch {
      toast.error("Failed to start checkout. Please try again.");
    }
  }

  async function handleManageSubscription() {
    if (!billing?.stripeCustomerId) return;
    try {
      const url = await createPortalSession(billing.stripeCustomerId);
      if (url) window.location.assign(url);
    } catch {
      toast.error("Failed to open billing portal. Please try again.");
    }
  }

  return (
    <>
      <Header
        title="Billing"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Billing" },
        ]}
      />

      <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6 lg:p-8">
        <PageHeader
          title="Billing"
          description="Manage your subscription, monitor task usage, and upgrade when your workspace needs more scale."
        />

        <div className="rounded-[28px] border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.84),rgba(243,247,241,0.9))] p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Billing overview
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                Keep platform spend and usage visibility in one place
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                TaskLyne billing covers the orchestration layer while your model costs remain separate through BYOK providers.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-border/60 bg-white px-4 py-3 text-center shadow-sm">
                <p className="text-lg font-semibold text-foreground">{currentPlan.name}</p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Current plan</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-white px-4 py-3 text-center shadow-sm">
                <p className="text-lg font-semibold text-foreground">{billing.usageCount}</p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Tasks used</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-white px-4 py-3 text-center shadow-sm">
                <p className="text-lg font-semibold text-foreground">{taskLimit === Infinity ? "∞" : taskLimit}</p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Task limit</p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Plan + Usage */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Current plan card */}
        <Card className="rounded-[24px] border-border/60 bg-white/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-5" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">{currentPlan.name}</span>
              <Badge variant="secondary">
                {billing.status === "active" ? "Active" : billing.status}
              </Badge>
            </div>
            <p className="text-3xl font-bold">
              ${currentPlan.price}
              <span className="text-base font-normal text-muted-foreground">
                /mo
              </span>
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {currentPlan.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-500" />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
          {billing.stripeCustomerId && billing.tier !== "free" && (
            <CardFooter>
              <Button
                variant="outline"
                onClick={handleManageSubscription}
              >
                <ExternalLink className="size-4" />
                Manage Subscription
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Usage card */}
        <Card className="rounded-[24px] border-border/60 bg-white/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-5" />
              Monthly Usage
            </CardTitle>
            <CardDescription>Tasks used this billing period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold">{billing.usageCount}</span>
              <span className="text-sm text-muted-foreground">
                /{" "}
                {taskLimit === Infinity
                  ? "Unlimited"
                  : taskLimit}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePercent > 90
                    ? "bg-destructive"
                    : usagePercent > 70
                      ? "bg-yellow-500"
                      : "bg-emerald-500"
                }`}
                style={{
                  width:
                    taskLimit === Infinity
                      ? "5%"
                      : `${Math.max(2, usagePercent)}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {taskLimit === Infinity
                ? "Unlimited tasks on your current plan."
                : usagePercent >= 100
                  ? "You've reached your task limit. Upgrade to continue."
                  : `${Math.round(usagePercent)}% of your monthly limit used.`}
            </p>
          </CardContent>
        </Card>
      </div>

        <Separator />

        {/* Plan comparison grid */}
        <div>
        <h2 className="mb-4 text-xl font-semibold">Plans</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ALL_PLANS.map((plan) => {
            const isCurrent = plan.key === billing.tier;
            const isPaid = plan.key !== "free";

            return (
              <Card
                key={plan.key}
                className={
                  isCurrent
                    ? "rounded-[24px] border-primary bg-white shadow-md"
                    : "rounded-[24px] border-border/60 bg-white/80 shadow-sm"
                }
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {isCurrent && (
                      <Badge className="text-xs">Current</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    <span className="text-2xl font-bold text-foreground">
                      ${plan.price}
                    </span>
                    <span className="text-muted-foreground">/mo</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrent ? (
                    <Button className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : isPaid ? (
                    <Button
                      className="w-full"
                      onClick={() =>
                        handleUpgrade(plan.key as PlanType)
                      }
                    >
                      Upgrade
                    </Button>
                  ) : (
                    <Button className="w-full" variant="outline" disabled>
                      Free Tier
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
        </div>
      </div>
    </>
  );
}
