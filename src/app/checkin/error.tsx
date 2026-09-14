"use client";

import { useEffect } from "react";

/** Safety net for the public, no-login check-in flow — same reasoning as (app)/error.tsx. */
export default function CheckinError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eef2f7] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-8 text-center">
        <h1 className="text-lg font-semibold text-text-primary mb-2">Something went wrong</h1>
        <p className="text-sm text-text-secondary mb-6">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="w-full rounded-xl bg-primary-dark hover:bg-primary text-white text-sm font-semibold py-2.5 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
