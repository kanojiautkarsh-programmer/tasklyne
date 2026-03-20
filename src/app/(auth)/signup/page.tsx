"use client";

import { useState } from "react";
import Link from "next/link";

import { toast } from "sonner";
import { ArrowRight, Github, Lock, Mail, User, Loader2, CheckCircle2 } from "lucide-react";

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

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    setIsSuccess(true);
    setIsLoading(false);
  }

  async function handleOAuthLogin(provider: "google" | "github") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4">
        {/* TaskLyne Logo at top */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2">
          <TaskLyneLogo size={42} />
        </div>

        <Card className="mx-auto w-full max-w-md rounded-3xl border border-gray-100 bg-white shadow-2xl">
          <CardContent className="pt-12 pb-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="size-10 text-emerald-500" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-taskly-dark font-playfair">
              Check your email
            </CardTitle>
            <CardDescription className="mt-3 text-sm text-gray-500">
              We&apos;ve sent a confirmation link to <span className="font-semibold text-taskly-dark">{email}</span>. 
              <br />Open it to activate your account.
            </CardDescription>
          </CardContent>
          <CardFooter className="justify-center border-t border-gray-100 pt-4 pb-8">
            <p className="text-sm text-gray-500">
              Already confirmed?{" "}
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
      {/* TaskLyne Logo at top */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <TaskLyneLogo size={42} />
      </div>

      <Card className="mx-auto w-full max-w-md rounded-3xl border border-gray-100 bg-white shadow-2xl">
        <CardHeader className="space-y-4 text-left pb-6">
          <div>
            <CardTitle className="text-3xl font-bold text-taskly-dark font-playfair">
              Create your account
            </CardTitle>
            <CardDescription className="mt-3 text-sm leading-7 text-gray-500">
              Start your AI-powered startup journey
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-semibold text-taskly-dark">Full name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Jane Founder"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-12 rounded-xl border-gray-200 bg-gray-50 pl-10 focus:bg-white focus:border-taskly-orange focus:ring-4 focus:ring-taskly-orange/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-taskly-dark">Email</Label>
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

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-taskly-dark">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl border-gray-200 bg-gray-50 pl-10 focus:bg-white focus:border-taskly-orange focus:ring-4 focus:ring-taskly-orange/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold text-taskly-dark">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="size-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center text-xs font-medium uppercase tracking-wider">
              <span className="bg-white px-3 text-gray-400">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-taskly-dark font-medium"
              onClick={() => handleOAuthLogin("google")}
            >
              <span className="text-base font-bold mr-2">G</span>
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-taskly-dark font-medium"
              onClick={() => handleOAuthLogin("github")}
            >
              <Github className="size-5 mr-2" />
              GitHub
            </Button>
          </div>
        </CardContent>

        <CardFooter className="justify-center border-t border-gray-100 pt-6 pb-6">
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-taskly-orange hover:text-taskly-orange/80">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
