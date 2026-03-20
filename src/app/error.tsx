"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="rounded-full bg-red-50 p-4">
        <svg
          className="size-8 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-4.5a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-bold text-taskly-dark">Something went wrong</h2>
        <p className="mt-2 max-w-sm text-sm text-gray-500">
          {error?.message ?? "An unexpected error occurred. Your data is safe."}
        </p>
      </div>
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="rounded-xl border-gray-200"
          onClick={() => (window.location.href = "/dashboard")}
        >
          Go to Dashboard
        </Button>
        <Button
          className="rounded-xl bg-taskly-orange text-white hover:bg-taskly-orange/90"
          onClick={reset}
        >
          Try again
        </Button>
      </div>
    </div>
  );
}
