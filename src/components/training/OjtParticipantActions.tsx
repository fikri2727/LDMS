"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmProvider";

export function OjtParticipantActions({
  onRemove,
}: {
  onRemove: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  return (
    <button
      disabled={pending}
      title="Remove participant"
      onClick={async () => {
        if (await confirm("Remove this participant from the OJT?")) startTransition(onRemove);
      }}
      className="p-1.5 text-gray-400 hover:text-red-600"
    >
      <Trash2 size={15} />
    </button>
  );
}
