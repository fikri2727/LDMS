"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Safety net for the authenticated app shell: without this, any thrown Error
 * from a page or server action (e.g. "Division name is required.") crashed
 * to Next.js's raw, unbranded "This page couldn't load" screen with no way
 * back except a full reload. This keeps the sidebar/header intact and gives
 * the user a readable message and a way to recover.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto text-center py-16">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
        <AlertTriangle size={22} />
      </div>
      <h1 className="text-xl font-semibold text-text-primary mb-2">Something went wrong</h1>
      <p className="text-sm text-text-secondary mb-6">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-primary-dark hover:bg-primary text-white text-sm font-medium px-4 py-2 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
