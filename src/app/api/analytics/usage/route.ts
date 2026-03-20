import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, supabase, error: "Unauthorized" };
  }

  return { user, supabase, error: null };
}

export async function GET(request: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const rl = rateLimit(`analytics:${user.id}`, { maxRequests: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get("period") || "30d";
  const agentType = searchParams.get("agentType");

  const startDate = new Date();
  switch (period) {
    case "7d":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(startDate.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(startDate.getDate() - 90);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }

  let query = supabase
    .from("usage_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: true });

  if (agentType && agentType !== "all") {
    query = query.eq("agent_type", agentType);
  }

  const { data: usageLogs, error: logsError } = await query;

  if (logsError) {
    return NextResponse.json(
      { error: "Failed to fetch usage logs" },
      { status: 500 }
    );
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("agent_type, status, tokens_used, created_at")
    .eq("user_id", user.id)
    .gte("created_at", startDate.toISOString());

  const { count: totalTasks } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const totalTokens = usageLogs?.reduce((sum, log) => sum + (log.tokens_used || 0), 0) ?? 0;

  const tasksByAgent = tasks?.reduce((acc, task) => {
    acc[task.agent_type] = (acc[task.agent_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const tasksByStatus = tasks?.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const dailyUsage = usageLogs?.reduce((acc, log) => {
    const date = new Date(log.created_at).toISOString().split("T")[0];
    if (!acc[date]) {
      acc[date] = { tokens: 0, actions: 0 };
    }
    acc[date].tokens += log.tokens_used || 0;
    acc[date].actions += 1;
    return acc;
  }, {} as Record<string, { tokens: number; actions: number }>) ?? {};

  const dailyTasks = tasks?.reduce((acc, task) => {
    const date = task.created_at.split("T")[0];
    if (!acc[date]) {
      acc[date] = 0;
    }
    acc[date] += 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const recentLogs = usageLogs?.slice(-10).reverse() ?? [];

  return NextResponse.json({
    period,
    summary: {
      totalTokens,
      totalTasks: totalTasks ?? 0,
      totalLogs: usageLogs?.length ?? 0,
    },
    tasksByAgent,
    tasksByStatus,
    dailyUsage: Object.entries(dailyUsage).map(([date, data]) => ({
      date,
      ...data,
    })),
    dailyTasks: Object.entries(dailyTasks).map(([date, count]) => ({
      date,
      count,
    })),
    recentLogs,
  });
}
