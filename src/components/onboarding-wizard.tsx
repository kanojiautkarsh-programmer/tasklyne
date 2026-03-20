"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  KeyRound,
  ArrowRight,
  X,
  Zap,
  Search,
  Hammer,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "tasklyne-onboarding-complete";

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const steps: Step[] = [
  {
    id: 1,
    title: "Welcome to TaskLyne",
    description:
      "Your startup's AI-powered operating layer. Three specialized agents help you research markets, build products, and grow your business.",
    icon: Zap,
    color: "text-taskly-orange",
    bgColor: "bg-taskly-orange/10",
  },
  {
    id: 2,
    title: "Add Your AI API Key",
    description:
      "TaskLyne uses your own API keys for maximum flexibility and cost control. Add an OpenAI, Anthropic, or Gemini key in Settings to get started.",
    icon: KeyRound,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: 3,
    title: "Try an Agent",
    description:
      "Use the Research Agent to analyze competitors, the Build Agent to generate specs, or the Growth Agent to create content — all powered by your own AI models.",
    icon: Search,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
];

const agentSteps = [
  { icon: Search, name: "Research", href: "/dashboard/research", color: "bg-blue-50 text-blue-600" },
  { icon: Hammer, name: "Build", href: "/dashboard/build", color: "bg-amber-50 text-amber-600" },
  { icon: TrendingUp, name: "Growth", href: "/dashboard/growth", color: "bg-emerald-50 text-emerald-600" },
];

interface OnboardingWizardProps {
  onComplete?: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [isOpen, setIsOpen] = useState(
    () => typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY),
  );
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  function handleComplete() {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
    onComplete?.();
  }

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  }

  function handleGoToSettings() {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
    router.push("/dashboard/settings");
  }

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-orange-50 to-amber-50 p-6 pb-8">
              <button
                onClick={handleDismiss}
                className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-white/60 hover:text-gray-600 transition-colors"
              >
                <X className="size-4" />
              </button>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="size-5 text-taskly-orange" />
                <span className="text-sm font-medium text-taskly-orange">Getting Started</span>
              </div>
              <h2 className="text-2xl font-bold text-taskly-dark font-playfair mt-2">{step.title}</h2>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className={`shrink-0 flex size-12 items-center justify-center rounded-2xl ${step.bgColor}`}>
                  <step.icon className={`size-6 ${step.color}`} />
                </div>
                <p className="text-sm leading-relaxed text-gray-600 pt-2">{step.description}</p>
              </div>

              {/* Agent cards on last step */}
              {isLast && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {agentSteps.map((agent) => (
                    <Link
                      key={agent.name}
                      href={agent.href}
                      className={`flex flex-col items-center gap-2 rounded-xl p-3 text-center transition-all hover:scale-105 ${agent.color}`}
                    >
                      <agent.icon className="size-5" />
                      <span className="text-xs font-medium">{agent.name}</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === currentStep
                        ? "w-6 bg-taskly-orange"
                        : i < currentStep
                        ? "w-2 bg-taskly-orange/40"
                        : "w-2 bg-gray-200"
                    }`}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep((s) => s - 1)}
                    className="flex-1 rounded-xl"
                  >
                    Back
                  </Button>
                )}
                {isLast ? (
                  <Button
                    onClick={handleComplete}
                    className="flex-1 bg-taskly-orange text-white hover:bg-taskly-orange/90 rounded-xl gap-2"
                  >
                    Go to Dashboard
                    <ArrowRight className="size-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => setCurrentStep((s) => s + 1)}
                    className="flex-1 bg-taskly-orange text-white hover:bg-taskly-orange/90 rounded-xl gap-2"
                  >
                    Next
                    <ArrowRight className="size-4" />
                  </Button>
                )}
              </div>

              {currentStep === 1 && (
                <button
                  onClick={handleGoToSettings}
                  className="mt-3 w-full text-center text-xs text-gray-400 hover:text-taskly-orange transition-colors"
                >
                  Skip to Settings to add your API key now
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
}
