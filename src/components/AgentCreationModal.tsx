"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Search, Hammer, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AgentType = "research" | "build" | "growth";

type AgentCreationModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const AGENT_HREF: Record<AgentType, string> = {
  research: "/dashboard/research",
  build: "/dashboard/build",
  growth: "/dashboard/growth",
};

const agentTypes = [
  {
    id: "research" as const,
    label: "Research Agent",
    description: "Analyze markets, competitors, and customer sentiment",
    icon: Search,
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    id: "build" as const,
    label: "Build Agent",
    description: "Generate PRDs, features specs, and technical architecture",
    icon: Hammer,
    color: "bg-amber-500/10 text-amber-600",
  },
  {
    id: "growth" as const,
    label: "Growth Agent",
    description: "Create cold emails, blog content, and growth strategies",
    icon: TrendingUp,
    color: "bg-emerald-500/10 text-emerald-600",
  },
];

export default function AgentCreationModal({
  isOpen,
  onClose,
}: AgentCreationModalProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    goal: "",
    agentType: "research" as AgentType,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to create task (${res.status})`);
      }

      const { taskId } = await res.json();

      toast.success(`"${formData.name}" created successfully!`);
      setFormData({ name: "", goal: "", agentType: "research" });
      onClose();

      const params = new URLSearchParams({
        taskId,
        name: formData.name,
        goal: formData.goal,
      });
      router.push(`${AGENT_HREF[formData.agentType]}?${params.toString()}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create agent";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: "", goal: "", agentType: "research" });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl animate-fade-up">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-taskly-dark font-playfair">
                Create New Agent
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Set up an AI agent to help with your startup tasks
              </p>
            </div>
            <button
              onClick={handleClose}
              className="rounded-full size-10 bg-gray-100 hover:bg-taskly-orange hover:text-white flex items-center justify-center text-gray-500 transition-all duration-200"
              aria-label="Close modal"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm">
                <p className="text-taskly-orange font-medium">{error}</p>
              </div>
            )}

            {/* Agent Type Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-taskly-dark">
                Select Agent Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {agentTypes.map((agent) => {
                  const Icon = agent.icon;
                  const isSelected = formData.agentType === agent.id;
                  
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, agentType: agent.id })}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 text-center",
                        isSelected 
                          ? "border-taskly-orange bg-taskly-orange/5" 
                          : "border-gray-100 hover:border-gray-200 bg-white"
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-taskly-orange rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      <div className={cn("p-2.5 rounded-xl mb-2", agent.color)}>
                        <Icon className="size-6" />
                      </div>
                      <span className="text-sm font-semibold text-taskly-dark">
                        {agent.label}
                      </span>
                      <span className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {agent.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Agent Name Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-taskly-dark">
                Agent Name <span className="text-taskly-orange">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Competitor Analyst, MVP Builder, Email Campaign Manager"
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-taskly-orange focus:ring-4 focus:ring-taskly-orange/10 text-taskly-dark text-sm font-inter transition-all duration-200 outline-none"
                required
              />
            </div>

            {/* Goal Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-taskly-dark">
                What should this agent do? <span className="text-taskly-orange">*</span>
              </label>
              <textarea
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                rows={4}
                placeholder="Describe the specific task or goal for this agent. For example: 'Analyze pricing strategies of top 5 SaaS competitors in HR tech, including their features, pricing tiers, and market positioning'"
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-taskly-orange focus:ring-4 focus:ring-taskly-orange/10 text-taskly-dark text-sm font-inter transition-all duration-200 outline-none resize-none"
                required
              />
              <p className="text-xs text-gray-400">
                Be specific about your goals for better AI results
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-3 bg-transparent text-gray-600 text-sm font-semibold hover:text-taskly-dark rounded-xl transition-colors duration-200"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !formData.name.trim() || !formData.goal.trim()}
                className={cn(
                  "px-6 py-3 bg-taskly-orange text-white text-sm font-semibold rounded-xl",
                  "hover:bg-taskly-orange/90 active:bg-taskly-orange/80",
                  "disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed",
                  "transition-all duration-200 flex items-center gap-2",
                  "shadow-lg shadow-taskly-orange/25",
                  !isSubmitting && formData.name.trim() && formData.goal.trim() && "hover:scale-[1.02]"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Search className="size-4" />
                    Create Agent
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
