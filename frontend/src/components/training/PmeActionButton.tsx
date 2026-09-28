"use client";

import { useTransition } from "react";
import { useConfirm } from "@/components/ui/ConfirmProvider";

export function PmeActionButton({
  label,
  confirmMessage,
  onAction,
}: {
  label: string;
  confirmMessage?: string;
  onAction: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  return (
    <button
      disabled={pending}
      onClick={async () => {
        if (!confirmMessage || (await confirm(confirmMessage))) {
          startTransition(onAction);
        }
      }}
      className="rounded-xl bg-primary-dark hover:bg-primary disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors"
    >
      {pending ? "Please wait..." : label}
    </button>
  );
}
