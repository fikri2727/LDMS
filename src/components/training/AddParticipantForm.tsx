"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useConfirm } from "@/components/ui/ConfirmProvider";

interface StaffOption {
  id: number;
  staffNo: string;
  staffName: string;
}

export function AddParticipantForm({
  staffOptions,
  onAdd,
}: {
  staffOptions: StaffOption[];
  onAdd: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-primary-dark hover:text-primary"
      >
        <Plus size={15} /> Add Participant
      </button>
    );
  }

  return (
    <div>
      {error && <p className="text-sm text-rose-600 mb-2">{error}</p>}
      <form
        action={(fd) =>
          startTransition(async () => {
            setError(null);
            try {
              await onAdd(fd);
              setOpen(false);
              setUserId("");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Something went wrong.");
            }
          })
        }
        className="flex items-center gap-2"
      >
        <div className="min-w-[280px]">
          <SearchableSelect
            name="userId"
            value={userId}
            onChange={setUserId}
            options={staffOptions.map((s) => ({ value: String(s.id), label: `${s.staffName} (${s.staffNo})` }))}
            placeholder="Search staff by name or no..."
            emptyLabel="Select staff..."
          />
        </div>
        <button
          type="submit"
          disabled={pending || !userId}
          onClick={async (e) => {
            e.preventDefault();
            const form = e.currentTarget.form;
            if (await confirm("Add this staff member as a participant?")) {
              form?.requestSubmit();
            }
          }}
          className="rounded-xl bg-primary-dark text-white text-sm font-medium px-3 py-2 hover:bg-primary transition-colors disabled:opacity-60"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="rounded-xl border border-border text-sm px-3 py-2 text-text-secondary hover:bg-gray-50"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
