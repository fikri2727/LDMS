"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { deleteRequisition } from "@/app/(app)/requisition/actions";

export function DeleteRequisitionButton({ id, title }: { id: number; title: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  async function handleDelete() {
    if (!(await confirm(`Permanently delete "${title}"? This cannot be undone.`))) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteRequisition(id);
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
        type="button"
        disabled={pending}
        onClick={handleDelete}
        className="flex items-center gap-1.5 rounded-xl border border-rose-200 text-sm font-medium px-3 py-2 text-rose-600 hover:bg-rose-50 disabled:opacity-60 transition-colors"
      >
        <Trash2 size={15} /> {pending ? "Deleting..." : "Delete"}
      </button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
