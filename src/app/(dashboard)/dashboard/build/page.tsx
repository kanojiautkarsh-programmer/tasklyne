/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AIProvider } from "@/types/ai";
import { Header } from "@/components/dashboard/header";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  ListChecks,
  Users,
  Layers,
  Hammer,
  Loader2,
  Copy,
  Download,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Inbox,
  BrainCircuit,
  Sparkles,
  Gem,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { useStreamingAgent } from "@/hooks/use-streaming-agent";
import { renderMarkdown } from "@/lib/markdown";

// ── Types ──────────────────────────────────────────────────────────────

type ArtifactType = "prd" | "feature_spec" | "user_stories" | "tech_stack";

interface BuildRequest {
  artifactType: ArtifactType;
  productIdea: string;
  context?: string;
  provider: AIProvider;
}

interface BuildResponse {
  taskId: string;
  status: string;
  artifact: Record<string, any>;
}

// ── Constants ──────────────────────────────────────────────────────────

const ARTIFACT_TYPES: {
  id: ArtifactType;
  label: string;
  icon: React.ElementType;
  description: string;
  placeholder: string;
}[] = [
  {
    id: "prd",
    label: "PRD",
    icon: FileText,
    description: "Generate a comprehensive Product Requirements Document",
    placeholder:
      "Describe your product idea in detail. What problem does it solve? Who is it for?",
  },
  {
    id: "feature_spec",
    label: "Feature Spec",
    icon: ListChecks,
    description: "Prioritized feature list with MoSCoW framework",
    placeholder:
      "Describe the product or feature set you want to prioritize. Include any known constraints or goals.",
  },
  {
    id: "user_stories",
    label: "User Stories",
    icon: Users,
    description: "Epics and user stories with acceptance criteria",
    placeholder:
      "Describe the product and its key user personas. What workflows should the stories cover?",
  },
  {
    id: "tech_stack",
    label: "Tech Stack",
    icon: Layers,
    description: "Technology recommendations with tradeoff analysis",
    placeholder:
      "Describe the product you want to build. Include scale expectations, team expertise, and any preferences.",
  },
];

const PROVIDERS: {
  id: AIProvider;
  name: string;
  icon: React.ElementType;
}[] = [
  { id: "openai", name: "OpenAI", icon: BrainCircuit },
  { id: "anthropic", name: "Anthropic", icon: Sparkles },
  { id: "gemini", name: "Gemini", icon: Gem },
];

// ── API helper ─────────────────────────────────────────────────────────

async function runBuildAgent(payload: BuildRequest): Promise<BuildResponse> {
  const res = await fetch("/api/agents/build", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Build agent failed (${res.status})`);
  }
  return res.json();
}

// ── Page ───────────────────────────────────────────────────────────────

function PreFillHandler({ onPreFill }: { onPreFill: (goal: string) => void }) {
  const searchParams = useSearchParams();
  const goal = searchParams.get("goal");
  useEffect(() => {
    if (goal) onPreFill(goal);
  }, [goal, onPreFill]);
  return null;
}

export default function BuildAgentPage() {
  const [selectedType, setSelectedType] = useState<ArtifactType>("prd");
  const [productIdea, setProductIdea] = useState("");
  const [context, setContext] = useState("");
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [streamMode, setStreamMode] = useState(false);

  const { state: stream, startStream, cancel, reset } = useStreamingAgent();

  const mutation = useMutation({
    mutationFn: runBuildAgent,
    onSuccess: () => {
      toast.success("Artifact generated successfully.");
    },
    onError: (err: Error) => {
      const message = err.message;
      if (message.includes("image") && message.includes("does not support")) {
        toast.error("Image input is not supported. Please enter a text description only.");
      } else {
        toast.error(message);
      }
    },
  });

  const currentType = ARTIFACT_TYPES.find((t) => t.id === selectedType)!;

  function handleGenerate() {
    const trimmed = productIdea.trim();
    if (!trimmed) {
      toast.error("Please describe your product idea.");
      return;
    }
    if (streamMode) {
      reset();
      startStream("/api/agents/build", {
        artifactType: selectedType,
        productIdea: trimmed,
        context: context.trim() || undefined,
        provider,
      });
    } else {
      mutation.mutate({
        artifactType: selectedType,
        productIdea: trimmed,
        context: context.trim() || undefined,
        provider,
      });
    }
  }

  const handlePreFill = (goal: string) => {
    setProductIdea(goal);
  };

  const handleReset = () => {
    reset();
    mutation.reset();
  };

  const handleCopyMarkdown = useCallback(() => {
    if (!mutation.data?.artifact) return;
    const md = artifactToMarkdown(selectedType, mutation.data.artifact);
    navigator.clipboard.writeText(md).then(
      () => toast.success("Copied to clipboard."),
      () => toast.error("Failed to copy."),
    );
  }, [mutation.data, selectedType]);

  const handleExport = useCallback(() => {
    if (!mutation.data?.artifact) return;
    const md = artifactToMarkdown(selectedType, mutation.data.artifact);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedType}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("File downloaded.");
  }, [mutation.data, selectedType]);

  return (
    <>
      <Header
        title="Build Agent"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Build Agent" },
        ]}
      />

      <Suspense fallback={null}>
        <PreFillHandler onPreFill={handlePreFill} />
      </Suspense>

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <PageHeader
          title="Build Agent"
          description="Generate PRDs, feature specs, user stories, and technical architecture powered by AI."
        />

        <div className="rounded-[28px] border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(248,245,239,0.9))] p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Build workspace
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                Turn product ideas into execution-ready artifacts
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                Give the agent your concept, supporting context, and preferred model provider to generate the artifact your team needs next.
              </p>
            </div>
            <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 text-amber-800">
              {currentType.label}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          {/* ── Form Section ─────────────────────────────────── */}
          <div className="space-y-6">
            {/* Artifact type selector */}
            <Card className="rounded-[24px] border-border/60 bg-white/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Artifact Type</CardTitle>
                <CardDescription>
                  Choose what you want to generate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {ARTIFACT_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isActive = selectedType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setSelectedType(type.id)}
                        className={cn(
                          "flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-all hover:bg-accent/50",
                          isActive
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border",
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-9 items-center justify-center rounded-md",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div>
                          <p
                            className={cn(
                              "text-sm font-medium",
                              isActive && "text-primary",
                            )}
                          >
                            {type.label}
                          </p>
                          <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                            {type.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Input form */}
            <Card className="rounded-[24px] border-border/60 bg-white/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="product-idea">Product Idea</Label>
                  <Textarea
                    id="product-idea"
                    placeholder={currentType.placeholder}
                    value={productIdea}
                    onChange={(e) => setProductIdea(e.target.value)}
                    onPaste={(e) => {
                      const clipboardData = e.clipboardData || (e as any).nativeEvent?.clipboardData;
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
                    className="min-h-32 resize-y"
                  />
                  <p className="text-xs text-muted-foreground">
                    Describe your product in detail. Image input is not currently supported.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="context">
                    Additional Context{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Textarea
                    id="context"
                    placeholder="Any additional context, constraints, or preferences"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    className="min-h-20 resize-y"
                  />
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <Label>AI Provider</Label>
                  <Select
                    value={provider}
                    onValueChange={(v) => setProvider(v as AIProvider)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => {
                        const PIcon = p.icon;
                        return (
                          <SelectItem key={p.id} value={p.id}>
                            <PIcon className="size-4" />
                            {p.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setStreamMode(false)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      !streamMode ? "bg-taskly-orange text-white" : "text-gray-500 hover:bg-gray-100",
                    )}
                  >
                    Instant
                  </button>
                  <button
                    type="button"
                    onClick={() => setStreamMode(true)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1",
                      streamMode ? "bg-taskly-orange text-white" : "text-gray-500 hover:bg-gray-100",
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
                  className="w-full"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={(mutation.isPending || stream.isStreaming) || !productIdea.trim()}
                >
                  {mutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : stream.isStreaming ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Hammer className="size-4" />
                  )}
                  {mutation.isPending ? "Generating..." : stream.isStreaming ? "Streaming..." : "Generate"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ── Results Section ───────────────────────────────── */}
          <div className="space-y-4">
            {/* Action bar */}
            {mutation.data?.artifact && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyMarkdown}
                >
                  <Copy className="size-3.5" />
                  Copy as Markdown
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="size-3.5" />
                  Export
                </Button>
              </div>
            )}

            {/* Error */}
            {mutation.isError && (
              <Card className="border-destructive">
                <CardContent className="flex items-center gap-3 py-4">
                  <AlertCircle className="size-5 shrink-0 text-destructive" />
                  <div>
                    <p className="text-sm font-medium">Generation failed</p>
                    <p className="text-xs text-muted-foreground">
                      {mutation.error?.message ?? "An unexpected error occurred."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Streaming view */}
            {(stream.isStreaming || stream.content) && (
              <StreamingView
                content={stream.content}
                status={stream.status}
                error={stream.error}
                onCancel={cancel}
                onReset={handleReset}
              />
            )}

            {/* Loading skeletons */}
            {mutation.isPending && !stream.isStreaming && <ResultSkeletons />}

            {/* Results */}
            {mutation.data?.artifact && !mutation.isPending && !stream.isStreaming && (
              <ScrollArea className="h-[calc(100vh-12rem)]">
                <div className="space-y-4 pr-4">
                  <ArtifactRenderer
                    type={selectedType}
                    artifact={mutation.data.artifact}
                  />
                </div>
              </ScrollArea>
            )}

            {/* Empty state */}
            {!mutation.data && !mutation.isPending && !mutation.isError && !stream.isStreaming && !stream.content && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
                    <Inbox className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No artifact yet</p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    Choose an artifact type, describe your product idea, and
                    click Generate to get started.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Streaming View ────────────────────────────────────────────────────

function StreamingView({
  content,
  status,
  error,
  onCancel,
  onReset,
}: {
  content: string;
  status: string;
  error: string | null;
  onCancel: () => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-white">
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-amber-100">
                <Zap className="size-5 text-amber-600 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-semibold text-taskly-dark">
                  {error ? "Generation failed" : "Generating artifact..."}
                </p>
                <p className="text-xs text-gray-500">
                  {error ?? status ?? "Processing your request"}
                </p>
              </div>
            </div>
            {content && !error && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="rounded-lg border-red-200 text-red-600 hover:bg-red-50"
              >
                <X className="size-3.5 mr-1" />
                Cancel
              </Button>
            )}
            {error && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                className="rounded-lg border-gray-200 hover:bg-gray-50"
              >
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {content && !error && (
        <Card className="rounded-2xl border border-gray-100 bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-taskly-orange" />
              <CardTitle className="text-base font-semibold text-taskly-dark">Live Preview</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-600 whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
              />
              <span className="inline-block size-2 ml-1 bg-taskly-orange animate-pulse rounded-full" />
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="rounded-2xl border border-red-100">
          <CardContent className="flex flex-col items-center py-8 text-center">
            <AlertCircle className="size-6 text-red-500 mb-2" />
            <p className="text-sm font-medium text-taskly-dark">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Result Skeletons ───────────────────────────────────────────────────

function ResultSkeletons() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-1 h-3 w-64" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Artifact Renderer ──────────────────────────────────────────────────

function ArtifactRenderer({
  type,
  artifact,
}: {
  type: ArtifactType;
  artifact: Record<string, any>;
}) {
  switch (type) {
    case "prd":
      return <PrdRenderer data={artifact} />;
    case "feature_spec":
      return <FeatureSpecRenderer data={artifact} />;
    case "user_stories":
      return <UserStoriesRenderer data={artifact} />;
    case "tech_stack":
      return <TechStackRenderer data={artifact} />;
    default:
      return <JsonFallback data={artifact} />;
  }
}

// ── PRD Renderer ───────────────────────────────────────────────────────

function PrdRenderer({ data }: { data: Record<string, any> }) {
  return (
    <>
      {/* Product Overview */}
      {data.productOverview && (
        <SectionCard title="Product Overview">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {data.productOverview}
          </p>
        </SectionCard>
      )}

      {/* Target Users / Personas */}
      {Array.isArray(data.targetUsers) && data.targetUsers.length > 0 && (
        <SectionCard title="Target Users">
          <div className="grid gap-3 sm:grid-cols-2">
            {data.targetUsers.map((user: any, i: number) => (
              <div
                key={i}
                className="rounded-lg border bg-muted/30 p-3 space-y-1"
              >
                <p className="text-sm font-medium">
                  {user.name ?? user.persona ?? `Persona ${i + 1}`}
                </p>
                {user.description && (
                  <p className="text-xs text-muted-foreground">
                    {user.description}
                  </p>
                )}
                {user.needs && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Needs: </span>
                    {user.needs}
                  </p>
                )}
                {user.painPoints && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Pain Points:{" "}
                    </span>
                    {user.painPoints}
                  </p>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Problem Statement */}
      {data.problemStatement && (
        <SectionCard title="Problem Statement">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {data.problemStatement}
          </p>
        </SectionCard>
      )}

      {/* Solution */}
      {data.solution && (
        <SectionCard title="Proposed Solution">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {data.solution}
          </p>
        </SectionCard>
      )}

      {/* Requirements */}
      {(data.functionalRequirements || data.nonFunctionalRequirements || data.requirements) && (
        <SectionCard title="Requirements">
          <div className="space-y-4">
            {renderRequirementsList(
              "Functional",
              data.functionalRequirements ?? data.requirements?.functional,
            )}
            {renderRequirementsList(
              "Non-Functional",
              data.nonFunctionalRequirements ?? data.requirements?.nonFunctional,
            )}
          </div>
        </SectionCard>
      )}

      {/* Success Metrics */}
      {Array.isArray(data.successMetrics) && data.successMetrics.length > 0 && (
        <SectionCard title="Success Metrics">
          <ul className="space-y-1.5">
            {data.successMetrics.map((m: any, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">
                  {typeof m === "string" ? m : m.metric ?? m.name ?? JSON.stringify(m)}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Timeline */}
      {data.timeline && (
        <SectionCard title="Timeline">
          {Array.isArray(data.timeline) ? (
            <div className="space-y-2">
              {data.timeline.map((phase: any, i: number) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <Badge variant="outline" className="shrink-0 mt-0.5">
                    {phase.phase ?? phase.milestone ?? `Phase ${i + 1}`}
                  </Badge>
                  <span className="text-muted-foreground">
                    {phase.description ?? phase.duration ?? JSON.stringify(phase)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {typeof data.timeline === "string"
                ? data.timeline
                : JSON.stringify(data.timeline, null, 2)}
            </p>
          )}
        </SectionCard>
      )}

      {/* Risks */}
      {Array.isArray(data.risks) && data.risks.length > 0 && (
        <SectionCard title="Risks">
          <ul className="space-y-2">
            {data.risks.map((risk: any, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                <div>
                  <span className="text-muted-foreground">
                    {typeof risk === "string"
                      ? risk
                      : risk.risk ?? risk.description ?? risk.name ?? JSON.stringify(risk)}
                  </span>
                  {risk.mitigation && (
                    <p className="mt-0.5 text-xs text-muted-foreground/70">
                      <span className="font-medium text-foreground">
                        Mitigation:{" "}
                      </span>
                      {risk.mitigation}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Fallback for unknown keys */}
      <UnknownFieldsFallback
        data={data}
        knownKeys={[
          "productOverview",
          "targetUsers",
          "problemStatement",
          "solution",
          "functionalRequirements",
          "nonFunctionalRequirements",
          "requirements",
          "successMetrics",
          "timeline",
          "risks",
        ]}
      />
    </>
  );
}

function renderRequirementsList(label: string, items: any) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <ul className="space-y-1">
        {items.map((item: any, i: number) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
            <span className="text-muted-foreground">
              {typeof item === "string"
                ? item
                : item.requirement ?? item.description ?? item.name ?? JSON.stringify(item)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Feature Spec Renderer ──────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, string> = {
  must: "bg-red-500/15 text-red-700 dark:text-red-400",
  should: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  could: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  wont: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
  "won't": "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
};

const EFFORT_STYLES: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  high: "bg-red-500/15 text-red-700 dark:text-red-400",
};

function FeatureSpecRenderer({ data }: { data: Record<string, any> }) {
  const features: any[] = Array.isArray(data.features)
    ? data.features
    : Array.isArray(data)
      ? data
      : [];

  if (features.length === 0) {
    return <JsonFallback data={data} />;
  }

  return (
    <>
      {data.summary && (
        <SectionCard title="Summary">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {data.summary}
          </p>
        </SectionCard>
      )}

      <SectionCard title={`Features (${features.length})`}>
        <div className="space-y-2">
          {features.map((feature: any, i: number) => (
            <FeatureRow key={i} feature={feature} index={i} />
          ))}
        </div>
      </SectionCard>

      <UnknownFieldsFallback data={data} knownKeys={["features", "summary"]} />
    </>
  );
}

function FeatureRow({ feature, index }: { feature: any; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const name = feature.name ?? feature.title ?? feature.feature ?? `Feature ${index + 1}`;
  const description = feature.description ?? feature.detail;
  const priority = (feature.priority ?? "").toString().toLowerCase();
  const effort = (feature.effort ?? "").toString().toLowerCase();
  const stories: any[] = Array.isArray(feature.userStories)
    ? feature.userStories
    : Array.isArray(feature.stories)
      ? feature.stories
      : [];

  const priorityClass = PRIORITY_STYLES[priority] ?? "bg-muted text-muted-foreground";
  const effortClass = EFFORT_STYLES[effort] ?? "";

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent/50 transition-colors"
      >
        {stories.length > 0 ? (
          expanded ? (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="size-4 shrink-0" />
        )}

        <span className="flex-1 text-sm font-medium">{name}</span>

        <div className="flex items-center gap-1.5">
          {priority && (
            <Badge className={cn("text-[10px] uppercase", priorityClass)}>
              {priority}
            </Badge>
          )}
          {effort && effortClass && (
            <Badge className={cn("text-[10px]", effortClass)}>{effort}</Badge>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-3 pb-3 pt-2 space-y-2">
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {stories.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium">User Stories</p>
              {stories.map((story: any, j: number) => (
                <div
                  key={j}
                  className="rounded border bg-muted/30 px-2.5 py-2 text-xs text-muted-foreground"
                >
                  {typeof story === "string" ? story : story.story ?? JSON.stringify(story)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── User Stories Renderer ──────────────────────────────────────────────

function UserStoriesRenderer({ data }: { data: Record<string, any> }) {
  const epics: any[] = Array.isArray(data.epics)
    ? data.epics
    : Array.isArray(data)
      ? data
      : [];

  if (epics.length === 0) {
    return <JsonFallback data={data} />;
  }

  return (
    <>
      {data.summary && (
        <SectionCard title="Summary">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {data.summary}
          </p>
        </SectionCard>
      )}

      {epics.map((epic: any, i: number) => (
        <EpicCard key={i} epic={epic} index={i} />
      ))}

      <UnknownFieldsFallback data={data} knownKeys={["epics", "summary"]} />
    </>
  );
}

function EpicCard({ epic, index }: { epic: any; index: number }) {
  const [expanded, setExpanded] = useState(true);

  const name = epic.name ?? epic.title ?? epic.epic ?? `Epic ${index + 1}`;
  const description = epic.description;
  const stories: any[] = Array.isArray(epic.stories)
    ? epic.stories
    : Array.isArray(epic.userStories)
      ? epic.userStories
      : [];

  return (
    <Card>
      <CardHeader>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
          <CardTitle className="text-base">{name}</CardTitle>
          <Badge variant="secondary" className="ml-auto">
            {stories.length} {stories.length === 1 ? "story" : "stories"}
          </Badge>
        </button>
        {description && (
          <CardDescription className="ml-6">{description}</CardDescription>
        )}
      </CardHeader>

      {expanded && stories.length > 0 && (
        <CardContent className="space-y-3">
          {stories.map((story: any, j: number) => (
            <UserStoryCard key={j} story={story} index={j} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

function UserStoryCard({ story, index }: { story: any; index: number }) {
  const asA = story.as_a ?? story.asA ?? story.role;
  const iWant = story.i_want ?? story.iWant ?? story.action ?? story.want;
  const soThat = story.so_that ?? story.soThat ?? story.benefit ?? story.goal;
  const criteria: any[] = Array.isArray(story.acceptanceCriteria)
    ? story.acceptanceCriteria
    : Array.isArray(story.acceptance_criteria)
      ? story.acceptance_criteria
      : Array.isArray(story.criteria)
        ? story.criteria
        : [];
  const title = story.title ?? story.name;

  const hasStructured = asA || iWant || soThat;

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
      {title && <p className="text-sm font-medium">{title}</p>}

      {hasStructured ? (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {asA && (
            <>
              <span className="font-medium text-foreground">As a</span> {asA},{" "}
            </>
          )}
          {iWant && (
            <>
              <span className="font-medium text-foreground">I want</span>{" "}
              {iWant},{" "}
            </>
          )}
          {soThat && (
            <>
              <span className="font-medium text-foreground">so that</span>{" "}
              {soThat}
            </>
          )}
        </p>
      ) : typeof story === "string" ? (
        <p className="text-sm text-muted-foreground">{story}</p>
      ) : (
        !title && (
          <p className="text-sm text-muted-foreground">
            Story {index + 1}
          </p>
        )
      )}

      {criteria.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-1">Acceptance Criteria</p>
          <ul className="space-y-0.5">
            {criteria.map((c: any, k: number) => (
              <li
                key={k}
                className="flex items-start gap-1.5 text-xs text-muted-foreground"
              >
                <span className="mt-1 size-1 shrink-0 rounded-full bg-emerald-500" />
                {typeof c === "string" ? c : c.criteria ?? c.description ?? JSON.stringify(c)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Tech Stack Renderer ────────────────────────────────────────────────

function TechStackRenderer({ data }: { data: Record<string, any> }) {
  const categories: any[] = Array.isArray(data.categories)
    ? data.categories
    : Array.isArray(data.recommendations)
      ? data.recommendations
      : Array.isArray(data)
        ? data
        : [];

  // Try to detect object-style categories (e.g., { frontend: {...}, backend: {...} })
  const objectCategories =
    categories.length === 0 && typeof data === "object"
      ? Object.entries(data).filter(
          ([key]) => !["summary", "overview"].includes(key),
        )
      : [];

  if (categories.length === 0 && objectCategories.length === 0) {
    return <JsonFallback data={data} />;
  }

  const items =
    categories.length > 0
      ? categories
      : objectCategories.map(([key, value]) => ({
          category: key,
          ...(typeof value === "object" && value !== null ? value : { name: String(value) }),
        }));

  return (
    <>
      {(data.summary ?? data.overview) && (
        <SectionCard title="Overview">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {data.summary ?? data.overview}
          </p>
        </SectionCard>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((cat: any, i: number) => (
          <TechCategoryCard key={i} category={cat} index={i} />
        ))}
      </div>

      <UnknownFieldsFallback
        data={data}
        knownKeys={["categories", "recommendations", "summary", "overview"]}
      />
    </>
  );
}

function TechCategoryCard({
  category,
  index,
}: {
  category: any;
  index: number;
}) {
  const name =
    category.category ?? category.name ?? category.area ?? `Category ${index + 1}`;
  const recommendation =
    category.recommendation ?? category.choice ?? category.technology ?? category.tool;
  const reasoning = category.reasoning ?? category.rationale ?? category.why;
  const alternatives: any[] = Array.isArray(category.alternatives)
    ? category.alternatives
    : [];
  const tradeoffs: any[] = Array.isArray(category.tradeoffs)
    ? category.tradeoffs
    : Array.isArray(category.tradeOffs)
      ? category.tradeOffs
      : [];

  return (
    <Card>
      <CardHeader>
        <CardDescription className="text-xs uppercase tracking-wider">
          {name}
        </CardDescription>
        {recommendation && (
          <CardTitle className="text-base">{recommendation}</CardTitle>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {reasoning && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {reasoning}
          </p>
        )}

        {alternatives.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1">Alternatives</p>
            <div className="flex flex-wrap gap-1">
              {alternatives.map((alt: any, j: number) => (
                <Badge key={j} variant="secondary" className="text-[10px]">
                  {typeof alt === "string" ? alt : alt.name ?? JSON.stringify(alt)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {tradeoffs.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1">Tradeoffs</p>
            <ul className="space-y-0.5">
              {tradeoffs.map((t: any, j: number) => (
                <li
                  key={j}
                  className="flex items-start gap-1.5 text-xs text-muted-foreground"
                >
                  <span className="mt-1 size-1 shrink-0 rounded-full bg-amber-500" />
                  {typeof t === "string" ? t : t.tradeoff ?? t.description ?? JSON.stringify(t)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Shared Components ──────────────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function JsonFallback({ data }: { data: any }) {
  return (
    <SectionCard title="Raw Output">
      <pre className="overflow-x-auto rounded bg-muted p-3 text-xs leading-relaxed">
        {JSON.stringify(data, null, 2)}
      </pre>
    </SectionCard>
  );
}

function UnknownFieldsFallback({
  data,
  knownKeys,
}: {
  data: Record<string, any>;
  knownKeys: string[];
}) {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return null;
  }

  const unknownEntries = Object.entries(data).filter(
    ([key]) => !knownKeys.includes(key),
  );

  if (unknownEntries.length === 0) return null;

  return (
    <>
      {unknownEntries.map(([key, value]) => (
        <SectionCard key={key} title={formatFieldName(key)}>
          {typeof value === "string" ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {value}
            </p>
          ) : Array.isArray(value) ? (
            <ul className="space-y-1">
              {value.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  {typeof item === "string"
                    ? item
                    : item.name ?? item.title ?? item.description ?? JSON.stringify(item)}
                </li>
              ))}
            </ul>
          ) : (
            <pre className="overflow-x-auto rounded bg-muted p-3 text-xs leading-relaxed">
              {JSON.stringify(value, null, 2)}
            </pre>
          )}
        </SectionCard>
      ))}
    </>
  );
}

// ── Markdown Export ─────────────────────────────────────────────────────

function artifactToMarkdown(
  type: ArtifactType,
  artifact: Record<string, any>,
): string {
  const lines: string[] = [];
  const typeLabel = ARTIFACT_TYPES.find((t) => t.id === type)?.label ?? type;
  lines.push(`# ${typeLabel}\n`);

  function pushSection(title: string, content: string) {
    lines.push(`## ${title}\n`);
    lines.push(`${content}\n`);
  }

  function stringifyValue(val: any): string {
    if (typeof val === "string") return val;
    if (Array.isArray(val)) {
      return val
        .map((item) =>
          typeof item === "string"
            ? `- ${item}`
            : `- ${item.name ?? item.title ?? item.description ?? JSON.stringify(item)}`,
        )
        .join("\n");
    }
    return JSON.stringify(val, null, 2);
  }

  if (type === "prd") {
    if (artifact.productOverview)
      pushSection("Product Overview", artifact.productOverview);
    if (artifact.problemStatement)
      pushSection("Problem Statement", artifact.problemStatement);
    if (artifact.solution)
      pushSection("Proposed Solution", artifact.solution);
    if (Array.isArray(artifact.targetUsers)) {
      pushSection(
        "Target Users",
        artifact.targetUsers
          .map(
            (u: any) =>
              `### ${u.name ?? u.persona ?? "Persona"}\n${u.description ?? ""}`,
          )
          .join("\n\n"),
      );
    }
    const funcReqs =
      artifact.functionalRequirements ?? artifact.requirements?.functional;
    const nonFuncReqs =
      artifact.nonFunctionalRequirements ??
      artifact.requirements?.nonFunctional;
    if (funcReqs)
      pushSection("Functional Requirements", stringifyValue(funcReqs));
    if (nonFuncReqs)
      pushSection("Non-Functional Requirements", stringifyValue(nonFuncReqs));
    if (artifact.successMetrics)
      pushSection("Success Metrics", stringifyValue(artifact.successMetrics));
    if (artifact.timeline)
      pushSection("Timeline", stringifyValue(artifact.timeline));
    if (artifact.risks)
      pushSection("Risks", stringifyValue(artifact.risks));
  } else {
    // Generic: iterate keys
    for (const [key, value] of Object.entries(artifact)) {
      pushSection(formatFieldName(key), stringifyValue(value));
    }
  }

  return lines.join("\n");
}

// ── Utils ──────────────────────────────────────────────────────────────

function formatFieldName(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}
