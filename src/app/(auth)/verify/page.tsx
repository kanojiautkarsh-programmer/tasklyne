"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, ShieldCheck, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import TaskLyneLogo from "@/components/TaskLyneLogo";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const supabase = createClient();

  async function handleResend() {
    if (!email) return;
    await supabase.auth.resend({ type: "signup", email });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4">
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <TaskLyneLogo size={42} />
      </div>

      <Card className="mx-auto w-full max-w-md rounded-3xl border border-gray-100 bg-white shadow-2xl">
        <CardHeader className="text-center pt-12 pb-4">
          <div className="flex justify-center mb-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-amber-50">
              <Mail className="size-9 text-amber-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-taskly-dark font-playfair">
            Verify your email
          </CardTitle>
          <CardDescription className="mt-2 text-sm text-gray-500 leading-6">
            We sent a confirmation link to{" "}
            <span className="font-semibold text-taskly-dark break-all">{email}</span>.
            <br />
            Click the link in your inbox to activate your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-sm text-amber-800">
            <ShieldCheck className="size-4 mt-0.5 shrink-0 text-amber-500" />
            <span>
              For your security, TaskLyne requires email verification before
              accessing any workspace features.
            </span>
          </div>

          <Button
            variant="outline"
            className="w-full h-11 rounded-xl border-gray-200"
            onClick={handleResend}
          >
            <RefreshCw className="size-4 mr-2" />
            Resend confirmation email
          </Button>
        </CardContent>

        <CardFooter className="justify-center border-t border-t-gray-100 pt-4 pb-8 flex-col gap-2">
          <p className="text-sm text-gray-500">
            Wrong email?{" "}
            <Link
              href="/login"
              className="font-semibold text-taskly-orange hover:text-taskly-orange/80"
            >
              Sign in with a different account
            </Link>
          </p>
          <Link
            href="/"
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Back to homepage
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}