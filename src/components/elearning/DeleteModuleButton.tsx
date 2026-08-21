"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { deleteModule } from "@/app/(app)/elearning/admin/actions";

export function DeleteModuleButton({ moduleId, title }: { moduleId: number; title: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  async function handleDelete() {
    if (
      !(await confirm(
        `Delete "${title}"? This permanently removes the module, its lessons, quizzes, assignments, and any learner completions and certificates. This cannot be undone.`
      ))
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deleteModule(moduleId);
      } catch (e) {
        if (e && typeof e === "object" && "digest" in e && typeof e.digest === "string" && e.digest.startsWith("NEXT_")) {
          throw e;
        }
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        disabled={pending}
        onClick={handleDelete}
        className="flex items-center gap-1.5 rounded-xl border border-red-200 text-sm font-medium px-3 py-2 text-red-600 hover:bg-red-50 disabled:opacity-60 transition-colors"
      >
        <Trash2 size={15} /> Delete
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
