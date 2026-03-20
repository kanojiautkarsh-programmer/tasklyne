"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Hammer,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Zap,
  Crown,
  Inbox,
  Loader2,
  Plus,
  Play,
} from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import AgentCreationModal from "@/components/AgentCreationModal";
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
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";

const agents = [
  {
    name: "Research Agent",
    description:
      "Analyze markets, competitors, and customer sentiment with AI-powered research.",
    icon: Search,
    href: "/dashboard/research",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    hoverBg: "hover:bg-blue-100",
    borderColor: "border-blue-100 hover:border-blue-300",
  },
  {
    name: "Build Agent",
    description:
      "Generate PRDs, feature specs, user stories, and technical architecture.",
    icon: Hammer,
    href: "/dashboard/build",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    hoverBg: "hover:bg-amber-100",
    borderColor: "border-amber-100 hover:border-amber-300",
  },
  {
    name: "Growth Agent",
    description:
      "Create cold emails, blog content, and onboarding flows to drive growth.",
    icon: TrendingUp,
    href: "/dashboard/growth",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    hoverBg: "hover:bg-emerald-100",
    borderColor: "border-emerald-100 hover:border-emerald-300",
  },
] as const;

// ── Data fetching ──────────────────────────────────────────────────────

interface DashboardStats {
  tasksCompleted: number;
  tokensUsed: number;
  hasApiKey: boolean;
  recentTasks: {
    id: string;
    title: string;
    agent_type: "research" | "build" | "growth";
    status: "pending" | "running" | "completed" | "failed";
    created_at: string;
  }[];
}

async function fetchDashboardStats(userId: string): Promise<DashboardStats> {
  const supabase = createClient();

  // Run all queries in parallel
  const [completedRes, tokensRes, keysRes, recentRes] = await Promise.all([
    // Count completed tasks
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),

    // Sum tokens used
    supabase
      .from("tasks")
      .select("tokens_used")
      .eq("user_id", userId),

    // Check if user has any valid API keys
    supabase
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_valid", true),

    // Get 5 most recent tasks
    supabase
      .from("tasks")
      .select("id, title, agent_type, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const tokensUsed = (tokensRes.data ?? []).reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, row: any) => sum + (row.tokens_used ?? 0),
    0,
  );

  return {
    tasksCompleted: completedRes.count ?? 0,
    tokensUsed,
    hasApiKey: (keysRes.count ?? 0) > 0,
    recentTasks: (recentRes.data ?? []) as DashboardStats["recentTasks"],
  };
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const AGENT_COLORS: Record<string, string> = {
  research: "text-blue-600 bg-blue-50",
  build: "text-amber-600 bg-amber-50",
  growth: "text-emerald-600 bg-emerald-50",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  running: "secondary",
  pending: "outline",
  failed: "destructive",
};

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-taskly-orange text-white",
  running: "bg-blue-100 text-blue-700",
  pending: "bg-gray-100 text-gray-600",
  failed: "bg-red-100 text-red-700",
};

// ── Page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, profile } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: () => fetchDashboardStats(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  });



  const displayName =
    profile?.full_name ?? user?.email?.split("@")[0] ?? "there";
  const tier = profile?.subscription_tier ?? "free";
  const configured = stats?.hasApiKey ?? false;

  return (
    <>
      <Header title="Dashboard" />

      {/* Agent Creation Modal */}
      <AgentCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Onboarding Wizard */}
      <OnboardingWizard />

      <div className="space-y-8 p-4 sm:p-6 lg:p-8">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-taskly-dark font-playfair">
              Welcome back, {displayName}
            </h1>
            <p className="text-gray-500 mt-1">
              Here is a live view of your workspace, agent activity, and recent execution momentum.
            </p>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-taskly-orange text-white px-6 py-3 rounded-xl font-semibold hover:bg-taskly-orange/90 shadow-lg shadow-taskly-orange/25 transition-all hover:scale-105 flex items-center gap-2"
          >
            <Plus className="size-5" />
            Create New Agent
          </Button>
        </div>

        {/* Quick stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <CheckCircle2 className="size-4 text-taskly-orange" />
                Tasks Completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-taskly-dark font-playfair">
                {statsLoading ? (
                  <Loader2 className="size-6 animate-spin text-gray-400" />
                ) : (
                  String(stats?.tasksCompleted ?? 0)
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <Zap className="size-4 text-amber-500" />
                Tokens Used
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-taskly-dark font-playfair">
                {statsLoading ? (
                  <Loader2 className="size-6 animate-spin text-gray-400" />
                ) : (
                  formatTokens(stats?.tokensUsed ?? 0)
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <Crown className="size-4 text-blue-500" />
                Subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-taskly-dark font-playfair">
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Agent cards */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-bold text-taskly-dark font-playfair">AI Agents</h3>
            {!configured && (
              <Badge variant="secondary" className="bg-amber-50 text-amber-700 border border-amber-200">
                API Key Required
              </Badge>
            )}
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => {
              const Icon = agent.icon;

              return (
                <Card
                  key={agent.name}
                  className={cn(
                    "rounded-2xl border bg-white shadow-sm transition-all hover:shadow-xl hover:-translate-y-1",
                    agent.borderColor,
                    agent.hoverBg
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div
                        className={cn("flex size-12 items-center justify-center rounded-xl", agent.bgColor)}
                      >
                        <Icon className={cn("size-6", agent.color)} />
                      </div>
                      <Badge 
                        variant={configured ? "default" : "secondary"}
                        className={configured 
                          ? "bg-taskly-orange text-white" 
                          : "bg-gray-100 text-gray-600"
                        }
                      >
                        {configured ? "Ready" : "Not Configured"}
                      </Badge>
                    </div>
                    <CardTitle className="mt-4 text-lg font-bold text-taskly-dark">
                      {agent.name}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                      {agent.description}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button 
                      asChild 
                      variant={configured ? "default" : "outline"} 
                      className={cn(
                        "w-full gap-2 rounded-xl",
                        configured 
                          ? "bg-taskly-orange text-white hover:bg-taskly-orange/90" 
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      <Link href={agent.href}>
                        <Play className="size-4" />
                        Launch Agent
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent tasks */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-bold text-taskly-dark font-playfair">Recent Tasks</h3>
            <Button 
              variant="ghost" 
              className="text-taskly-orange hover:text-taskly-orange/80 hover:bg-red-50"
            >
              <Link href="/dashboard/tasks">
                View All <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
          </div>
          <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            {statsLoading ? (
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-gray-400" />
              </CardContent>
            ) : stats?.recentTasks && stats.recentTasks.length > 0 ? (
              <CardContent className="divide-y divide-gray-50 p-0">
                {stats.recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={cn(
                          "shrink-0 text-xs font-semibold px-2 py-1 rounded-md uppercase",
                          AGENT_COLORS[task.agent_type] ?? "bg-gray-100 text-gray-600"
                        )}
                      >
                        {task.agent_type}
                      </span>
                      <span className="truncate text-sm font-medium text-taskly-dark">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <Badge 
                        variant={STATUS_VARIANTS[task.status] ?? "outline"}
                        className={cn(
                          "text-xs font-medium",
                          STATUS_COLORS[task.status] ?? ""
                        )}
                      >
                        {task.status}
                      </Badge>
                      <span className="hidden text-xs text-gray-400 sm:inline whitespace-nowrap">
                        {new Date(task.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            ) : (
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-gray-50">
                  <Inbox className="size-7 text-gray-400" />
                </div>
                <p className="text-base font-semibold text-taskly-dark">No tasks yet</p>
                <p className="mt-1 text-sm text-gray-500 max-w-sm">
                  Launch an agent or create a new one to start automating your startup tasks.
                </p>
                <Button 
                  onClick={() => setIsModalOpen(true)}
                  className="mt-4 bg-taskly-orange text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-taskly-orange/90"
                >
                  <Plus className="size-4 mr-2" />
                  Create Your First Task
                </Button>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
