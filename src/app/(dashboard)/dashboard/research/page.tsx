"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  BarChart3,
  Users,
  MessageCircle,
  BrainCircuit,
  Sparkles,
  Gem,
  Download,
  ExternalLink,
  TrendingUp,
  Target,
  ShieldAlert,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Star,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Globe,
  Wifi,
  X,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { Header } from "@/components/dashboard/header";
import AgentCreationModal from "@/components/AgentCreationModal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStreamingAgent } from "@/hooks/use-streaming-agent";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────

type ResearchType = "market_analysis" | "competitor" | "sentiment";
type Provider = "openai" | "anthropic" | "gemini";

interface ResearchRequest {
  researchType: ResearchType;
  query: string;
  provider: Provider;
}

interface ResearchResponse {
  taskId: string;
  status: string;
  report: Record<string, unknown>;
}

// ── Constants ───────────────────────────────────────────────────────────

const RESEARCH_TYPES: {
  id: ResearchType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  placeholder: string;
}[] = [
  {
    id: "market_analysis",
    label: "Market Analysis",
    description: "Analyze market size, trends, and opportunities",
    icon: BarChart3,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-100 hover:border-blue-300",
    placeholder:
      "Describe the market you want to analyze...\n\nExample: Analyze the global SaaS project management tools market, including market size, growth trends, key players, and emerging opportunities for 2024-2028.",
  },
  {
    id: "competitor",
    label: "Competitor Analysis",
    description: "Deep-dive into competitors and market positioning",
    icon: Users,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-100 hover:border-amber-300",
    placeholder:
      "Describe the competitors or market you want to analyze...\n\nExample: Compare the top 5 AI writing assistants (Jasper, Copy.ai, Writesonic, Rytr, and Grammarly) including features, pricing, market share, and differentiation.",
  },
  {
    id: "sentiment",
    label: "Sentiment Analysis",
    description: "Understand customer sentiment and feedback patterns",
    icon: MessageCircle,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-100 hover:border-emerald-300",
    placeholder:
      "Describe the product, brand, or topic for sentiment analysis...\n\nExample: Analyze customer sentiment around Notion's recent AI features, including pain points, satisfaction drivers, and feature requests from public reviews and social media.",
  },
];

const PROVIDERS: {
  id: Provider;
  name: string;
  icon: React.ElementType;
}[] = [
  { id: "openai", name: "OpenAI", icon: BrainCircuit },
  { id: "anthropic", name: "Anthropic", icon: Sparkles },
  { id: "gemini", name: "Gemini", icon: Gem },
];

// ── API helper ──────────────────────────────────────────────────────────

async function runResearch(
  payload: ResearchRequest,
): Promise<ResearchResponse> {
  const res = await fetch("/api/agents/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Research request failed");
  }
  return res.json();
}

// ── Main page ───────────────────────────────────────────────────────────

function PreFillHandler({
  onPreFill,
}: {
  onPreFill: (name: string, goal: string) => void;
}) {
  const searchParams = useSearchParams();
  const name = searchParams.get("name");
  const goal = searchParams.get("goal");

  useEffect(() => {
    if (name || goal) {
      onPreFill(name ?? "", goal ?? "");
    }
  }, [name, goal, onPreFill]);

  return null;
}

export default function ResearchPage() {
  const [selectedType, setSelectedType] =
    useState<ResearchType>("market_analysis");
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<Provider>("openai");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [streamMode, setStreamMode] = useState(false);
  const [finalResult, setFinalResult] = useState<ResearchResponse | null>(null);

  const { state: stream, startStream, cancel, reset } = useStreamingAgent();
  const isStreaming = stream.isStreaming;

  const mutation = useMutation({
    mutationFn: runResearch,
    onSuccess: (data) => {
      setFinalResult(data);
      toast.success("Research completed.");
    },
    onError: (err: Error) => {
      const message = err.message;
      if (message.includes("image") && message.includes("does not support")) {
        toast.error("Image input is not supported. Please enter a text query only.");
      } else {
        toast.error(message);
      }
    },
  });

  const isRunning = mutation.isPending;
  const result = finalResult ?? null;
  const currentType = RESEARCH_TYPES.find((t) => t.id === selectedType)!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      toast.error("Please enter a research query.");
      return;
    }
    if (streamMode) {
      reset();
      setFinalResult(null);
      startStream("/api/agents/research", {
        researchType: selectedType,
        query: trimmed,
        provider,
      });
    } else {
      mutation.mutate({
        researchType: selectedType,
        query: trimmed,
        provider,
      });
    }
  };

  const handlePreFill = (name: string, goal: string) => {
    if (goal) setQuery(goal);
  };

  return (
    <>
      <Header 
        title="Research Agent" 
        showCreateButton={true}
        onCreateClick={() => setIsModalOpen(true)}
      />

      <AgentCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <Suspense fallback={null}>
        <PreFillHandler onPreFill={handlePreFill} />
      </Suspense>

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Hero Section */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-gray-400 font-medium">
                Research workspace
              </p>
              <h2 className="mt-2 text-2xl font-bold text-taskly-dark font-playfair">
                Structured market intelligence for faster decisions
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-500">
                Choose a research workflow, describe the market question clearly, and TaskLyne returns a saved report you can act on.
              </p>
            </div>
            <Badge className="bg-taskly-orange text-white rounded-full px-4 py-1">
              {currentType.label}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          {/* ── Form Section ─────────────────────────────────────── */}
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Research Type */}
              <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-taskly-dark">Research Type</CardTitle>
                  <CardDescription className="text-sm text-gray-500">
                    Select the type of research to perform
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {RESEARCH_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isActive = selectedType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setSelectedType(type.id)}
                        disabled={isRunning}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200",
                          isActive
                            ? "border-taskly-orange bg-taskly-orange/5"
                            : "border-gray-100 hover:border-gray-200 hover:bg-gray-50",
                          "disabled:pointer-events-none disabled:opacity-50"
                        )}
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg",
                            type.bgColor
                          )}
                        >
                          <Icon className={cn("size-5", type.color)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-taskly-dark">{type.label}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {type.description}
                          </p>
                        </div>
                        {isActive && (
                          <div className="mt-1 size-5 shrink-0 rounded-full bg-taskly-orange flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Query */}
              <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-taskly-dark">Research Query</CardTitle>
                  <CardDescription className="text-sm text-gray-500">
                    Describe what you want to research in detail
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    id="research-query"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onPaste={(e) => {
                      const clipboardData = e.clipboardData || (e as unknown as { nativeEvent?: ClipboardEvent }).nativeEvent?.clipboardData;
                      if (clipboardData && clipboardData.items) {
                        for (let i = 0; i < clipboardData.items.length; i++) {
                          const item = clipboardData.items[i];
                          if (item.type.startsWith('image/')) {
                            e.preventDefault();
                            toast.error("Image paste is not supported. Please enter your query as text.");
                            return;
                          }
                        }
                      }
                    }}
                    placeholder={currentType.placeholder}
                    disabled={isRunning}
                    className="min-h-[160px] resize-y rounded-xl border-gray-200 focus:border-taskly-orange focus:ring-4 focus:ring-taskly-orange/10"
                  />
                  <p className="text-xs text-gray-400">
                    Be as specific as possible for better results. Include industries, timeframes, or specific companies if relevant. Image input is not currently supported.
                  </p>
                </CardContent>
              </Card>

              {/* Provider + Submit */}
              <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="provider-select" className="text-sm font-semibold text-taskly-dark">AI Provider</Label>
                      <Select
                        value={provider}
                        onValueChange={(val) => setProvider(val as Provider)}
                        disabled={isRunning}
                      >
                        <SelectTrigger id="provider-select" className="w-full rounded-xl border-gray-200 focus:border-taskly-orange">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROVIDERS.map((p) => {
                            const PIcon = p.icon;
                            return (
                              <SelectItem key={p.id} value={p.id} className="rounded-lg">
                                <div className="flex items-center gap-2">
                                  <PIcon className="size-4" />
                                  {p.name}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                      <button
                        type="button"
                        onClick={() => setStreamMode(false)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                          !streamMode
                            ? "bg-taskly-orange text-white"
                            : "text-gray-500 hover:bg-gray-100",
                        )}
                      >
                        Instant
                      </button>
                      <button
                        type="button"
                        onClick={() => setStreamMode(true)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1",
                          streamMode
                            ? "bg-taskly-orange text-white"
                            : "text-gray-500 hover:bg-gray-100",
                        )}
                      >
                        <Wifi className="size-3" />
                        Stream
                      </button>
                      <span className="text-xs text-gray-400">
                        {streamMode ? "See tokens as they generate" : "Full result when ready"}
                      </span>
                    </div>

                    <Button
                      type="submit"
                      className="w-full rounded-xl bg-taskly-orange text-white hover:bg-taskly-orange/90 shadow-lg shadow-taskly-orange/25 py-6 text-base font-semibold transition-all hover:scale-[1.02]"
                      disabled={(isRunning || isStreaming) || !query.trim()}
                    >
                      {isRunning ? (
                        <>
                          <Loader2 className="size-5 animate-spin mr-2" />
                          Running Research...
                        </>
                      ) : isStreaming ? (
                        <>
                          <Loader2 className="size-5 animate-spin mr-2" />
                          Streaming...
                        </>
                      ) : (
                        <>
                          <Search className="size-5 mr-2" />
                          Run Research
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>

          {/* ── Results Section ───────────────────────────────────── */}
          <div className="min-w-0">
            {!result && !isRunning && !isStreaming && !mutation.isError && <EmptyState />}
            {(isRunning || isStreaming) && (
              <StreamingProgress
                status={stream.status}
                content={stream.content}
                onCancel={cancel}
              />
            )}
            {mutation.isError && !isRunning && !isStreaming && (
              <ErrorState
                message={mutation.error?.message ?? "Something went wrong"}
                onRetry={() =>
                  mutation.mutate({
                    researchType: selectedType,
                    query: query.trim(),
                    provider,
                  })
                }
              />
            )}
            {result && !isRunning && !isStreaming && (
              <ResultsView
                report={result.report}
                researchType={selectedType}
                taskId={result.taskId}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Empty State ─────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <Card className="flex min-h-[400px] items-center justify-center rounded-2xl border border-gray-100 bg-white">
      <CardContent className="flex flex-col items-center text-center p-8">
        <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-gray-50">
          <Search className="size-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-taskly-dark font-playfair">No Research Yet</h3>
        <p className="mt-3 max-w-sm text-sm text-gray-500">
          Configure a research type, describe your query, and hit &quot;Run Research&quot; to generate a structured report.
        </p>
      </CardContent>
    </Card>
  );
}

// ── Error State ─────────────────────────────────────────────────────────

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card className="rounded-2xl border border-red-100 bg-white">
      <CardContent className="flex flex-col items-center py-12 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="size-7 text-red-500" />
        </div>
        <h3 className="font-bold text-taskly-dark text-lg">Research Failed</h3>
        <p className="mt-2 max-w-sm text-sm text-gray-500">
          {message}
        </p>
        <Button 
          variant="outline" 
          className="mt-5 rounded-xl border-gray-200 hover:bg-gray-50"
          onClick={onRetry}
        >
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Streaming Progress ───────────────────────────────────────────────────

function StreamingProgress({
  status,
  content,
  onCancel,
}: {
  status: string;
  content: string;
  onCancel: () => void;
}) {
  const hasContent = content.length > 0;

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <Card className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white">
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-blue-100">
                <Zap className="size-5 text-blue-600 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-semibold text-taskly-dark">AI is working...</p>
                <p className="text-xs text-gray-500">
                  {status || "Processing your research request"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <X className="size-3.5 mr-1.5" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Steps */}
      <Card className="rounded-2xl border border-gray-100 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-taskly-dark">Research Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step indicators */}
          <div className="grid grid-cols-4 gap-2">
            {["Planning", "Searching", "Analyzing", "Compiling"].map((step, i) => {
              const isComplete = status.toLowerCase().includes(["planning", "searching", "analyzing", "compiling"][i] as string);
              const isCurrent = !isComplete && (i === 0 || status.toLowerCase().includes(["planning", "searching", "analyzing", "compiling"][i - 1] as string));
              
              return (
                <div key={step} className="flex flex-col items-center">
                  <div className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2 mb-1 transition-all",
                    isComplete 
                      ? "bg-emerald-500 border-emerald-500 text-white" 
                      : isCurrent
                        ? "bg-blue-500 border-blue-500 text-white animate-pulse"
                        : "bg-gray-50 border-gray-200 text-gray-400"
                  )}>
                    {isComplete ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <span className="text-xs font-bold">{i + 1}</span>
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] text-center",
                    isComplete ? "text-emerald-600 font-medium" : isCurrent ? "text-blue-600 font-medium" : "text-gray-400"
                  )}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-taskly-orange transition-all duration-500"
                style={{ width: hasContent ? "100%" : "20%" }}
              />
            </div>
            <p className="text-xs text-gray-400 text-center">
              {hasContent ? "Generating report..." : "Initializing research agent..."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Live Content Preview (if any) */}
      {hasContent && (
        <Card className="rounded-2xl border border-gray-100 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-taskly-orange" />
              <CardTitle className="text-base font-semibold text-taskly-dark">Live Preview</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600 max-h-64 overflow-y-auto font-mono">
              {content.slice(-2000)}
              <span className="inline-block size-2 ml-1 bg-taskly-orange animate-pulse rounded-full" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Results View ────────────────────────────────────────────────────────

function ResultsView({
  report,
  researchType,
  taskId,
}: {
  report: Record<string, unknown>;
  researchType: ResearchType;
  taskId: string;
}) {
  return (
    <ScrollArea className="h-[calc(100vh-10rem)]">
      <div className="space-y-4 pr-4">
        {/* Status bar */}
        <Card className="rounded-2xl border border-gray-100 bg-white">
          <CardContent className="flex items-center justify-between py-4 px-5">
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-500 text-white rounded-full">
                Complete
              </Badge>
              <span className="text-xs text-gray-400">
                Task: {taskId}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg border-gray-200 hover:bg-gray-50"
                onClick={() => {
                  const blob = new Blob(
                    [JSON.stringify(report, null, 2)],
                    { type: "application/json" },
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `research-${researchType}-${taskId}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Report exported as JSON");
                }}
              >
                <Download className="size-3.5 mr-1.5" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="rounded-lg border-gray-200 hover:bg-gray-50"
              >
                <a href="/dashboard/tasks">
                  <ExternalLink className="size-3.5 mr-1.5" />
                  View in Tasks
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Render based on type */}
        {researchType === "market_analysis" && (
          <MarketAnalysisReport report={report} />
        )}
        {researchType === "competitor" && (
          <CompetitorReport report={report} />
        )}
        {researchType === "sentiment" && (
          <SentimentReport report={report} />
        )}

        {/* Sources */}
        <SourcesSection sources={report.sources} />
      </div>
    </ScrollArea>
  );
}

// ── Market Analysis Report ──────────────────────────────────────────────

function MarketAnalysisReport({ report }: { report: Record<string, unknown> }) {
  const overview = report.market_overview ?? report.marketOverview;
  const tam = report.tam ?? report.TAM;
  const sam = report.sam ?? report.SAM;
  const som = report.som ?? report.SOM;
  const sizing = report.market_sizing ?? report.marketSizing;
  const growthTrends =
    (report.growth_trends ?? report.growthTrends) as unknown[] | undefined;
  const keyPlayers =
    (report.key_players ?? report.keyPlayers) as unknown[] | undefined;
  const opportunities = (report.opportunities ?? []) as unknown[];
  const threats = (report.threats ?? []) as unknown[];

  return (
    <>
      {/* Market Overview */}
      {overview != null && (
        <Card className="rounded-2xl border border-gray-100 bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Globe className="size-5 text-blue-600" />
              <CardTitle className="text-lg font-bold text-taskly-dark">Market Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-gray-600">
              {String(overview)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* TAM / SAM / SOM */}
      {(tam != null || sam != null || som != null || sizing != null) && (
        <Card className="rounded-2xl border border-gray-100 bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Target className="size-5 text-blue-600" />
              <CardTitle className="text-lg font-bold text-taskly-dark">Market Sizing</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {sizing && typeof sizing === "object" ? (
              <div className="grid gap-4 sm:grid-cols-3">
                {Object.entries(sizing as Record<string, unknown>).map(
                  ([key, val]) => (
                    <div
                      key={key}
                      className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center"
                    >
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        {key}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-taskly-dark">{String(val)}</p>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                {tam != null && (
                  <SizingCard label="TAM" sublabel="Total Addressable Market" value={tam} />
                )}
                {sam != null && (
                  <SizingCard label="SAM" sublabel="Serviceable Addressable Market" value={sam} />
                )}
                {som != null && (
                  <SizingCard label="SOM" sublabel="Serviceable Obtainable Market" value={som} />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Growth Trends */}
      {growthTrends && growthTrends.length > 0 && (
        <Card className="rounded-2xl border border-gray-100 bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-5 text-emerald-600" />
              <CardTitle className="text-lg font-bold text-taskly-dark">Growth Trends</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {growthTrends.map((trend, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-600">
                    {i + 1}
                  </div>
                  <p className="text-sm text-gray-600">
                    {typeof trend === "string" ? trend : formatObject(trend)}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Key Players */}
      {keyPlayers && keyPlayers.length > 0 && (
        <Card className="rounded-2xl border border-gray-100 bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-blue-600" />
              <CardTitle className="text-lg font-bold text-taskly-dark">Key Players</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    {typeof keyPlayers[0] === "object" &&
                    keyPlayers[0] !== null ? (
                      Object.keys(keyPlayers[0] as Record<string, unknown>).map(
                        (key) => (
                          <th
                            key={key}
                            className="pb-3 pr-4 font-semibold text-gray-500 capitalize"
                          >
                            {formatKey(key)}
                          </th>
                        ),
                      )
                    ) : (
                      <th className="pb-3 font-semibold text-gray-500">
                        Player
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {keyPlayers.map((player, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      {typeof player === "object" && player !== null ? (
                        Object.values(
                          player as Record<string, unknown>,
                        ).map((val, j) => (
                          <td key={j} className="py-3 pr-4 text-taskly-dark">
                            {String(val)}
                          </td>
                        ))
                      ) : (
                        <td className="py-3">{String(player)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opportunities */}
      {opportunities.length > 0 && (
        <BulletListCard
          title="Opportunities"
          icon={<Lightbulb className="size-5 text-amber-500" />}
          items={opportunities}
          accentColor="amber"
        />
      )}

      {/* Threats */}
      {threats.length > 0 && (
        <BulletListCard
          title="Threats"
          icon={<ShieldAlert className="size-5 text-red-500" />}
          items={threats}
          accentColor="red"
        />
      )}
    </>
  );
}

// ── Competitor Report ───────────────────────────────────────────────────

function CompetitorReport({ report }: { report: Record<string, unknown> }) {
  const marketContext =
    report.market_context ?? report.marketContext ?? report.overview;
  const competitors =
    (report.competitors ?? report.competitor_list ?? report.competitorList) as
      | unknown[]
      | undefined;
  const insights =
    report.comparison_insights ??
    report.comparisonInsights ??
    report.insights;
  const gaps =
    (report.market_gaps ?? report.marketGaps ?? report.gaps) as
      | unknown[]
      | undefined;

  return (
    <>
      {/* Market Context */}
      {marketContext != null && (
        <Card className="rounded-2xl border border-gray-100 bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Globe className="size-5 text-amber-500" />
              <CardTitle className="text-lg font-bold text-taskly-dark">Market Context</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-gray-600">
              {typeof marketContext === "string"
                ? marketContext
                : formatObject(marketContext)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Competitors */}
      {competitors && competitors.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-taskly-dark">
            <Users className="size-5 text-amber-500" />
            Competitors ({competitors.length})
          </h3>
          {competitors.map((comp, i) => (
            <CompetitorCard key={i} competitor={comp} index={i} />
          ))}
        </div>
      )}

      {/* Comparison Insights */}
      {insights != null && (
        <Card className="rounded-2xl border border-gray-100 bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="size-5 text-amber-500" />
              <CardTitle className="text-lg font-bold text-taskly-dark">Comparison Insights</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {Array.isArray(insights) ? (
              <ul className="space-y-2">
                {(insights as unknown[]).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span className="text-gray-600">
                      {typeof item === "string" ? item : formatObject(item)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-600">
                {typeof insights === "string"
                  ? insights
                  : formatObject(insights)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Market Gaps */}
      {gaps && gaps.length > 0 && (
        <BulletListCard
          title="Market Gaps"
          icon={<Target className="size-5 text-amber-500" />}
          items={gaps}
          accentColor="amber"
        />
      )}
    </>
  );
}

// ── Competitor Card (expandable) ────────────────────────────────────────

function CompetitorCard({
  competitor,
  index,
}: {
  competitor: unknown;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  if (typeof competitor === "string") {
    return (
      <Card className="rounded-2xl border border-gray-100 bg-white">
        <CardContent className="py-4">
          <p className="text-sm text-taskly-dark">{competitor}</p>
        </CardContent>
      </Card>
    );
  }

  if (typeof competitor !== "object" || competitor === null) return null;

  const comp = competitor as Record<string, unknown>;
  const name = comp.name ?? comp.company ?? comp.title ?? `Competitor ${index + 1}`;
  const description = comp.description ?? comp.overview ?? comp.summary;

  // Gather all other fields
  const detailKeys = Object.keys(comp).filter(
    (k) =>
      !["name", "company", "title", "description", "overview", "summary"].includes(k),
  );

  return (
    <Card className="rounded-2xl border border-gray-100 bg-white">
      <CardHeader className="cursor-pointer pb-3" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-xs font-bold text-amber-600">
              {index + 1}
            </div>
            <div>
              <CardTitle className="text-base font-bold text-taskly-dark">{String(name)}</CardTitle>
              {description != null && (
                <CardDescription className="mt-0.5 line-clamp-2 text-gray-500">
                  {String(description)}
                </CardDescription>
              )}
            </div>
          </div>
          {detailKeys.length > 0 &&
            (expanded ? (
              <ChevronUp className="size-5 shrink-0 text-gray-400" />
            ) : (
              <ChevronDown className="size-5 shrink-0 text-gray-400" />
            ))}
        </div>
      </CardHeader>
      {expanded && detailKeys.length > 0 && (
        <CardContent className="space-y-4 pt-0">
          <Separator />
          {detailKeys.map((key) => {
            const val = comp[key];
            return (
              <div key={key}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                  {formatKey(key)}
                </p>
                {Array.isArray(val) ? (
                  <ul className="space-y-1">
                    {(val as unknown[]).map((item, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-2 text-sm text-gray-600"
                      >
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gray-300" />
                        {typeof item === "string" ? item : formatObject(item)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-600">
                    {typeof val === "string" ? val : formatObject(val)}
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

// ── Sentiment Report ────────────────────────────────────────────────────

function SentimentReport({ report }: { report: Record<string, unknown> }) {
  const overallSentiment =
    report.overall_sentiment ?? report.overallSentiment ?? report.sentiment;
  const painPoints =
    (report.pain_points ?? report.painPoints) as unknown[] | undefined;
  const satisfactionDrivers =
    (report.satisfaction_drivers ??
      report.satisfactionDrivers ??
      report.positives) as unknown[] | undefined;
  const featureRequests =
    (report.feature_requests ?? report.featureRequests) as
      | unknown[]
      | undefined;
  const recommendations = (report.recommendations ?? report.suggestions) as
    | unknown[]
    | undefined;

  return (
    <>
      {/* Overall Sentiment */}
      {overallSentiment != null && (
        <Card className="rounded-2xl border border-gray-100 bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-5 text-emerald-600" />
              <CardTitle className="text-lg font-bold text-taskly-dark">Overall Sentiment</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {typeof overallSentiment === "object" &&
            overallSentiment !== null ? (
              <SentimentGauge data={overallSentiment as Record<string, unknown>} />
            ) : (
              <div className="flex items-center gap-3">
                <SentimentIcon sentiment={String(overallSentiment)} />
                <div>
                  <p className="text-lg font-bold text-taskly-dark capitalize">
                    {String(overallSentiment)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pain Points */}
      {painPoints && painPoints.length > 0 && (
        <BulletListCard
          title="Pain Points"
          icon={<ThumbsDown className="size-5 text-red-500" />}
          items={painPoints}
          accentColor="red"
        />
      )}

      {/* Satisfaction Drivers */}
      {satisfactionDrivers && satisfactionDrivers.length > 0 && (
        <BulletListCard
          title="Satisfaction Drivers"
          icon={<ThumbsUp className="size-5 text-emerald-500" />}
          items={satisfactionDrivers}
          accentColor="emerald"
        />
      )}

      {/* Feature Requests */}
      {featureRequests && featureRequests.length > 0 && (
        <BulletListCard
          title="Feature Requests"
          icon={<Star className="size-5 text-amber-500" />}
          items={featureRequests}
          accentColor="amber"
        />
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <BulletListCard
          title="Recommendations"
          icon={<Lightbulb className="size-5 text-blue-500" />}
          items={recommendations}
          accentColor="blue"
        />
      )}
    </>
  );
}

// ── Sentiment Gauge ─────────────────────────────────────────────────────

function SentimentGauge({ data }: { data: Record<string, unknown> }) {
  const score = data.score ?? data.value;
  const label = data.label ?? data.sentiment ?? data.overall;
  const summary = data.summary ?? data.description;

  // Attempt to parse a numeric score for the gauge
  const numericScore =
    typeof score === "number"
      ? score
      : typeof score === "string"
        ? parseFloat(score)
        : NaN;

  const hasScore = !isNaN(numericScore);
  const normalizedScore = hasScore
    ? Math.min(100, Math.max(0, numericScore > 1 ? numericScore : numericScore * 100))
    : 50;

  const barColor =
    normalizedScore >= 70
      ? "bg-emerald-500"
      : normalizedScore >= 40
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="space-y-4">
      {(label != null || hasScore) && (
        <div className="flex items-center gap-4">
          {label != null && (
            <div className="flex items-center gap-2">
              <SentimentIcon sentiment={String(label)} />
              <span className="text-lg font-bold text-taskly-dark capitalize">
                {String(label)}
              </span>
            </div>
          )}
          {hasScore && (
            <Badge variant="outline" className="text-sm rounded-lg border-gray-200">
              {numericScore > 1
                ? `${Math.round(numericScore)}%`
                : `${Math.round(numericScore * 100)}%`}
            </Badge>
          )}
        </div>
      )}

      {hasScore && (
        <div className="space-y-2">
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${normalizedScore}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>Negative</span>
            <span>Neutral</span>
            <span>Positive</span>
          </div>
        </div>
      )}

      {summary != null && (
        <p className="text-sm text-gray-600">{String(summary)}</p>
      )}

      {/* Render any other fields in the sentiment object */}
      {Object.entries(data)
        .filter(
          ([k]) =>
            !["score", "value", "label", "sentiment", "overall", "summary", "description"].includes(k),
        )
        .map(([key, val]) => (
          <div key={key}>
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-400">
              {formatKey(key)}
            </p>
            <p className="text-sm text-gray-600">
              {typeof val === "string" ? val : formatObject(val)}
            </p>
          </div>
        ))}
    </div>
  );
}

// ── Sentiment Icon helper ───────────────────────────────────────────────

function SentimentIcon({ sentiment }: { sentiment: string }) {
  const lower = sentiment.toLowerCase();
  if (lower.includes("positive") || lower.includes("good")) {
    return (
      <div className="flex size-9 items-center justify-center rounded-full bg-emerald-50">
        <ThumbsUp className="size-5 text-emerald-600" />
      </div>
    );
  }
  if (lower.includes("negative") || lower.includes("bad")) {
    return (
      <div className="flex size-9 items-center justify-center rounded-full bg-red-50">
        <ThumbsDown className="size-5 text-red-500" />
      </div>
    );
  }
  return (
    <div className="flex size-9 items-center justify-center rounded-full bg-amber-50">
      <TrendingUp className="size-5 text-amber-500" />
    </div>
  );
}

// ── Bullet List Card ────────────────────────────────────────────────────

function BulletListCard({
  title,
  icon,
  items,
  accentColor,
}: {
  title: string;
  icon: React.ReactNode;
  items: unknown[];
  accentColor: "blue" | "emerald" | "amber" | "red";
}) {
  const dotColors: Record<string, string> = {
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <Card className="rounded-2xl border border-gray-100 bg-white">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-lg font-bold text-taskly-dark">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span
                className={`mt-1.5 size-1.5 shrink-0 rounded-full ${dotColors[accentColor]}`}
              />
              <span className="text-gray-600">
                {typeof item === "string"
                  ? item
                  : typeof item === "object" && item !== null
                    ? renderListItem(item as Record<string, unknown>)
                    : String(item)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ── Sizing Card ─────────────────────────────────────────────────────────

function SizingCard({
  label,
  sublabel,
  value,
}: {
  label: string;
  sublabel: string;
  value: unknown;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="text-xs text-gray-400">{sublabel}</p>
      <p className="mt-2 text-2xl font-bold text-taskly-dark">
        {typeof value === "object" && value !== null
          ? formatObject(value)
          : String(value)}
      </p>
    </div>
  );
}

// ── Sources Section ─────────────────────────────────────────────────────

function SourcesSection({ sources }: { sources: unknown }) {
  if (!sources) return null;

  const sourceList = Array.isArray(sources) ? sources : [];
  if (sourceList.length === 0) return null;

  return (
    <Card className="rounded-2xl border border-gray-100 bg-white">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <ExternalLink className="size-5 text-gray-400" />
          <CardTitle className="text-lg font-bold text-taskly-dark">Sources</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {sourceList.map((source, i) => {
            if (typeof source === "string") {
              const isUrl =
                source.startsWith("http://") || source.startsWith("https://");
              return (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 shrink-0 text-xs text-gray-400">
                    [{i + 1}]
                  </span>
                  {isUrl ? (
                    <a
                      href={source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-taskly-orange underline-offset-4 hover:underline"
                    >
                      {source}
                    </a>
                  ) : (
                    <span className="text-gray-600">{source}</span>
                  )}
                </li>
              );
            }

            if (typeof source === "object" && source !== null) {
              const s = source as Record<string, unknown>;
              const url = s.url ?? s.link ?? s.href;
              const title = s.title ?? s.name ?? s.label;
              return (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 shrink-0 text-xs text-gray-400">
                    [{i + 1}]
                  </span>
                  <div>
                    {url ? (
                      <a
                        href={String(url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-taskly-orange underline-offset-4 hover:underline"
                      >
                        {title ? String(title) : String(url)}
                      </a>
                    ) : title ? (
                      <span className="text-gray-600">
                        {String(title)}
                      </span>
                    ) : (
                      <span className="text-gray-600">
                        {formatObject(source)}
                      </span>
                    )}
                  </div>
                </li>
              );
            }

            return null;
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

// ── Utility helpers ─────────────────────────────────────────────────────

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatObject(obj: unknown): string {
  if (obj === null || obj === undefined) return "";
  if (typeof obj === "string") return obj;
  if (typeof obj !== "object") return String(obj);
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function renderListItem(item: Record<string, unknown>): React.ReactNode {
  const title = item.title ?? item.name ?? item.label;
  const description =
    item.description ?? item.detail ?? item.details ?? item.summary;

  if (title && description) {
    return (
      <span>
        <span className="font-semibold text-taskly-dark">{String(title)}</span>
        {" — "}
        {String(description)}
      </span>
    );
  }

  if (title) {
    return <span className="font-semibold text-taskly-dark">{String(title)}</span>;
  }

  return formatObject(item);
}
