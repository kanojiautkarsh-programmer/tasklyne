"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Link2,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/dashboard/header";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  Check,
  Zap,
} from "lucide-react";

type IntegrationProvider = "apollo" | "sendgrid";

interface Integration {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  credentials: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
}

interface IntegrationFormData {
  apiKey: string;
  email?: string;
  emailAccountId?: string;
}

async function fetchIntegrations(): Promise<Integration[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((item) => ({
    ...item,
    provider: item.provider as IntegrationProvider,
    credentials: item.credentials as Record<string, unknown> | null,
  }));
}

async function saveIntegration(
  provider: IntegrationProvider,
  data: IntegrationFormData
): Promise<Integration> {
  const res = await fetch("/api/integrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, ...data }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to save integration");
  }

  return res.json();
}

async function deleteIntegration(provider: IntegrationProvider): Promise<void> {
  const res = await fetch("/api/integrations", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to delete integration");
  }
}

async function testIntegration(
  provider: IntegrationProvider
): Promise<{ valid: boolean; message: string }> {
  const res = await fetch("/api/integrations/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to test integration");
  }

  return res.json();
}

const integrations = [
  {
    id: "apollo" as IntegrationProvider,
    name: "Apollo",
    description: "Find leads, enrich data, and send personalized cold emails at scale.",
    icon: SearchIcon,
    docsUrl: "https://apollo.io/docs",
    features: ["Lead search & enrichment", "Email finder", "Automated outreach"],
    color: "bg-purple-500",
  },
  {
    id: "sendgrid" as IntegrationProvider,
    name: "SendGrid",
    description: "Reliable email delivery for transactional and marketing emails.",
    icon: MailIcon,
    docsUrl: "https://sendgrid.com/docs",
    features: ["High deliverability", "Email tracking", "Templates"],
    color: "bg-blue-500",
  },
];

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const {
    data: integrationsList = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["integrations"],
    queryFn: fetchIntegrations,
  });

  const saveMutation = useMutation({
    mutationFn: ({
      provider,
      data,
    }: {
      provider: IntegrationProvider;
      data: IntegrationFormData;
    }) => saveIntegration(provider, data),
    onSuccess: () => {
      toast.success("Integration saved successfully");
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteIntegration,
    onSuccess: () => {
      toast.success("Integration removed");
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const testMutation = useMutation({
    mutationFn: testIntegration,
    onSuccess: (result) => {
      if (result.valid) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const getIntegration = (provider: IntegrationProvider) =>
    integrationsList.find((i) => i.provider === provider);

  const toggleShowKey = (id: string) => {
    setShowApiKey((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      <Header
        title="Integrations"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Integrations" },
        ]}
      />

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <PageHeader
          title="Integrations"
          description="Connect your favorite tools to enhance TaskLyne's capabilities."
        />

        <div className="rounded-[28px] border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(243,246,240,0.92))] p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Connected services
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                Power up your workflow with integrations
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                Connect Apollo for lead enrichment and SendGrid for email delivery. Your API keys are encrypted and stored securely.
              </p>
            </div>
            <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-800">
              {integrationsList.filter((i) => i.is_active).length} of {integrations.length} connected
            </Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i} className="rounded-[24px]">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-lg bg-muted animate-pulse" />
                    <div>
                      <div className="h-5 w-24 bg-muted animate-pulse rounded" />
                      <div className="mt-1 h-4 w-32 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <Card className="rounded-[24px] border-red-200">
            <CardContent className="flex items-center gap-3 py-6">
              <AlertCircle className="size-5 text-red-500" />
              <p className="text-sm text-red-600">Failed to load integrations</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["integrations"] })}
              >
                <RefreshCw className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {integrations.map((integration) => {
              const existing = getIntegration(integration.id);
              const isExpanded = expandedId === integration.id;
              const Icon = integration.icon;

              return (
                <Card
                  key={integration.id}
                  className={`rounded-[24px] border-border/60 bg-white/80 shadow-sm transition-all ${
                    existing?.is_active ? "border-emerald-200" : ""
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex size-12 items-center justify-center rounded-xl ${integration.color} text-white`}>
                          <Icon className="size-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{integration.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {integration.description}
                          </CardDescription>
                        </div>
                      </div>
                      {existing ? (
                        existing.is_active ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700">
                            <CheckCircle2 className="size-3 mr-1" />
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="size-3 mr-1" />
                            Invalid
                          </Badge>
                        )
                      ) : (
                        <Badge variant="secondary">
                          <Link2 className="size-3 mr-1" />
                          Not connected
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Features */}
                    <div className="flex flex-wrap gap-2">
                      {integration.features.map((feature) => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>

                    <Separator />

                    {/* Connection Status */}
                    {existing?.is_active && (
                      <div className="rounded-lg bg-emerald-50 p-3">
                        <div className="flex items-center gap-2 text-sm text-emerald-700">
                          <ShieldCheck className="size-4" />
                          <span>Your {integration.name} account is connected and verified</span>
                        </div>
                        {typeof existing.credentials?.email === "string" && (
                          <p className="mt-1 text-xs text-emerald-600/70">
                            Account: {String(existing.credentials.email)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* API Key Form */}
                    <IntegrationForm
                      integrationId={integration.id}
                      existing={existing}
                      isExpanded={isExpanded}
                      onToggleExpand={() => setExpandedId(isExpanded ? null : integration.id)}
                      onToggleShowKey={() => toggleShowKey(integration.id)}
                      showKey={showApiKey[integration.id] ?? false}
                      onSave={(data) =>
                        saveMutation.mutate({ provider: integration.id, data })
                      }
                      onDelete={() => deleteMutation.mutate(integration.id)}
                      isSaving={saveMutation.isPending}
                      isDeleting={deleteMutation.isPending}
                    />

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="flex-1"
                      >
                        <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-3.5 mr-1.5" />
                          View Docs
                        </a>
                      </Button>
                      {existing?.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testMutation.mutate(integration.id)}
                          disabled={testMutation.isPending}
                          className="flex-1"
                        >
                          <Zap className="size-3.5 mr-1.5" />
                          {testMutation.isPending ? "Testing..." : "Test Connection"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function IntegrationForm({
  integrationId,
  existing,
  isExpanded,
  onToggleExpand,
  onToggleShowKey,
  showKey,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: {
  integrationId: string;
  existing?: Integration;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleShowKey: () => void;
  showKey: boolean;
  onSave: (data: IntegrationFormData) => void;
  onDelete: () => void;
  isSaving: boolean;
  isDeleting: boolean;
}) {
  const [apiKey, setApiKey] = useState("");
  const [email, setEmail] = useState(String(existing?.credentials?.email ?? ""));
  const [emailAccountId, setEmailAccountId] = useState(String(existing?.credentials?.email_account_id ?? ""));

  const handleSave = () => {
    if (!apiKey.trim() && !existing) {
      toast.error("Please enter an API key");
      return;
    }
    onSave({
      apiKey: apiKey.trim(),
      email: email.trim() || undefined,
      emailAccountId: emailAccountId.trim() || undefined,
    });
  };

  const apiKeyValue = existing?.credentials?.api_key ? String(existing.credentials.api_key) : "";
  const maskedKey = apiKeyValue ? `••••••••${apiKeyValue.slice(-4)}` : "";

  return (
    <div className="space-y-3">
      {!isExpanded && existing ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-mono">
              {showKey ? apiKeyValue : maskedKey}
            </span>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onToggleShowKey}
            >
              {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              onClick={onToggleExpand}
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`apiKey-${integrationId}`} className="text-sm">
                API Key {existing && <span className="text-muted-foreground font-normal">(leave empty to keep current)</span>}
              </Label>
              <div className="relative">
                <Input
                  id={`apiKey-${integrationId}`}
                  type={showKey ? "text" : "password"}
                  placeholder={existing ? "••••••••••••••••" : `Enter your ${integrationId} API key`}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10 font-mono"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-8"
                  onClick={onToggleShowKey}
                >
                  {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>

            {integrationId === "apollo" && (
              <div className="space-y-1.5">
                <Label htmlFor={`emailAccountId-${integrationId}`} className="text-sm">
                  Apollo Email Account ID <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id={`emailAccountId-${integrationId}`}
                  placeholder="Find this in Apollo Settings > Email Accounts"
                  value={emailAccountId}
                  onChange={(e) => setEmailAccountId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Required for sending emails through Apollo
                </p>
              </div>
            )}

            {integrationId === "sendgrid" && (
              <div className="space-y-1.5">
                <Label htmlFor={`senderEmail-${integrationId}`} className="text-sm">
                  Sender Email <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id={`senderEmail-${integrationId}`}
                  type="email"
                  placeholder="sender@yourdomain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
              size="sm"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4 mr-1.5" />
              )}
              {existing ? "Update" : "Connect"}
            </Button>
            {existing && (
              <Button
                variant="outline"
                onClick={onToggleExpand}
                size="sm"
              >
                Cancel
              </Button>
            )}
            {existing && (
              <Button
                variant="ghost"
                onClick={onDelete}
                disabled={isDeleting}
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                {isDeleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <XCircle className="size-4" />
                )}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
