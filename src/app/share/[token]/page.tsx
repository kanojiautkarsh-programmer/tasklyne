"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Eye, ExternalLink, Download, BarChart3, Target, TrendingUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SharedTask {
  id: string;
  task_id: string;
  share_token: string;
  is_public: boolean;
  view_count: number;
  created_at: string;
  created_by: string;
}

const AGENT_ICONS: Record<string, React.ElementType> = {
  research: BarChart3,
  build: Target,
  growth: TrendingUp,
};

const AGENT_COLORS: Record<string, { bg: string; text: string }> = {
  research: { bg: "bg-blue-100", text: "text-blue-600" },
  build: { bg: "bg-amber-100", text: "text-amber-600" },
  growth: { bg: "bg-emerald-100", text: "text-emerald-600" },
};

export default function SharedTaskPage() {
  const params = useParams();
  const token = params.token as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<{
    id: string;
    title: string;
    description: string | null;
    agent_type: string;
    status: string;
    created_at: string;
    output: Record<string, unknown> | null;
  } | null>(null);
  const [shareInfo, setShareInfo] = useState<SharedTask | null>(null);

  useEffect(() => {
    async function fetchSharedTask() {
      try {
        const supabase = createClient();

        const { data: sharedTask, error: shareError } = await supabase
          .from("shared_tasks")
          .select("*")
          .eq("share_token", token)
          .single();

        if (shareError || !sharedTask) {
          setError("This shared task could not be found or has been removed.");
          setLoading(false);
          return;
        }

        if (sharedTask.expires_at && new Date(sharedTask.expires_at) < new Date()) {
          setError("This share link has expired.");
          setLoading(false);
          return;
        }

        await supabase
          .from("shared_tasks")
          .update({ view_count: sharedTask.view_count + 1 })
          .eq("id", sharedTask.id);

        setShareInfo(sharedTask as unknown as SharedTask);

        const { data: taskData, error: taskError } = await supabase
          .from("tasks")
          .select("*")
          .eq("id", sharedTask.task_id)
          .single();

        if (taskError || !taskData) {
          setError("The associated task could not be found.");
          setLoading(false);
          return;
        }

        setTask(taskData as typeof task);
      } catch {
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    }

    fetchSharedTask();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-taskly-light">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin mx-auto text-taskly-orange" />
          <p className="mt-4 text-muted-foreground">Loading shared task...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-taskly-light">
        <Card className="max-w-md mx-auto rounded-[24px]">
          <CardContent className="pt-6 text-center">
            <div className="size-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
              <Eye className="size-8 text-red-500" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">Unable to Load</h1>
            <p className="mt-2 text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const agentIcon = AGENT_ICONS[task?.agent_type ?? ""] ?? BarChart3;
  const agentColor = AGENT_COLORS[task?.agent_type ?? ""] ?? { bg: "bg-gray-100", text: "text-gray-600" };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-taskly-light">
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className={`size-12 rounded-xl ${agentColor.bg} flex items-center justify-center`}>
                {(() => {
                  const Icon = agentIcon;
                  return <Icon className={`size-6 ${agentColor.text}`} />;
                })()}
              </div>
              <div>
                <Badge variant="outline" className="capitalize mb-1">{task?.agent_type} Agent</Badge>
                <h1 className="text-3xl font-bold tracking-tight">{task?.title}</h1>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Badge className={task?.status === "completed" ? "bg-green-100 text-green-800" : task?.status === "failed" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}>
                {task?.status}
              </Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="size-4" />
                {new Date(task?.created_at ?? "").toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Eye className="size-4" />
                {shareInfo?.view_count ?? 0} views
              </div>
            </div>
          </div>
          <a 
            href="https://tasklyne.ai" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-taskly-orange hover:underline"
          >
            Powered by TaskLyne <ExternalLink className="size-4" />
          </a>
        </div>

        {task?.description && (
          <Card className="mb-6 rounded-[24px]">
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{task.description}</p>
            </CardContent>
          </Card>
        )}

        {task?.output && (
          <SharedResultsView 
            output={task.output} 
            agentType={task.agent_type} 
            taskId={task.id}

          />
        )}

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Shared via TaskLyne</p>
        </div>
      </div>
    </div>
  );
}

function SharedResultsView({ 
  output, 
  agentType, 
  taskId
}: { 
  output: Record<string, unknown>;
  agentType: string;
  taskId: string;
}) {
  const renderResearchOutput = () => {
    const report = (output.report ?? output) as Record<string, unknown>;
    const growthTrends = (report.growth_trends ?? report.growthTrends ?? []) as unknown[];
    const sources = (report.sources ?? []) as Array<{title?: string; url?: string}>;
    
    const marketOverview: unknown = report.market_overview ?? report.marketOverview ?? report.overview;
    const tam: unknown = report.tam ?? report.TAM;
    const sam: unknown = report.sam ?? report.SAM;
    const som: unknown = report.som ?? report.SOM;

    return (
      <ScrollArea className="h-[calc(100vh-20rem)]">
        <div className="space-y-4 pr-4">
          {marketOverview !== undefined && marketOverview !== null && (
            <Card className="rounded-2xl border border-gray-100 bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Globe className="size-5 text-blue-600" />
                  Market Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-gray-600">
                  {String(marketOverview)}
                </p>
              </CardContent>
            </Card>
          )}

          {(tam !== undefined && tam !== null) || (sam !== undefined && sam !== null) || (som !== undefined && som !== null) ? (
            <Card className="rounded-2xl border border-gray-100 bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Target className="size-5 text-blue-600" />
                  Market Sizing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  {tam !== undefined && tam !== null && <SizingCard label="TAM" value={String(tam)} />}
                  {sam !== undefined && sam !== null && <SizingCard label="SAM" value={String(sam)} />}
                  {som !== undefined && som !== null && <SizingCard label="SOM" value={String(som)} />}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {growthTrends.length > 0 && (
            <Card className="rounded-2xl border border-gray-100 bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Key Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {growthTrends.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-1 size-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-600">
                        {i + 1}
                      </div>
                      <p className="text-sm text-gray-600">{String(item)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {sources.length > 0 && (
            <Card className="rounded-2xl border border-gray-100 bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sources.slice(0, 10).map((source, i) => (
                    <a 
                      key={i}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      {source.title ?? source.url}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    );
  };

  const renderBuildOutput = () => {
    const artifact = output.artifact ?? output;

    return (
      <Card className="rounded-2xl border border-gray-100 bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">Build Artifact</CardTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(artifact, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `artifact-${taskId}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 text-sm text-taskly-orange hover:underline"
              >
                <Download className="size-4" />
                Export
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-xl overflow-auto max-h-96">
            {JSON.stringify(artifact, null, 2)}
          </pre>
        </CardContent>
      </Card>
    );
  };

  const renderGrowthOutput = () => {
    const content = output.content ?? output.generatedContent ?? output;
    const leads = (output.leads ?? []) as Array<Record<string, unknown>>;
    const delivery = output.delivery as { sent?: number; failed?: number } | null;

    return (
      <div className="space-y-4">
        {content && (
          <Card className="rounded-2xl border border-gray-100 bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Generated Content</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-xl overflow-auto max-h-96">
                {JSON.stringify(content, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {leads.length > 0 && (
          <Card className="rounded-2xl border border-gray-100 bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Target Audience ({leads.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leads.slice(0, 20).map((lead, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                    <div className="size-8 rounded-full bg-taskly-orange/10 flex items-center justify-center text-xs font-bold text-taskly-orange">
                      {(lead.name as string)?.[0] ?? (lead.email as string)?.[0] ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{(lead.name as string) ?? "Unknown"}</p>
                      <p className="text-xs text-gray-500">{(lead.email as string) ?? ""}</p>
                    </div>
                  </div>
                ))}
                {leads.length > 20 && (
                  <p className="text-sm text-gray-500 text-center py-2">
                    +{leads.length - 20} more leads
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {delivery && (
          <Card className="rounded-2xl border border-gray-100 bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Delivery Results</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{delivery.sent ?? 0}</p>
                <p className="text-sm text-gray-500">Sent</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{delivery.failed ?? 0}</p>
                <p className="text-sm text-gray-500">Failed</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderDefaultOutput = () => (
    <Card className="rounded-2xl border border-gray-100 bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold">Results</CardTitle>
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `results-${taskId}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 text-sm text-taskly-orange hover:underline"
          >
            <Download className="size-4" />
            Export
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-xl overflow-auto max-h-96">
          {JSON.stringify(output, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );

  return (
    <>
      {agentType === "research" && renderResearchOutput()}
      {agentType === "build" && renderBuildOutput()}
      {agentType === "growth" && renderGrowthOutput()}
      {!["research", "build", "growth"].includes(agentType) && renderDefaultOutput()}
    </>
  );
}

function SizingCard({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-taskly-dark">{String(value)}</p>
    </div>
  );
}

function Globe({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}
