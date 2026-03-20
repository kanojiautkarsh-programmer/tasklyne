"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import type { Database } from "@/types/database";
import { Header } from "@/components/dashboard/header";
import { canUseFeature, type SubscriptionTier } from "@/lib/features";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Hammer,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  Trash2,
  Share2,
  Copy,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type AgentType = Task["agent_type"];
type TaskStatus = Task["status"];

type AgentFilter = "all" | AgentType;
type StatusFilter = "all" | TaskStatus;

// ── Constants ──────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const AGENT_TABS: { value: AgentFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "research", label: "Research" },
  { value: "build", label: "Build" },
  { value: "growth", label: "Growth" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

const AGENT_CONFIG: Record<
  AgentType,
  { label: string; icon: React.ElementType; className: string }
> = {
  research: {
    label: "Research",
    icon: Search,
    className:
      "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  },
  build: {
    label: "Build",
    icon: Hammer,
    className:
      "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  },
  growth: {
    label: "Growth",
    icon: TrendingUp,
    className:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
};

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    className:
      "bg-gray-500/15 text-gray-700 dark:text-gray-400",
  },
  running: {
    label: "Running",
    icon: Loader2,
    className:
      "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle,
    className:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className:
      "bg-red-500/15 text-red-700 dark:text-red-400",
  },
};

const STATUS_FILTER_STYLES: Record<StatusFilter, string> = {
  all: "bg-primary text-primary-foreground",
  pending: "bg-gray-500/15 text-gray-700 dark:text-gray-300",
  running: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  failed: "bg-red-500/15 text-red-700 dark:text-red-300",
};

// ── Helpers ────────────────────────────────────────────────────────────

function relativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${Math.floor(diffMonth / 12)}y ago`;
}

function truncateJson(value: unknown, maxLength = 200): string {
  if (value == null) return "No output";
  try {
    const str =
      typeof value === "string" ? value : JSON.stringify(value, null, 2);
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength) + "...";
  } catch {
    return "Unable to display output";
  }
}

function formatOutput(value: unknown): string {
  if (value == null) return "No output available.";
  try {
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2);
  } catch {
    return "Unable to display output";
  }
}

// ── Data fetching ──────────────────────────────────────────────────────

async function fetchTasks(userId: string): Promise<Task[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// ── Page component ─────────────────────────────────────────────────────

// ── Delete mutation ──────────────────────────────────────────────────────

async function deleteTask(taskId: string): Promise<void> {
  const res = await fetch(`/api/tasks/${taskId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to delete task");
  }
}

// ── Page component ─────────────────────────────────────────────────────

export default function TasksPage() {
  const { user, profile, isLoading: isUserLoading } = useUser();
  const queryClient = useQueryClient();
  const [agentFilter, setAgentFilter] = useState<AgentFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dialogTask, setDialogTask] = useState<Task | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const subscriptionTier = (profile?.subscription_tier ?? "free") as SubscriptionTier;

  const {
    data: tasks = [],
    isLoading: isTasksLoading,
    isError,
  } = useQuery({
    queryKey: ["tasks", user?.id],
    queryFn: () => fetchTasks(user!.id),
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      toast.success("Task deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["tasks", user?.id] });
      setDeleteTaskId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const shareMutation = useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, isPublic: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to share task");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Task shared successfully");
      setShareUrl(data.shareUrl);
      setShowShareDialog(true);
      queryClient.invalidateQueries({ queryKey: ["tasks", user?.id] });
    },
    onError: (err: Error) => {
      if (err.message.includes("plan") || err.message.includes("upgrade")) {
        setShowUpgradePrompt(true);
      } else {
        toast.error(err.message);
      }
    },
  });

  const handleShare = (taskId: string) => {
    if (!canUseFeature(subscriptionTier, "sharing")) {
      setShowUpgradePrompt(true);
      return;
    }
    shareMutation.mutate({ taskId });
  };

  // Derived filtered list
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (agentFilter !== "all" && t.agent_type !== agentFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      return true;
    });
  }, [tasks, agentFilter, statusFilter]);

  const visibleTasks = filteredTasks.slice(0, visibleCount);
  const hasMore = visibleCount < filteredTasks.length;

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Reset pagination when filters change
  function handleAgentFilter(value: AgentFilter) {
    setAgentFilter(value);
    setVisibleCount(PAGE_SIZE);
  }

  function handleStatusFilter(value: StatusFilter) {
    setStatusFilter(value);
    setVisibleCount(PAGE_SIZE);
  }

  const isLoading = isUserLoading || isTasksLoading;

  return (
    <>
      <Header
        title="Tasks"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Tasks" },
        ]}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTaskId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTaskId && deleteMutation.mutate(deleteTaskId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Page heading */}
        <PageHeader
          title="Tasks"
          description="Monitor agent runs, inspect outputs, and keep execution history organized."
        />

        <div className="rounded-[28px] border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(243,246,240,0.92))] p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Task history
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                Review every research, build, and growth run in one stream
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                Filter by workflow or status, inspect outputs inline, and open the full result when you need to dig deeper.
              </p>
            </div>
            <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-800">
              {filteredTasks.length} visible tasks
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3 rounded-[24px] border border-border/60 bg-white/78 p-4 shadow-sm backdrop-blur">
          {/* Agent type tabs */}
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1">
            {AGENT_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleAgentFilter(tab.value)}
                className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  agentFilter === tab.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.value !== "all" && (
                  <AgentIcon type={tab.value as AgentType} className="mr-1.5 size-3.5" />
                )}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status filter badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Status:
            </span>
            {STATUS_OPTIONS.map((opt) => {
              const isActive = statusFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleStatusFilter(opt.value)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    isActive
                      ? STATUS_FILTER_STYLES[opt.value]
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <TaskListSkeleton />
        ) : isError ? (
          <ErrorState />
        ) : filteredTasks.length === 0 ? (
          <EmptyState
            hasFilters={agentFilter !== "all" || statusFilter !== "all"}
            onClearFilters={() => {
              setAgentFilter("all");
              setStatusFilter("all");
            }}
          />
        ) : (
          <div className="space-y-3">
            {visibleTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isExpanded={expandedIds.has(task.id)}
                onToggleExpand={() => toggleExpand(task.id)}
                onViewFull={() => setDialogTask(task)}
                onDelete={() => setDeleteTaskId(task.id)}
                onShare={() => handleShare(task.id)}
              />
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="gap-2"
                >
                  <ChevronDown className="size-4" />
                  Load more ({filteredTasks.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full output dialog */}
      <TaskOutputDialog
        task={dialogTask}
        open={!!dialogTask}
        onClose={() => setDialogTask(null)}
      />

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Task Shared!</DialogTitle>
            <DialogDescription>
              Anyone with this link can view your task results.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                value={shareUrl ?? ""}
                readOnly
                className="rounded-xl font-mono text-sm"
              />
              <Button
                variant="outline"
                className="rounded-xl shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl ?? "");
                  toast.success("Link copied to clipboard");
                }}
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowShareDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Prompt */}
      <UpgradePrompt
        open={showUpgradePrompt}
        onOpenChange={setShowUpgradePrompt}
        title="Sharing requires a higher plan"
        description="Upgrade to Starter or higher to share your tasks and reports with others."
        feature="Task Sharing"
        currentTier={subscriptionTier}
        requiredTier="starter"
      />
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function AgentIcon({
  type,
  className,
}: {
  type: AgentType;
  className?: string;
}) {
  const Icon = AGENT_CONFIG[type].icon;
  return <Icon className={className} />;
}

function TaskCard({
  task,
  isExpanded,
  onToggleExpand,
  onViewFull,
  onDelete,
  onShare,
}: {
  task: Task;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onViewFull: () => void;
  onDelete: () => void;
  onShare: () => void;
}) {
  const agent = AGENT_CONFIG[task.agent_type];
  const status = STATUS_CONFIG[task.status];
  const StatusIcon = status.icon;

  return (
    <Card className="gap-0 rounded-[24px] border-border/60 bg-white/82 py-0 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate text-base">
                {task.title}
              </CardTitle>
              <Badge className={agent.className}>
                <AgentIcon type={task.agent_type} className="size-3" />
                {agent.label}
              </Badge>
              <Badge className={status.className}>
                <StatusIcon
                  className={`size-3 ${
                    task.status === "running" ? "animate-spin" : ""
                  }`}
                />
                {status.label}
              </Badge>
            </div>
            {task.description && (
              <CardDescription className="line-clamp-2">
                {task.description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onShare}
              className="size-8 text-gray-400 hover:text-taskly-orange hover:bg-orange-50"
              title="Share task"
            >
              <Share2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="size-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-4" />
            </Button>
            <span className="shrink-0 text-xs text-muted-foreground">
              {relativeTime(task.created_at)}
            </span>
          </div>
        </div>
      </CardHeader>

      {/* Expandable output preview */}
      <CardContent className="px-4 pb-3 pt-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={onToggleExpand}
            className="gap-1 text-muted-foreground"
          >
            <ChevronDown
              className={`size-3 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
            {isExpanded ? "Hide output" : "Show output"}
          </Button>

          {task.tokens_used > 0 && (
            <span className="text-xs text-muted-foreground">
              {task.tokens_used.toLocaleString()} tokens
            </span>
          )}
        </div>

        {isExpanded && (
          <div className="mt-2 space-y-2">
            <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
              {truncateJson(task.output, 600)}
            </pre>
            {task.output != null && (
              <Button variant="outline" size="xs" onClick={onViewFull}>
                View full result
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TaskOutputDialog({
  task,
  open,
  onClose,
}: {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!task) return null;

  const agent = AGENT_CONFIG[task.agent_type];
  const status = STATUS_CONFIG[task.status];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {task.title}
            <Badge className={agent.className}>{agent.label}</Badge>
            <Badge className={status.className}>{status.label}</Badge>
          </DialogTitle>
          <DialogDescription>
            Created {relativeTime(task.created_at)}
            {task.tokens_used > 0 &&
              ` \u00B7 ${task.tokens_used.toLocaleString()} tokens used`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm leading-relaxed">
            {formatOutput(task.output)}
          </pre>
        </ScrollArea>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({
  hasFilters,
  onClearFilters,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <Card className="rounded-[24px] border-border/60 bg-white/80 shadow-sm">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <AlertCircle className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">
          {hasFilters ? "No matching tasks" : "No tasks yet"}
        </p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          {hasFilters
            ? "Try adjusting your filters to see more results."
            : "Launch an agent from the dashboard to create your first task."}
        </p>
        {hasFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="mt-4"
          >
            Clear filters
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ErrorState() {
  return (
    <Card className="rounded-[24px] border-border/60 bg-white/80 shadow-sm">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-red-500/10">
          <XCircle className="size-6 text-red-500" />
        </div>
        <p className="text-sm font-medium">Failed to load tasks</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Something went wrong. Please try refreshing the page.
        </p>
      </CardContent>
    </Card>
  );
}

function TaskListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="gap-0 rounded-[24px] border-border/60 bg-white/80 py-0 shadow-sm">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-72" />
              </div>
              <Skeleton className="h-4 w-14" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <Skeleton className="h-5 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
