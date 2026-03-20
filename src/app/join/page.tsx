"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Users, Mail, Shield } from "lucide-react";

interface InvitationDetails {
  teamName: string;
  role: string;
  invitedBy: string;
  email: string;
}

function JoinContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/team/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to accept invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("You've joined the team!");
      setTimeout(() => {
        window.location.href = "/dashboard/team";
      }, 1500);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  useEffect(() => {
    async function fetchInvitation() {
      if (!token) {
        setError("Invalid invitation link. Please check the link and try again.");
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/team/invitation?token=${encodeURIComponent(token)}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("This invitation has expired or is invalid.");
          } else {
            setError("Failed to load invitation. Please try again.");
          }
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        setInvitation(data);
      } catch {
        setError("Failed to load invitation. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchInvitation();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-taskly-light">
        <div className="text-center">
          <Loader2 className="size-10 animate-spin mx-auto text-taskly-orange" />
          <p className="mt-4 text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-taskly-light p-4">
        <Card className="max-w-md w-full rounded-[24px]">
          <CardContent className="pt-6 text-center">
            <div className="size-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="size-8 text-red-500" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">Invalid Invitation</h1>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <Button 
              className="mt-6 bg-taskly-orange hover:bg-taskly-orange/90"
              onClick={() => window.location.href = "/dashboard"}
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-taskly-light p-4">
      <Card className="max-w-md w-full rounded-[24px]">
        <CardHeader className="text-center pb-2">
          <div className="size-16 mx-auto rounded-full bg-taskly-orange/10 flex items-center justify-center mb-4">
            <Users className="size-8 text-taskly-orange" />
          </div>
          <CardTitle className="text-2xl font-bold">You&apos;re Invited!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 text-center">
            <p className="text-muted-foreground">
              You&apos;ve been invited to join
            </p>
            <p className="text-2xl font-bold text-taskly-dark">{invitation.teamName}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="size-4 text-gray-400" />
              <span className="text-sm text-gray-600">{invitation.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="size-4 text-gray-400" />
              <span className="text-sm text-gray-600 capitalize">{invitation.role} role</span>
            </div>
            <div className="flex items-center gap-3">
              <Users className="size-4 text-gray-400" />
              <span className="text-sm text-gray-600">Invited by {invitation.invitedBy}</span>
            </div>
          </div>

          {acceptMutation.isSuccess ? (
            <div className="text-center py-4">
              <CheckCircle2 className="size-12 mx-auto text-green-500 mb-2" />
              <p className="font-semibold text-green-600">Welcome to the team!</p>
              <p className="text-sm text-gray-500 mt-1">Redirecting...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Button 
                className="w-full bg-taskly-orange hover:bg-taskly-orange/90"
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Accept Invitation"
                )}
              </Button>
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = "/dashboard"}
              >
                Decline
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-taskly-light">
        <div className="text-center">
          <Loader2 className="size-10 animate-spin mx-auto text-taskly-orange" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <JoinContent />
    </Suspense>
  );
}
