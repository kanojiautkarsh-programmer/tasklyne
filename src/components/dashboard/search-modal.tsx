"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ExternalLink, BarChart3, Target, TrendingUp, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  title: string;
  description: string | null;
  agent_type: "research" | "build" | "growth";
  status: string;
  created_at: string;
}

interface SearchResponse {
  query: string;
  results: {
    tasks: SearchResult[];
  };
  total: number;
}

const AGENT_ICONS = {
  research: BarChart3,
  build: Target,
  growth: TrendingUp,
};

const AGENT_COLORS = {
  research: "bg-blue-100 text-blue-600",
  build: "bg-amber-100 text-amber-600",
  growth: "bg-emerald-100 text-emerald-600",
};

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: async (): Promise<SearchResponse> => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
  });

  const handleResultClick = useCallback(() => {
    onClose();
    setQuery("");
    router.push("/dashboard/tasks");
  }, [onClose, router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      setQuery("");
    }
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        setQuery("");
      }
    }}>
      <DialogContent className="p-0 gap-0 max-w-xl overflow-hidden rounded-2xl">
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="size-5 text-gray-400 shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks..."
            className="border-0 shadow-none text-base focus-visible:ring-0 p-0 h-auto"
            autoFocus
          />
          {isLoading && <Loader2 className="size-4 animate-spin text-gray-400 shrink-0" />}
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {!debouncedQuery && (
            <div className="py-8 text-center text-sm text-gray-500">
              <Search className="size-8 mx-auto mb-2 opacity-50" />
              <p>Start typing to search your tasks</p>
            </div>
          )}

          {debouncedQuery && debouncedQuery.length < 2 && (
            <div className="py-8 text-center text-sm text-gray-500">
              <p>Enter at least 2 characters to search</p>
            </div>
          )}

          {debouncedQuery && debouncedQuery.length >= 2 && !isLoading && data?.results.tasks.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500">
              <FileText className="size-8 mx-auto mb-2 opacity-50" />
              <p>No results found for &quot;{debouncedQuery}&quot;</p>
            </div>
          )}

          {data?.results.tasks && data.results.tasks.length > 0 && (
            <div className="space-y-1">
              <p className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tasks ({data.total})
              </p>
              {data.results.tasks.map((result) => {
                const Icon = AGENT_ICONS[result.agent_type] ?? FileText;
                const colorClass = AGENT_COLORS[result.agent_type] ?? "bg-gray-100 text-gray-600";
                
                return (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick()}
                    className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className={cn("size-8 rounded-lg flex items-center justify-center shrink-0", colorClass.split(" ").map(c => c.replace("text-", "bg-")))}>
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-taskly-dark truncate">{result.title}</p>
                      {result.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{result.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                          {result.agent_type}
                        </Badge>
                        <span className="text-[10px] text-gray-400">
                          {new Date(result.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="size-4 text-gray-400 shrink-0 mt-1" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t p-3 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 font-mono">Esc</kbd> to close</span>
          </div>
          <span>Search powered by TaskLyne</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
