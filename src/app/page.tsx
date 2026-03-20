"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Lock,
  Menu,
  Search,
  Sparkles,
  TrendingUp,
  WandSparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import TaskLyneLogo from "@/components/TaskLyneLogo";

const agents = [
  {
    icon: Search,
    name: "Research",
    desc: "Market analysis, competitors, and sentiment — structured reports in minutes.",
    color: "bg-blue-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    delay: 0,
  },
  {
    icon: WandSparkles,
    name: "Build",
    desc: "PRDs, specs, user stories, and tech direction from a single brief.",
    color: "bg-amber-500",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    delay: 0.1,
  },
  {
    icon: TrendingUp,
    name: "Growth",
    desc: "Cold emails, blog content, and onboarding flows that drive results.",
    color: "bg-emerald-500",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    delay: 0.2,
  },
];

const features = [
  "No AI cost markup",
  "Encrypted key storage",
  "Structured saved outputs",
  "Team workspaces",
];

function MotionCard({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FloatingOrb({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl opacity-30 ${className}`}
      animate={{ y: [0, -20, 0], opacity: [0.3, 0.5, 0.3] }}
      transition={{ duration: 6, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm" : "bg-transparent"
      }`}
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <TaskLyneLogo size={36} />
          <span className="text-lg font-bold text-taskly-dark font-playfair">TaskLyne</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-gray-500 md:flex">
          <Link href="#agents" className="transition-colors hover:text-taskly-orange">Agents</Link>
          <Link href="#how" className="transition-colors hover:text-taskly-orange">How it works</Link>
          <Link href="#pricing" className="transition-colors hover:text-taskly-orange">Pricing</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="hidden md:inline-flex text-gray-500" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button size="sm" className="bg-taskly-orange text-white hover:bg-taskly-orange/90 shadow-md shadow-taskly-orange/25" asChild>
            <Link href="/signup">Start free</Link>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] border-gray-100 bg-white p-0">
              <SheetHeader className="border-b border-gray-100 px-6 py-5">
                <SheetTitle className="flex items-center gap-3">
                  <TaskLyneLogo size={28} />
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 p-4">
                <Link href="#agents" className="rounded-lg px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-taskly-orange">Agents</Link>
                <Link href="#how" className="rounded-lg px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-taskly-orange">How it works</Link>
                <Link href="#pricing" className="rounded-lg px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-taskly-orange">Pricing</Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.header>
  );
}

function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen overflow-hidden bg-white pt-24 pb-20">
      <FloatingOrb className="top-20 -left-20 h-80 w-80 bg-taskly-orange" delay={0} />
      <FloatingOrb className="top-40 right-0 h-64 w-64 bg-blue-400" delay={1} />
      <FloatingOrb className="bottom-20 left-1/3 h-48 w-48 bg-emerald-400" delay={2} />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,122,0,0.06),transparent_50%),radial-gradient(circle_at_80%_60%,rgba(59,130,246,0.04),transparent_40%)]" />

      <motion.div className="relative z-10 mx-auto max-w-6xl px-6" style={{ y, opacity }}>
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="rounded-full border-0 bg-orange-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-taskly-orange shadow-sm">
              AI Agents for Startup Teams
            </Badge>
          </motion.div>

          <motion.h1
            className="mt-6 text-5xl font-bold leading-[1.1] tracking-tight text-taskly-dark sm:text-6xl lg:text-7xl font-playfair"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            Research, build, and grow —{" "}
            <span className="text-taskly-orange">without the chaos.</span>
          </motion.h1>

          <motion.p
            className="mt-6 max-w-xl text-lg leading-8 text-gray-500"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Three specialized agents that turn scattered AI prompting into a structured command center for market research, product planning, and growth execution.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-col gap-4 sm:flex-row"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <Button size="lg" className="h-12 rounded-xl bg-taskly-orange px-8 text-base font-semibold text-white hover:bg-taskly-orange/90 shadow-lg shadow-taskly-orange/25 transition-all hover:scale-[1.02]" asChild>
              <Link href="/signup">
                Start free
                <ArrowRight className="ml-2 size-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 rounded-xl border-gray-200 bg-white px-8 text-base font-medium text-gray-600 hover:bg-gray-50" asChild>
              <Link href="#agents">See agents</Link>
            </Button>
          </motion.div>

          <motion.div
            className="mt-10 flex flex-wrap gap-6 text-sm text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            {features.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <div className="flex size-5 items-center justify-center rounded-full bg-taskly-orange/10">
                  <Check className="size-3 text-taskly-orange" />
                </div>
                {f}
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          className="mt-16 relative"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-200/50">
            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full bg-red-400" />
                <div className="size-3 rounded-full bg-yellow-400" />
                <div className="size-3 rounded-full bg-green-400" />
              </div>
              <div className="ml-3 flex items-center gap-2 rounded-md bg-white px-3 py-1 text-xs text-gray-400 shadow-sm">
                <Bot className="size-3" />
                tasklyne.app/dashboard
              </div>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-3">
              {[
                { name: "Research Agent", status: "completed", color: "bg-blue-500" },
                { name: "Build Agent", status: "running", color: "bg-amber-500" },
                { name: "Growth Agent", status: "pending", color: "bg-gray-300" },
              ].map((agent) => (
                <div key={agent.name} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  <div className="flex items-center gap-2">
                    <div className={`size-2 rounded-full ${agent.color}`} />
                    <span className="text-xs font-medium text-gray-500">{agent.name}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <motion.div
                      className={`h-full rounded-full ${agent.color}`}
                      initial={{ width: "0%" }}
                      animate={{ width: agent.status === "completed" ? "100%" : agent.status === "running" ? "60%" : "10%" }}
                      transition={{ duration: 1.5, delay: 0.8 }}
                    />
                  </div>
                  <p className="mt-2 text-[10px] capitalize text-gray-400">{agent.status}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

function AgentsSection() {
  return (
    <section id="agents" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="rounded-full border-gray-200 bg-white px-4 py-1.5 text-xs uppercase tracking-wider text-gray-500 font-semibold">
              Three specialized agents
            </Badge>
          </motion.div>
          <motion.h2
            className="mt-4 text-3xl font-bold text-taskly-dark sm:text-4xl font-playfair"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Each agent handles the work that actually slows founders down.
          </motion.h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {agents.map((agent) => {
            const Icon = agent.icon;
            return (
              <MotionCard key={agent.name} delay={agent.delay}>
                <Card className={`h-full rounded-2xl border ${agent.borderColor} bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${agent.bgColor}/30`}>
                  <CardHeader>
                    <div className={`flex size-12 items-center justify-center rounded-xl ${agent.bgColor} shadow-sm`}>
                      <Icon className={`size-6 ${agent.color.replace("bg-", "text-")}`} />
                    </div>
                    <CardTitle className="mt-4 text-xl font-bold text-taskly-dark">{agent.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-gray-500">{agent.desc}</p>
                    <Button variant="ghost" className="mt-4 h-8 px-0 text-taskly-orange hover:text-taskly-orange/80 hover:bg-transparent" asChild>
                      <Link href={`/dashboard/${agent.name.toLowerCase()}`}>
                        Launch agent <ChevronRight className="ml-1 size-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </MotionCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Connect your model",
      desc: "Add your OpenAI, Anthropic, or Gemini key. Encrypted and stored securely — no markup on usage.",
      icon: Lock,
    },
    {
      num: "02",
      title: "Choose an agent",
      desc: "Research, Build, or Growth — each follows a structured workflow instead of a one-shot prompt.",
      icon: Bot,
    },
    {
      num: "03",
      title: "Get structured output",
      desc: "Reports, specs, and campaigns saved as reusable assets. Share with your team or revisit anytime.",
      icon: Sparkles,
    },
  ];

  return (
    <section id="how" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="rounded-full border-gray-200 bg-white px-4 py-1.5 text-xs uppercase tracking-wider text-gray-500 font-semibold">
              How it works
            </Badge>
          </motion.div>
          <motion.h2
            className="mt-4 text-3xl font-bold text-taskly-dark sm:text-4xl font-playfair"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            From zero to execution-ready in minutes.
          </motion.h2>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-gray-200 to-transparent hidden lg:block" />

          <div className="grid gap-8 lg:grid-cols-3">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <MotionCard key={step.num} delay={i * 0.15}>
                  <div className="relative rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-5xl font-black text-gray-100 font-playfair">{step.num}</span>
                      <div className="flex size-10 items-center justify-center rounded-xl bg-taskly-orange/10 text-taskly-orange">
                        <Icon className="size-5" />
                      </div>
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-taskly-dark">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">{step.desc}</p>
                  </div>
                </MotionCard>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      desc: "Try TaskLyne with no commitment.",
      features: ["5 tasks/month", "All 3 agents", "BYOK support", "7-day history"],
      accent: false,
      cta: "Get started",
    },
    {
      name: "Pro",
      price: "$49",
      period: "/month",
      desc: "For active product and growth cycles.",
      features: ["200 tasks/month", "All 3 agents", "Priority support", "Unlimited history", "Team workspaces"],
      accent: true,
      cta: "Start Pro",
    },
    {
      name: "Scale",
      price: "$99",
      period: "/month",
      desc: "For lean teams running across functions.",
      features: ["Unlimited tasks", "All 3 agents", "Dedicated support", "Unlimited history", "Advanced team features", "SSO-ready"],
      accent: false,
      cta: "Start Scale",
    },
  ];

  return (
    <section id="pricing" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="rounded-full border-gray-200 bg-white px-4 py-1.5 text-xs uppercase tracking-wider text-gray-500 font-semibold">
              Pricing
            </Badge>
          </motion.div>
          <motion.h2
            className="mt-4 text-3xl font-bold text-taskly-dark sm:text-4xl font-playfair"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Simple pricing. No surprises.
          </motion.h2>
          <motion.p
            className="mt-3 text-gray-500"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Your model costs stay separate — always know what you pay.
          </motion.p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <MotionCard key={plan.name} delay={i * 0.1}>
              <Card className={`rounded-2xl border ${plan.accent ? "border-taskly-orange bg-taskly-orange text-white shadow-xl shadow-taskly-orange/20" : "border-gray-200 bg-white shadow-sm"}`}>
                <CardHeader>
                  {plan.accent && <Badge className="mb-2 w-fit rounded-full bg-white/20 px-3 py-1 text-xs text-white font-medium">Most popular</Badge>}
                  <CardTitle className={`text-2xl font-bold ${plan.accent ? "text-white" : "text-taskly-dark"}`}>{plan.name}</CardTitle>
                  <div className="flex items-end gap-1">
                    <span className={`text-4xl font-black tracking-tight ${plan.accent ? "text-white" : "text-taskly-dark"}`}>{plan.price}</span>
                    <span className={`pb-1 text-sm ${plan.accent ? "text-white/70" : "text-gray-400"}`}>{plan.period}</span>
                  </div>
                  <p className={`text-sm ${plan.accent ? "text-white/70" : "text-gray-500"}`}>{plan.desc}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm">
                        <Check className={`size-4 ${plan.accent ? "text-white/70" : "text-taskly-orange"}`} />
                        <span className={plan.accent ? "text-white/85" : "text-gray-600"}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`mt-6 h-11 w-full rounded-xl font-semibold ${plan.accent ? "bg-white text-taskly-orange hover:bg-white/90" : "bg-taskly-orange text-white hover:bg-taskly-orange/90 shadow-md shadow-taskly-orange/25"}`}
                    asChild
                  >
                    <Link href="/signup">{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            </MotionCard>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-white py-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,122,0,0.08),transparent_70%)]" />
      <FloatingOrb className="top-0 left-1/4 h-64 w-64 bg-taskly-orange" delay={0} />
      <FloatingOrb className="bottom-0 right-1/4 h-48 w-48 bg-blue-400" delay={1} />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Zap className="mx-auto size-12 text-taskly-orange" />
          <h2 className="mt-6 text-4xl font-bold text-taskly-dark sm:text-5xl font-playfair">
            Your startup&apos;s new operating layer.
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Stop prompting in circles. Start shipping with structure.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="h-12 rounded-xl bg-taskly-orange px-10 text-base font-semibold text-white hover:bg-taskly-orange/90 shadow-lg shadow-taskly-orange/25" asChild>
              <Link href="/signup">
                Create free account
                <ArrowRight className="ml-2 size-5" />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" className="text-gray-500 hover:text-taskly-dark" asChild>
              <Link href="/login">Already have an account?</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-gray-400 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <TaskLyneLogo size={28} />
          <span className="font-semibold text-taskly-dark">TaskLyne</span>
          <span className="text-gray-400">AI workspace for startups.</span>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <Link href="#agents" className="hover:text-taskly-orange">Agents</Link>
          <Link href="#how" className="hover:text-taskly-orange">How it works</Link>
          <Link href="#pricing" className="hover:text-taskly-orange">Pricing</Link>
          <Link href="/login" className="hover:text-taskly-orange">Login</Link>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-taskly-dark">
      <Navbar />
      <main>
        <Hero />
        <AgentsSection />
        <HowItWorks />
        <PricingSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
