"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white p-6">
          <div className="rounded-full bg-red-50 p-5">
            <svg
              className="size-10 text-red-500"
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
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">App crashed</h1>
            <p className="mt-2 max-w-sm text-sm text-gray-500">
              An unexpected error occurred. Please refresh the page.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => (window.location.href = "/")}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              Go home
            </button>
            <button
              onClick={reset}
              className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              Retry
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
