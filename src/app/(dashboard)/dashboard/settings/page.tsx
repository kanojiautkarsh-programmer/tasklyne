"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { AIProvider } from "@/types/ai";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  KeyRound,
  Trash2,
  Loader2,
  Save,
  User,
  BrainCircuit,
  Sparkles,
  Gem,
  AlertTriangle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { Header } from "@/components/dashboard/header";
import { PageHeader } from "@/components/dashboard/page-header";

// ── Types ──────────────────────────────────────────────────────────────

interface ApiKeyEntry {
  id: string;
  provider: AIProvider;
  maskedKey: string;
  isValid: boolean;
  createdAt: string;
}

interface ProfileData {
  full_name: string | null;
  company_name: string | null;
}

// ── Provider metadata ──────────────────────────────────────────────────

const PROVIDERS: {
  id: AIProvider;
  name: string;
  icon: React.ElementType;
  placeholder: string;
}[] = [
  {
    id: "openai",
    name: "OpenAI",
    icon: BrainCircuit,
    placeholder: "sk-proj-...",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    icon: Sparkles,
    placeholder: "sk-ant-...",
  },
  {
    id: "gemini",
    name: "Gemini",
    icon: Gem,
    placeholder: "AIza...",
  },
];

// ── API helpers ────────────────────────────────────────────────────────

async function fetchKeys(): Promise<ApiKeyEntry[]> {
  const res = await fetch("/api/keys");
  if (!res.ok) throw new Error("Failed to fetch keys");
  const data = await res.json();
  return data.keys;
}

async function saveKey(payload: { provider: AIProvider; apiKey: string }) {
  const res = await fetch("/api/keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to save key");
  }
  return res.json();
}

async function deleteKey(provider: AIProvider) {
  const res = await fetch("/api/keys", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider }),
  });
  if (!res.ok) throw new Error("Failed to remove key");
  return res.json();
}

// ── Settings page ──────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <>
      <Header
        title="Settings"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings" },
        ]}
      />

      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
        <PageHeader
          title="Settings"
          description="Manage your profile and the model providers that power your workspace."
        />

        <div className="rounded-[28px] border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.84),rgba(243,247,241,0.9))] p-5 shadow-sm backdrop-blur">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Configuration hub
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Keep your profile and AI providers ready for every workflow
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
            Store encrypted provider keys, manage validation status, and keep account details up to date without leaving the product surface.
          </p>
        </div>

        <Tabs defaultValue="api-keys">
          <TabsList className="rounded-xl border border-border/60 bg-white/80 p-1 shadow-sm">
            <TabsTrigger value="api-keys">
              <KeyRound className="size-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="profile">
              <User className="size-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys" className="mt-6">
            <ApiKeysTab />
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <ProfileTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

// ── API Keys tab ───────────────────────────────────────────────────────

function ApiKeysTab() {
  const queryClient = useQueryClient();

  const {
    data: keys = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["api-keys"],
    queryFn: fetchKeys,
  });

  const saveMutation = useMutation({
    mutationFn: saveKey,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success(`${data.provider} key saved and validated successfully.`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save API key.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key removed.");
    },
    onError: () => {
      toast.error("Failed to remove API key.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Failed to load API keys. Please try again.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="rounded-[20px] border border-border/60 bg-white/75 px-4 py-3 text-sm text-muted-foreground shadow-sm">
        Bring your own API keys to power the AI agents. Keys are stored securely
        and never exposed in full.
      </p>

      {PROVIDERS.map((provider) => {
        const existing = keys.find((k) => k.provider === provider.id);
        return (
          <ProviderKeyCard
            key={provider.id}
            provider={provider}
            existing={existing}
            onSave={(apiKey) =>
              saveMutation.mutate({ provider: provider.id, apiKey })
            }
            onRemove={() => deleteMutation.mutate(provider.id)}
            isSaving={
              saveMutation.isPending &&
              saveMutation.variables?.provider === provider.id
            }
            isRemoving={
              deleteMutation.isPending &&
              deleteMutation.variables === provider.id
            }
          />
        );
      })}
    </div>
  );
}

// ── Individual provider card ───────────────────────────────────────────

function ProviderKeyCard({
  provider,
  existing,
  onSave,
  onRemove,
  isSaving,
  isRemoving,
}: {
  provider: (typeof PROVIDERS)[number];
  existing?: ApiKeyEntry;
  onSave: (apiKey: string) => void;
  onRemove: () => void;
  isSaving: boolean;
  isRemoving: boolean;
}) {
  const [value, setValue] = useState("");
  const Icon = provider.icon;

  function handleSave() {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error("Please enter an API key.");
      return;
    }
    onSave(trimmed);
    setValue("");
  }

  return (
    <Card className="rounded-[24px] border-border/60 bg-white/80 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Icon className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base">{provider.name}</CardTitle>
              <CardDescription className="text-xs">
                {existing ? (
                  <span className="font-mono">{existing.maskedKey}</span>
                ) : (
                  "No key configured"
                )}
              </CardDescription>
            </div>
          </div>
          <StatusBadge existing={existing} />
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor={`key-${provider.id}`}>
              {existing ? "Update key" : "Enter API key"}
            </Label>
            <Input
              id={`key-${provider.id}`}
              type="password"
              placeholder={provider.placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
          </div>
          <Button onClick={handleSave} disabled={isSaving || !value.trim()}>
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save Key
          </Button>
          {existing && (
            <Button
              variant="destructive"
              size="icon"
              onClick={onRemove}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ existing }: { existing?: ApiKeyEntry }) {
  if (!existing) {
    return <Badge variant="secondary">Not Set</Badge>;
  }
  if (existing.isValid) {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
        Valid
      </Badge>
    );
  }
  return <Badge variant="destructive">Invalid</Badge>;
}

// ── Profile tab ────────────────────────────────────────────────────────

function ProfileTab() {
  const supabase = createClient();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<ProfileData> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");
      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, company_name")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name ?? "");
        setCompanyName(profile.company_name ?? "");
      }
      setLoaded(true);
      return {
        full_name: profile?.full_name ?? null,
        company_name: profile?.company_name ?? null,
      };
    },
  });

  async function handleSaveProfile() {
    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Not authenticated.");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName || null,
          company_name: companyName || null,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Profile updated successfully.");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmation !== "DELETE") {
      toast.error('Please type "DELETE" to confirm');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to delete account");
      }

      toast.success("Account deleted. We're sorry to see you go.");
      await supabase.auth.signOut();
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading || !loaded) {
    return (
      <Card className="rounded-[24px] border-border/60 bg-white/80 shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-32 mt-2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[24px] border-border/60 bg-white/80 shadow-sm">
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Update your personal details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="full-name">Full Name</Label>
          <Input
            id="full-name"
            placeholder="Jane Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="company-name">Company Name</Label>
          <Input
            id="company-name"
            placeholder="Acme Inc."
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} disabled readOnly />
          <p className="text-xs text-muted-foreground">
            Email is managed through your authentication provider.
          </p>
        </div>

        <Separator />

        <Button onClick={handleSaveProfile} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Profile
        </Button>

        <Separator className="my-6" />

        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-red-900">Danger Zone</h4>
              <p className="mt-1 text-sm text-red-700/80">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="mt-3"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="size-4 mr-1" />
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="size-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This will permanently delete your account, all your tasks, reports, and data.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
              <Input
                id="delete-confirm"
                placeholder="DELETE"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== "DELETE" || isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4 mr-1" />
              )}
              Delete My Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
