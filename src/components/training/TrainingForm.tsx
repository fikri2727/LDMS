"use client";

import { useFormStatus } from "react-dom";
import { PROGRAM_LABELS, PLATFORM_LABELS, FUNCTION_LABELS } from "@/lib/labels";
import { useConfirm } from "@/components/ui/ConfirmProvider";

interface TrainingInitial {
  title?: string;
  program?: string;
  cost?: number;
  platform?: string;
  function?: string;
  venue?: string;
  hrdcClaimable?: boolean;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  trainer?: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const confirm = useConfirm();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={async (e) => {
        e.preventDefault();
        const form = e.currentTarget.form;
        const message =
          label === "Save Changes"
            ? "Save changes to this training record?"
            : label === "Create Training"
              ? "Create this training record?"
              : null;
        if (!message || (await confirm(message))) {
          form?.requestSubmit();
        }
      }}
      className="rounded-xl bg-primary-dark hover:bg-primary disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors"
    >
      {pending ? "Saving..." : label}
    </button>
  );
}

export function TrainingForm({
  action,
  initial,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  initial?: TrainingInitial;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-6 max-w-2xl">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Title</label>
        <input
          name="title"
          defaultValue={initial?.title}
          required
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Program</label>
          <select
            name="program"
            defaultValue={initial?.program ?? ""}
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>
              Select program
            </option>
            {Object.entries(PROGRAM_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Platform</label>
          <select
            name="platform"
            defaultValue={initial?.platform ?? ""}
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>
              Select platform
            </option>
            {Object.entries(PLATFORM_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Function</label>
          <select
            name="function"
            defaultValue={initial?.function ?? ""}
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>
              Select function
            </option>
            {Object.entries(FUNCTION_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Venue</label>
          <input
            name="venue"
            defaultValue={initial?.venue}
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Trainer</label>
          <input
            name="trainer"
            defaultValue={initial?.trainer}
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Start Date</label>
          <input
            type="date"
            name="startDate"
            defaultValue={initial?.startDate}
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">End Date</label>
          <input
            type="date"
            name="endDate"
            defaultValue={initial?.endDate}
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Start Time</label>
          <input
            type="time"
            name="startTime"
            defaultValue={initial?.startTime ?? "09:00"}
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">End Time</label>
          <input
            type="time"
            name="endTime"
            defaultValue={initial?.endTime ?? "17:00"}
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Cost (RM)</label>
          <input
            type="number"
            step="0.01"
            name="cost"
            defaultValue={initial?.cost}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary pb-2">
          <input
            type="checkbox"
            name="hrdcClaimable"
            defaultChecked={initial?.hrdcClaimable}
            className="rounded border-border text-primary focus:ring-primary"
          />
          HRDC Claimable
        </label>
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
