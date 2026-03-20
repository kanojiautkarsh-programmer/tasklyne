"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Mail,
  FileText,
  UserPlus,
  TrendingUp,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  Eye,
  Send,
  Search,
  BookOpen,
  BrainCircuit,
  Sparkles,
  Gem,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { Header } from "@/components/dashboard/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AIProvider } from "@/types/ai";
import { renderMarkdown } from "@/lib/markdown";
import { useStreamingAgent } from "@/hooks/use-streaming-agent";

// ── Types ──────────────────────────────────────────────────────────────

type CampaignType = "cold_email" | "blog" | "onboarding";

interface ApiKeyEntry {
  provider: AIProvider;
  maskedKey: string;
  isValid: boolean;
}

interface ColdEmailInput {
  productInfo: string;
  industry: string;
  leadName: string;
  leadCompany: string;
  leadRole: string;
}

interface BlogInput {
  topic: string;
  keywords: string;
  audience: string;
}

interface OnboardingInput {
  productName: string;
  features: string;
}

interface EmailItem {
  subject: string;
  body: string;
  type?: string;
  delay?: string;
}

interface LeadItem {
  name: string;
  company: string;
  role: string;
  email: string;
}

interface DeliveryStats {
  sent: number;
  failed: number;
  total: number;
}

interface BlogContent {
  title: string;
  metaDescription: string;
  headings: string[];
  content: string;
  readTime: number;
}

interface GrowthResult {
  taskId: string;
  campaign: CampaignType;
  content: EmailItem[] | BlogContent;
  leads?: LeadItem[];
  delivery?: DeliveryStats;
}

// ── Constants ──────────────────────────────────────────────────────────

const CAMPAIGN_TYPES: {
  id: CampaignType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}[] = [
  {
    id: "cold_email",
    label: "Cold Email",
    description: "AI-generated personalized email sequences",
    icon: Mail,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "blog",
    label: "Blog Content",
    description: "SEO-optimized blog posts",
    icon: FileText,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    id: "onboarding",
    label: "Onboarding",
    description: "User onboarding email sequences",
    icon: UserPlus,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
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

const EMAIL_SEQUENCE_LABELS: Record<string, { label: string; color: string }> =
  {
    intro: { label: "Intro", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
    "follow-up": { label: "Follow-up", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
    followup: { label: "Follow-up", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
    breakup: { label: "Breakup", color: "bg-red-500/15 text-red-700 dark:text-red-400" },
  };

const ONBOARDING_SEQUENCE_LABELS: Record<string, { label: string; color: string }> =
  {
    welcome: { label: "Welcome", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
    "feature-highlight": { label: "Feature Highlight", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
    feature_highlight: { label: "Feature Highlight", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
    tips: { label: "Tips & Tricks", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
    "re-engagement": { label: "Re-engagement", color: "bg-purple-500/15 text-purple-700 dark:text-purple-400" },
    re_engagement: { label: "Re-engagement", color: "bg-purple-500/15 text-purple-700 dark:text-purple-400" },
  };

// ── API helpers ────────────────────────────────────────────────────────

async function fetchKeys(): Promise<ApiKeyEntry[]> {
  const res = await fetch("/api/keys");
  if (!res.ok) throw new Error("Failed to fetch API keys");
  const data = await res.json();
  return data.keys ?? data;
}

async function runGrowthAgent(payload: {
  campaignType: CampaignType;
  input: Record<string, unknown>;
  provider: AIProvider;
  apiKey?: string;
  apolloApiKey?: string;
  sendNow?: boolean;
}): Promise<GrowthResult> {
  const res = await fetch("/api/agents/growth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed (${res.status})`);
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

export default function GrowthAgentPage() {
  const [campaignType, setCampaignType] = useState<CampaignType>("cold_email");
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [streamMode, setStreamMode] = useState(false);

  const [coldEmail, setColdEmail] = useState<ColdEmailInput>({
    productInfo: "",
    industry: "",
    leadName: "",
    leadCompany: "",
    leadRole: "",
  });
  const [useApollo, setUseApollo] = useState(false);
  const [apolloApiKey, setApolloApiKey] = useState("");
  const [sendNow, setSendNow] = useState(false);

  const [blog, setBlog] = useState<BlogInput>({
    topic: "",
    keywords: "",
    audience: "",
  });

  const [onboarding, setOnboarding] = useState<OnboardingInput>({
    productName: "",
    features: "",
  });

  const [result, setResult] = useState<GrowthResult | null>(null);
  const [copied, setCopied] = useState(false);

  const { state: stream, startStream, cancel, reset } = useStreamingAgent();

  const { data: storedKeys = [], isLoading: keysLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: fetchKeys,
    staleTime: 1000 * 60 * 5,
  });

  const activeKey = storedKeys.find(
    (k) => k.provider === provider && k.isValid,
  );

  const mutation = useMutation({
    mutationFn: runGrowthAgent,
    onSuccess: (data) => {
      setResult(data);
      toast.success("Campaign generated successfully!");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Build payload and submit
  const handleSubmit = useCallback(() => {
    if (!activeKey) {
      toast.error(
        "No valid API key found for the selected provider. Configure one in Settings.",
      );
      return;
    }

    let input: Record<string, unknown> = {};

    if (campaignType === "cold_email") {
      if (!coldEmail.productInfo.trim() || !coldEmail.industry.trim()) {
        toast.error("Product info and industry are required.");
        return;
      }
      input = {
        productInfo: coldEmail.productInfo.trim(),
        industry: coldEmail.industry.trim(),
        ...(coldEmail.leadName.trim() && {
          leadName: coldEmail.leadName.trim(),
        }),
        ...(coldEmail.leadCompany.trim() && {
          leadCompany: coldEmail.leadCompany.trim(),
        }),
        ...(coldEmail.leadRole.trim() && {
          leadRole: coldEmail.leadRole.trim(),
        }),
      };
    } else if (campaignType === "blog") {
      if (!blog.topic.trim()) {
        toast.error("Blog topic is required.");
        return;
      }
      const keywordsArray = blog.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      input = {
        topic: blog.topic.trim(),
        keywords: keywordsArray.length > 0 ? keywordsArray : [],
        audience: blog.audience.trim(),
      };
    } else {
      if (!onboarding.productName.trim()) {
        toast.error("Product name is required.");
        return;
      }
      const featuresArray = onboarding.features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);
      input = {
        productName: onboarding.productName.trim(),
        features: featuresArray.length > 0 ? featuresArray : [],
      };
    }

    if (streamMode) {
      reset();
      startStream("/api/agents/growth", {
        campaignType,
        input,
        provider,
        ...(useApollo && apolloApiKey.trim()
          ? { apolloApiKey: apolloApiKey.trim() }
          : {}),
        ...(campaignType === "cold_email" ? { sendNow } : {}),
      });
    } else {
      mutation.mutate({
        campaignType,
        input,
        provider,
        ...(useApollo && apolloApiKey.trim()
          ? { apolloApiKey: apolloApiKey.trim() }
          : {}),
        ...(campaignType === "cold_email" ? { sendNow } : {}),
      });
    }
  }, [campaignType, provider, coldEmail, blog, onboarding, useApollo, apolloApiKey, sendNow, activeKey, mutation, streamMode, startStream, reset]);

  const handlePreFill = (goal: string) => {
    if (campaignType === "cold_email") {
      setColdEmail((prev) => ({ ...prev, productInfo: goal }));
    } else if (campaignType === "blog") {
      setBlog((prev) => ({ ...prev, topic: goal }));
    } else {
      setOnboarding((prev) => ({ ...prev, productName: goal }));
    }
  };

  const handleReset = () => {
    reset();
    mutation.reset();
    setResult(null);
  };

  // Copy all result content
  const handleCopyAll = useCallback(() => {
    if (!result) return;

    let text = "";
    if (result.campaign === "blog" && !Array.isArray(result.content)) {
      const blogData = result.content as BlogContent;
      text = `# ${blogData.title}\n\n${blogData.metaDescription}\n\n${blogData.content}`;
    } else if (Array.isArray(result.content)) {
      text = (result.content as EmailItem[])
        .map(
          (email, i) =>
            `--- Email ${i + 1} ---\nSubject: ${email.subject}\n\n${email.body}`,
        )
        .join("\n\n");
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result]);

  return (
    <>
      <Header
        title="Growth Agent"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Growth Agent" },
        ]}
      />

      <Suspense fallback={null}>
        <PreFillHandler onPreFill={handlePreFill} />
      </Suspense>

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="rounded-[28px] border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(241,248,243,0.9))] p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Growth workspace
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                Generate launch-ready campaigns with clearer workflow control
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                Create outbound emails, blog drafts, and onboarding flows from product context without rewriting the same prompt every time.
              </p>
            </div>
            <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-800">
              {CAMPAIGN_TYPES.find((item) => item.id === campaignType)?.label}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* ── Form Section ──────────────────────────────────── */}
          <div className="space-y-6">
            {/* Campaign Type Selector */}
            <Card className="rounded-[24px] border-border/60 bg-white/80 shadow-sm">
              <CardHeader>
                <CardTitle>Campaign Type</CardTitle>
                <CardDescription>
                  Select the type of growth content to generate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  {CAMPAIGN_TYPES.map((ct) => {
                    const Icon = ct.icon;
                    const isActive = campaignType === ct.id;
                    return (
                      <button
                        key={ct.id}
                        type="button"
                        onClick={() => setCampaignType(ct.id)}
                        className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all hover:shadow-sm ${
                          isActive
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div
                          className={`flex size-10 items-center justify-center rounded-lg ${ct.bgColor}`}
                        >
                          <Icon className={`size-5 ${ct.color}`} />
                        </div>
                        <span className="text-sm font-medium">{ct.label}</span>
                        <span className="text-xs text-muted-foreground leading-tight">
                          {ct.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Form Fields */}
            <Card className="rounded-[24px] border-border/60 bg-white/80 shadow-sm">
              <CardHeader>
                <CardTitle>
                  {campaignType === "cold_email" && "Cold Email Details"}
                  {campaignType === "blog" && "Blog Content Details"}
                  {campaignType === "onboarding" && "Onboarding Details"}
                </CardTitle>
                <CardDescription>
                  {campaignType === "cold_email" &&
                    "Provide context for personalized email generation"}
                  {campaignType === "blog" &&
                    "Define the topic and SEO parameters"}
                  {campaignType === "onboarding" &&
                    "Describe your product for onboarding emails"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cold Email Fields */}
                {campaignType === "cold_email" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="productInfo">Product Information *</Label>
                      <Textarea
                        id="productInfo"
                        placeholder="Describe your product, its key value props, and what problems it solves..."
                        value={coldEmail.productInfo}
                        onChange={(e) =>
                          setColdEmail((prev) => ({
                            ...prev,
                            productInfo: e.target.value,
                          }))
                        }
                        rows={3}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="industry">Target Industry *</Label>
                      <Input
                        id="industry"
                        placeholder="e.g. SaaS, Fintech, Healthcare"
                        value={coldEmail.industry}
                        onChange={(e) =>
                          setColdEmail((prev) => ({
                            ...prev,
                            industry: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="useApollo">
                          Use Apollo to find leads
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Automatically discover leads instead of manual entry
                        </p>
                      </div>
                      <Switch
                        id="useApollo"
                        checked={useApollo}
                        onCheckedChange={setUseApollo}
                      />
                    </div>

                    {useApollo ? (
                      <div className="space-y-1.5">
                        <Label htmlFor="apolloKey">
                          Apollo API Key
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            (optional)
                          </span>
                        </Label>
                        <Input
                          id="apolloKey"
                          type="password"
                          placeholder="Enter your Apollo.io API key"
                          value={apolloApiKey}
                          onChange={(e) => setApolloApiKey(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          If not provided, the agent will generate sample leads
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="leadName">Lead Name</Label>
                          <Input
                            id="leadName"
                            placeholder="Jane Smith"
                            value={coldEmail.leadName}
                            onChange={(e) =>
                              setColdEmail((prev) => ({
                                ...prev,
                                leadName: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="leadCompany">Company</Label>
                          <Input
                            id="leadCompany"
                            placeholder="Acme Inc."
                            value={coldEmail.leadCompany}
                            onChange={(e) =>
                              setColdEmail((prev) => ({
                                ...prev,
                                leadCompany: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="leadRole">Role</Label>
                          <Input
                            id="leadRole"
                            placeholder="VP of Engineering"
                            value={coldEmail.leadRole}
                            onChange={(e) =>
                              setColdEmail((prev) => ({
                                ...prev,
                                leadRole: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    )}

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="sendNow" className="flex items-center gap-2">
                          Send Now
                        </Label>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <AlertTriangle className="size-3 text-amber-500" />
                          Emails will be sent immediately upon generation
                        </p>
                      </div>
                      <Switch
                        id="sendNow"
                        checked={sendNow}
                        onCheckedChange={setSendNow}
                      />
                    </div>
                  </>
                )}

                {/* Blog Fields */}
                {campaignType === "blog" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="topic">Topic *</Label>
                      <Input
                        id="topic"
                        placeholder="e.g. How to Scale Your B2B SaaS Sales Pipeline"
                        value={blog.topic}
                        onChange={(e) =>
                          setBlog((prev) => ({
                            ...prev,
                            topic: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="keywords">Keywords</Label>
                      <Input
                        id="keywords"
                        placeholder="sales pipeline, B2B SaaS, lead gen (comma-separated)"
                        value={blog.keywords}
                        onChange={(e) =>
                          setBlog((prev) => ({
                            ...prev,
                            keywords: e.target.value,
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Separate keywords with commas
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="audience">Target Audience</Label>
                      <Input
                        id="audience"
                        placeholder="e.g. B2B SaaS founders and growth marketers"
                        value={blog.audience}
                        onChange={(e) =>
                          setBlog((prev) => ({
                            ...prev,
                            audience: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                )}

                {/* Onboarding Fields */}
                {campaignType === "onboarding" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="productName">Product Name *</Label>
                      <Input
                        id="productName"
                        placeholder="e.g. TaskLyne"
                        value={onboarding.productName}
                        onChange={(e) =>
                          setOnboarding((prev) => ({
                            ...prev,
                            productName: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="features">Features</Label>
                      <Textarea
                        id="features"
                        placeholder={"AI-powered research agent\nCold email automation\nSEO blog generation\n(one feature per line)"}
                        value={onboarding.features}
                        onChange={(e) =>
                          setOnboarding((prev) => ({
                            ...prev,
                            features: e.target.value,
                          }))
                        }
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter one feature per line
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Provider & Submit */}
            <Card className="rounded-[24px] border-border/60 bg-white/80 shadow-sm">
              <CardHeader>
                <CardTitle>AI Provider</CardTitle>
                <CardDescription>
                  Select the AI provider to power this campaign
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="provider">Provider</Label>
                  <Select
                    value={provider}
                    onValueChange={(val) => setProvider(val as AIProvider)}
                  >
                    <SelectTrigger id="provider" className="w-full">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => {
                        const Icon = p.icon;
                        return (
                          <SelectItem key={p.id} value={p.id}>
                            <Icon className="size-4" />
                            {p.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {keysLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" />
                    Checking API keys...
                  </div>
                ) : activeKey ? (
                  <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                    <Check className="size-4" />
                    Using stored {provider} key ({activeKey.maskedKey})
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="size-4" />
                    <span>
                      No valid {provider} key found.{" "}
                      <a
                        href="/dashboard/settings"
                        className="font-medium underline underline-offset-2 hover:text-amber-800 dark:hover:text-amber-300"
                      >
                        Configure in Settings
                      </a>
                    </span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex-col gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200 w-full">
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
                  onClick={handleSubmit}
                  disabled={(mutation.isPending || stream.isStreaming) || !activeKey}
                >
                  {mutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : stream.isStreaming ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <TrendingUp className="size-4" />
                  )}
                  {mutation.isPending
                    ? "Generating..."
                    : stream.isStreaming
                      ? "Streaming..."
                      : "Generate Campaign"}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* ── Results Section ────────────────────────────────── */}
          <div className="space-y-6">
            {(stream.isStreaming || stream.content) && (
              <GrowthStreamingView
                content={stream.content}
                status={stream.status}
                error={stream.error}
                onCancel={cancel}
                onReset={handleReset}
              />
            )}

            {mutation.isPending && !stream.isStreaming && <ResultsSkeleton />}

            {!mutation.isPending && !result && !stream.isStreaming && !stream.content && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
                    <TrendingUp className="size-7 text-muted-foreground" />
                  </div>
                  <p className="font-medium">No results yet</p>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                    Configure your campaign on the left and click Generate to
                    see AI-powered growth content here.
                  </p>
                </CardContent>
              </Card>
            )}

            {!mutation.isPending && result && (
              <>
                {/* Copy All Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {result.campaign.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Task {result.taskId}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyAll}
                  >
                    {copied ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    {copied ? "Copied" : "Copy All"}
                  </Button>
                </div>

                {/* Cold Email Results */}
                {result.campaign === "cold_email" &&
                  Array.isArray(result.content) && (
                    <ColdEmailResults
                      emails={result.content as EmailItem[]}
                      leads={result.leads}
                      delivery={result.delivery}
                    />
                  )}

                {/* Blog Results */}
                {result.campaign === "blog" &&
                  !Array.isArray(result.content) && (
                    <BlogResults content={result.content as BlogContent} />
                  )}

                {/* Onboarding Results */}
                {result.campaign === "onboarding" &&
                  Array.isArray(result.content) && (
                    <OnboardingResults emails={result.content as EmailItem[]} />
                  )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Cold Email Results ─────────────────────────────────────────────────

function ColdEmailResults({
  emails,
  leads,
  delivery,
}: {
  emails: EmailItem[];
  leads?: LeadItem[];
  delivery?: DeliveryStats;
}) {
  return (
    <div className="space-y-4">
      {/* Delivery Stats */}
      {delivery && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="size-4 text-blue-500" />
              Delivery Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  {delivery.sent}
                </p>
                <p className="text-xs text-muted-foreground">Sent</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {delivery.failed}
                </p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{delivery.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Sequence */}
      <ScrollArea className="h-[calc(100vh-16rem)]">
        <div className="space-y-4 pr-3">
          {emails.map((email, i) => {
            const typeKey = (email.type ?? "").toLowerCase();
            const meta =
              EMAIL_SEQUENCE_LABELS[typeKey] ??
              getSequenceLabelByIndex(i, "cold_email");

            return (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className={meta.color}>{meta.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Email {i + 1} of {emails.length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Subject
                    </p>
                    <p className="rounded-md bg-muted px-3 py-2 text-sm font-medium">
                      {email.subject}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Body
                    </p>
                    <div className="rounded-md border bg-background p-4 text-sm leading-relaxed whitespace-pre-wrap">
                      {email.body}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Leads Table */}
      {leads && leads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="size-4 text-emerald-500" />
              Leads Found ({leads.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Company</th>
                    <th className="pb-2 pr-4">Role</th>
                    <th className="pb-2">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{lead.name}</td>
                      <td className="py-2 pr-4">{lead.company}</td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {lead.role}
                      </td>
                      <td className="py-2 font-mono text-xs">
                        {lead.email}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Blog Results ───────────────────────────────────────────────────────

function BlogResults({ content }: { content: BlogContent }) {
  return (
    <div className="space-y-4">
      {/* Meta Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="size-4 text-amber-500" />
              Blog Preview
            </CardTitle>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="size-3" />
              {content.readTime} min read
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Meta Description
            </p>
            <p className="rounded-md bg-muted px-3 py-2 text-sm italic text-muted-foreground">
              {content.metaDescription}
            </p>
          </div>

          {content.headings && content.headings.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Outline
              </p>
              <ul className="space-y-1 rounded-md border px-3 py-2">
                {content.headings.map((heading, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium">
                      {i + 1}
                    </span>
                    {heading}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Article */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="size-4" />
            Full Article
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-20rem)]">
            <article className="prose prose-sm dark:prose-invert max-w-none pr-3">
              <h1>{content.title}</h1>
              <div
                className="whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(content.content),
                }}
              />
            </article>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Onboarding Results ─────────────────────────────────────────────────

function OnboardingResults({ emails }: { emails: EmailItem[] }) {
  return (
    <ScrollArea className="h-[calc(100vh-12rem)]">
      <div className="space-y-4 pr-3">
        {emails.map((email, i) => {
          const typeKey = (email.type ?? "").toLowerCase().replace(/\s+/g, "_");
          const meta =
            ONBOARDING_SEQUENCE_LABELS[typeKey] ??
            ONBOARDING_SEQUENCE_LABELS[typeKey.replace(/_/g, "-")] ??
            getSequenceLabelByIndex(i, "onboarding");

          return (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge className={meta.color}>{meta.label}</Badge>
                  <div className="flex items-center gap-2">
                    {email.delay && (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1 text-xs"
                      >
                        <Clock className="size-3" />
                        {email.delay}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Email {i + 1} of {emails.length}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Subject
                  </p>
                  <p className="rounded-md bg-muted px-3 py-2 text-sm font-medium">
                    {email.subject}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Body
                  </p>
                  <div className="rounded-md border bg-background p-4 text-sm leading-relaxed whitespace-pre-wrap">
                    {email.body}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// ── Streaming View ────────────────────────────────────────────────────

function GrowthStreamingView({
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
      <Card className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white">
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100">
                <Zap className="size-5 text-emerald-600 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-semibold text-taskly-dark">
                  {error ? "Generation failed" : "Generating campaign..."}
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
            <AlertTriangle className="size-6 text-red-500 mb-2" />
            <p className="text-sm font-medium text-taskly-dark">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Loading Skeleton ───────────────────────────────────────────────────

function ResultsSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

function getSequenceLabelByIndex(
  index: number,
  campaign: CampaignType,
): { label: string; color: string } {
  if (campaign === "cold_email") {
    const labels = [
      { label: "Intro", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
      { label: "Follow-up", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
      { label: "Breakup", color: "bg-red-500/15 text-red-700 dark:text-red-400" },
    ];
    return labels[index] ?? labels[labels.length - 1];
  }
  const labels = [
    { label: "Welcome", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
    { label: "Feature Highlight", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
    { label: "Tips & Tricks", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
    { label: "Re-engagement", color: "bg-purple-500/15 text-purple-700 dark:text-purple-400" },
  ];
  return labels[index] ?? labels[labels.length - 1];
}
