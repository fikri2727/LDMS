"use client";

import { useState, useTransition } from "react";
import { resetPassword, deleteStaff } from "@/app/(app)/staff/actions";
import { useConfirm } from "@/components/ui/ConfirmProvider";

export function StaffDangerZone({ staffId, staffName }: { staffId: number; staffName: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        // Next.js's redirect()/notFound() work by throwing a tagged error that
        // the framework expects to propagate — swallowing it here would break
        // the navigation deleteStaff performs on success.
        if (e && typeof e === "object" && "digest" in e && typeof e.digest === "string" && e.digest.startsWith("NEXT_")) {
          throw e;
        }
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="mt-10 max-w-2xl border-t border-border pt-6">
      <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
        Account
      </h3>

      {error && (
        <p className="mb-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          disabled={pending}
          onClick={async () => {
            if (await confirm(`Reset ${staffName}'s password to the default (P@ss1234)?`)) {
              run(() => resetPassword(staffId));
            }
          }}
          className="rounded-xl border border-border text-sm font-medium px-4 py-2 text-text-secondary hover:bg-gray-50 disabled:opacity-60"
        >
          Reset Password
        </button>
        <button
          disabled={pending}
          onClick={async () => {
            if (await confirm(`Permanently delete ${staffName}'s staff record? This cannot be undone.`)) {
              run(() => deleteStaff(staffId));
            }
          }}
          className="rounded-xl border border-rose-200 text-sm font-medium px-4 py-2 text-rose-600 hover:bg-rose-50 disabled:opacity-60"
        >
          Delete Staff Record
        </button>
      </div>
    </div>
  );
}
