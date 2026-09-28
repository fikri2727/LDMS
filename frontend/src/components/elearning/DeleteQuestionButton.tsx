"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmProvider";

export function DeleteQuestionButton({
  id,
  lessonId,
  moduleId,
  onDelete,
}: {
  id: number;
  lessonId: number;
  moduleId: number;
  onDelete: (id: number, lessonId: number, moduleId: number) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  return (
    <button
      disabled={pending}
      onClick={async () => {
        if (await confirm("Delete this question?")) startTransition(() => onDelete(id, lessonId, moduleId));
      }}
      className="p-1 text-text-muted hover:text-red-600 disabled:opacity-60 shrink-0"
      title="Delete question"
    >
      <Trash2 size={14} />
    </button>
  );
}
