"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Github, Lock, Mail, Loader2, Eye, EyeOff } from "lucide-react";

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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    // signInWithPassword can succeed for unverified users if Supabase
    // "Confirm email" is not strictly enforced, so we double-check with
    // getUser() which validates the JWT (only issued after confirmation).
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email_confirmed_at) {
      router.push("/verify?email=" + encodeURIComponent(email));
      return;
    }

    router.push("/dashboard");
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
              Welcome back
            </CardTitle>
            <CardDescription className="mt-3 text-sm leading-7 text-gray-500">
              Sign in to continue to your startup workspace
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleEmailLogin} className="space-y-5">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-semibold text-taskly-dark">Password</Label>
                <Link 
                  href="/forgot-password" 
                  className="text-xs text-taskly-orange hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl border-gray-200 bg-gray-50 pl-10 pr-10 focus:bg-white focus:border-taskly-orange focus:ring-4 focus:ring-taskly-orange/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
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
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
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
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-taskly-orange hover:text-taskly-orange/80">
              Create one
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
