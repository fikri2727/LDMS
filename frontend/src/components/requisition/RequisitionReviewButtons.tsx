"use client";

import { useTransition } from "react";
import { useConfirm } from "@/components/ui/ConfirmProvider";

export function RequisitionReviewButtons({
  onApprove,
  onReject,
  onComplete,
}: {
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  /** Admin-only — omit to hide the "Mark Completed" button entirely (e.g. for an HOD). */
  onComplete?: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  return (
    <div className="flex items-center gap-3">
      <button
        disabled={pending}
        onClick={async () => {
          if (await confirm("Approve this training requisition?")) startTransition(onApprove);
        }}
        className="rounded-xl bg-primary-dark hover:bg-primary disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors"
      >
        {pending ? "Please wait..." : "Approve"}
      </button>
      <button
        disabled={pending}
        onClick={async () => {
          if (await confirm("Reject this training requisition?")) startTransition(onReject);
        }}
        className="rounded-xl bg-rose-50 hover:bg-rose-100 disabled:opacity-60 text-rose-600 text-sm font-medium px-4 py-2 transition-colors"
      >
        {pending ? "Please wait..." : "Reject"}
      </button>
      {onComplete && (
        <button
          disabled={pending}
          onClick={async () => {
            if (await confirm("Mark this training requisition as Completed?")) startTransition(onComplete);
          }}
          className="rounded-xl bg-blue-50 hover:bg-blue-100 disabled:opacity-60 text-blue-600 text-sm font-medium px-4 py-2 transition-colors"
        >
          {pending ? "Please wait..." : "Mark Completed"}
        </button>
      )}
    </div>
  );
}
