"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import TaskLyneLogo from "@/components/TaskLyneLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setIsSuccess(true);
      toast.success("Password reset email sent! Check your inbox.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4">
        <div className="absolute top-8 left-1/2 -translate-x-1/2">
          <TaskLyneLogo size={42} />
        </div>

        <Card className="mx-auto w-full max-w-md rounded-3xl border border-gray-100 bg-white shadow-2xl">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="size-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-taskly-dark font-playfair">
                Check your email
              </h2>
              <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                We sent a password reset link to <span className="font-medium text-taskly-dark">{email}</span>. 
                Click the link in the email to reset your password.
              </p>
              <p className="mt-4 text-xs text-gray-400">
                Didn&apos;t receive the email? Check your spam folder or{" "}
                <button
                  onClick={() => setIsSuccess(false)}
                  className="text-taskly-orange hover:underline font-medium"
                >
                  try again
                </button>
                .
              </p>
            </div>
          </CardContent>
          <CardFooter className="justify-center border-t border-gray-100 pt-6 pb-6">
            <p className="text-sm text-gray-500">
              Remember your password?{" "}
              <Link href="/login" className="font-semibold text-taskly-orange hover:text-taskly-orange/80">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4">
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <TaskLyneLogo size={42} />
      </div>

      <Card className="mx-auto w-full max-w-md rounded-3xl border border-gray-100 bg-white shadow-2xl">
        <CardHeader className="space-y-4 text-left pb-6">
          <div>
            <CardTitle className="text-3xl font-bold text-taskly-dark font-playfair">
              Forgot password?
            </CardTitle>
            <CardDescription className="mt-3 text-sm leading-7 text-gray-500">
              No worries, we&apos;ll send you reset instructions.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-taskly-dark">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-xl border-gray-200 bg-gray-50 pl-10 focus:bg-white focus:border-taskly-orange focus:ring-4 focus:ring-taskly-orange/10"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="h-12 w-full rounded-xl bg-taskly-orange text-white hover:bg-taskly-orange/90 shadow-lg shadow-taskly-orange/25 text-base font-semibold transition-all hover:scale-[1.02]" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-5 animate-spin mr-2" />
                  Sending reset link...
                </>
              ) : (
                <>
                  Send reset link
                  <ArrowRight className="size-5 ml-2" />
                </>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t border-gray-100 pt-6 pb-6">
          <p className="text-sm text-gray-500">
            Remember your password?{" "}
            <Link href="/login" className="font-semibold text-taskly-orange hover:text-taskly-orange/80">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
