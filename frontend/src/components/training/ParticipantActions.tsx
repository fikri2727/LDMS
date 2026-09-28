"use client";

import { useTransition } from "react";
import { Trash2, UserX } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmProvider";

export function ParticipantActions({
  canManage,
  showMarkAbsent,
  onRemove,
  onMarkAbsent,
}: {
  canManage: boolean;
  showMarkAbsent: boolean;
  onRemove: () => Promise<void>;
  onMarkAbsent: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  if (!canManage) return null;

  return (
    <span className="flex items-center gap-1 justify-end">
      {showMarkAbsent && (
        <button
          disabled={pending}
          title="Mark absent"
          onClick={() => startTransition(onMarkAbsent)}
          className="p-1.5 text-gray-400 hover:text-amber-600"
        >
          <UserX size={15} />
        </button>
      )}
      <button
        disabled={pending}
        title="Remove participant"
        onClick={async () => {
          if (await confirm("Remove this participant from the training?")) {
            startTransition(onRemove);
          }
        }}
        className="p-1.5 text-gray-400 hover:text-red-600"
      >
        <Trash2 size={15} />
      </button>
    </span>
  );
}
