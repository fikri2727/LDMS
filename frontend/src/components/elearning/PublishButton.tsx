"use client";

import { useState, useTransition } from "react";
import { publishModule, unpublishModule } from "@/app/(app)/elearning/admin/actions";
import { useConfirm } from "@/components/ui/ConfirmProvider";

export function PublishButton({ moduleId, status }: { moduleId: number; status: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  async function handlePublish() {
    if (!(await confirm("Are you sure you want to publish this module? Learners will be able to access it once published."))) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await publishModule(moduleId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  async function handleUnpublish() {
    if (!(await confirm("Unpublish this module? Learners will no longer be able to access it."))) return;
    setError(null);
    startTransition(() => unpublishModule(moduleId));
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {status === "PUBLISHED" ? (
        <button
          disabled={pending}
          onClick={handleUnpublish}
          className="rounded-xl border border-border bg-surface text-sm font-medium px-4 py-2 text-text-secondary hover:bg-gray-50 disabled:opacity-60 transition-colors"
        >
          Unpublish
        </button>
      ) : (
        <button
          disabled={pending}
          onClick={handlePublish}
          className="rounded-xl bg-primary-dark hover:bg-primary text-white text-sm font-medium px-4 py-2 disabled:opacity-60 transition-colors"
        >
          Publish Module
        </button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
