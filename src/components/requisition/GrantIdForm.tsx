"use client";

import { useState, useTransition } from "react";
import { Pencil, Check } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmProvider";

export function GrantIdForm({
  initialGrantId,
  onSave,
}: {
  initialGrantId: string | null;
  onSave: (grantId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialGrantId ?? "");
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-primary">{initialGrantId || "—"}</span>
        <button
          type="button"
          onClick={() => {
            setValue(initialGrantId ?? "");
            setEditing(true);
          }}
          className="text-text-muted hover:text-primary-dark"
        >
          <Pencil size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. HRDC-2026-00123"
        disabled={pending}
        className="rounded-xl border border-border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
      />
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          if (!(await confirm("Save this grant ID?"))) return;
          startTransition(async () => {
            await onSave(value);
            setEditing(false);
          });
        }}
        className="rounded-xl bg-primary-dark hover:bg-primary disabled:opacity-60 text-white p-1.5 transition-colors"
      >
        <Check size={14} />
      </button>
    </div>
  );
}
