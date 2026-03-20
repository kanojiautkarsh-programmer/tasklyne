/**
 * Task limit enforcement.
 *
 * Checks the user's current billing period usage against their plan's
 * task limit before allowing a new task to be created.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { PLANS, FREE_PLAN } from "@/lib/stripe/plans";
import type { SubscriptionTier } from "@/types/stripe";

export interface TaskLimitResult {
  allowed: boolean;
  used: number;
  limit: number; // -1 means unlimited
  message?: string;
}

/**
 * Check whether the user is allowed to create another task.
 */
export async function checkTaskLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<TaskLimitResult> {
  // 1. Get the user's current tier
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .single();

  const tier: SubscriptionTier = profile?.subscription_tier ?? "free";

  // 2. Determine the limit
  let taskLimit: number;
  if (tier === "free") {
    taskLimit = FREE_PLAN.taskLimit;
  } else {
    const plan = PLANS[tier as keyof typeof PLANS];
    taskLimit = plan?.taskLimit ?? FREE_PLAN.taskLimit;
  }

  // Unlimited
  if (taskLimit === -1) {
    return { allowed: true, used: 0, limit: -1 };
  }

  // 3. Count tasks created this billing period (calendar month)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString());

  const used = count ?? 0;

  if (used >= taskLimit) {
    return {
      allowed: false,
      used,
      limit: taskLimit,
      message: `You have reached your monthly task limit of ${taskLimit}. Please upgrade your plan.`,
    };
  }

  return { allowed: true, used, limit: taskLimit };
}
