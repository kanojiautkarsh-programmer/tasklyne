"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
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

function ResetPasswordContent() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isValidating, setIsValidating] = useState(true);

  const supabase = createClient();

  // Check if user has a valid reset session
  useEffect(() => {
    async function validateSession() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          setIsValidating(false);
          setIsError(true);
          return;
        }

        // Check if this is a password reset session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsValidating(false);
          setIsError(true);
          return;
        }

        setIsValidating(false);
      } catch {
        setIsValidating(false);
        setIsError(true);
      }
    }

    validateSession();
  }, [supabase]);

  const passwordsMatch = password === confirmPassword;
  const isPasswordStrong = password.length >= 8;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      toast.success("Password reset successfully!");
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4">
        <div className="absolute top-8 left-1/2 -translate-x-1/2">
          <TaskLyneLogo size={42} />
        </div>
        <div className="flex flex-col items-center">
          <Loader2 className="size-8 animate-spin text-taskly-orange" />
          <p className="mt-4 text-sm text-gray-500">Validating your reset link...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4">
        <div className="absolute top-8 left-1/2 -translate-x-1/2">
          <TaskLyneLogo size={42} />
        </div>

        <Card className="mx-auto w-full max-w-md rounded-3xl border border-gray-100 bg-white shadow-2xl">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-red-50">
                <AlertCircle className="size-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-taskly-dark font-playfair">
                Invalid reset link
              </h2>
              <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                This password reset link has expired or is invalid. Please request a new one.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 justify-center border-t border-gray-100 pt-6 pb-6">
            <Link href="/forgot-password" className="w-full">
              <Button className="w-full rounded-xl bg-taskly-orange text-white hover:bg-taskly-orange/90">
                Request new reset link
              </Button>
            </Link>
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
                Password reset!
              </h2>
              <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                Your password has been reset successfully. Redirecting you to sign in...
              </p>
            </div>
          </CardContent>
          <CardFooter className="justify-center border-t border-gray-100 pt-6 pb-6">
            <p className="text-sm text-gray-500">
              Didn&apos;t redirect?{" "}
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
              Reset password
            </CardTitle>
            <CardDescription className="mt-3 text-sm leading-7 text-gray-500">
              Enter your new password below.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-taskly-dark">
                New password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl border-gray-200 bg-gray-50 pl-10 pr-10 focus:bg-white focus:border-taskly-orange focus:ring-4 focus:ring-taskly-orange/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <p className={`text-xs ${isPasswordStrong ? "text-emerald-500" : "text-amber-500"}`}>
                  {isPasswordStrong ? "Password is strong" : "Password must be at least 8 characters"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold text-taskly-dark">
                Confirm new password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl border-gray-200 bg-gray-50 pl-10 pr-10 focus:bg-white focus:border-taskly-orange focus:ring-4 focus:ring-taskly-orange/10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <p className={`text-xs ${passwordsMatch ? "text-emerald-500" : "text-red-500"}`}>
                  {passwordsMatch ? "Passwords match" : "Passwords don't match"}
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="h-12 w-full rounded-xl bg-taskly-orange text-white hover:bg-taskly-orange/90 shadow-lg shadow-taskly-orange/25 text-base font-semibold transition-all hover:scale-[1.02]" 
              disabled={isLoading || !passwordsMatch || !isPasswordStrong}
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-5 animate-spin mr-2" />
                  Resetting password...
                </>
              ) : (
                <>
                  Reset password
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <Loader2 className="size-8 animate-spin text-taskly-orange" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
