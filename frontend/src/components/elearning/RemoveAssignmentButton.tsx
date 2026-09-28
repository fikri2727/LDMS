"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmProvider";

export function RemoveAssignmentButton({
  assignmentId,
  moduleId,
  staffName,
  onRemove,
}: {
  assignmentId: number;
  moduleId: number;
  staffName: string;
  onRemove: (id: number, moduleId: number) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  return (
    <button
      disabled={pending}
      onClick={async () => {
        if (await confirm(`Remove ${staffName}'s assignment to this module?`)) {
          startTransition(() => onRemove(assignmentId, moduleId));
        }
      }}
      className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-60"
      title="Remove assignment"
    >
      <X size={14} />
    </button>
  );
}
