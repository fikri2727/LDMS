"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { PROGRAM_LABELS, PLATFORM_LABELS, FUNCTION_LABELS } from "@/lib/labels";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import type { StaffOption } from "@/lib/db-types";

interface TrainingInitial {
  title?: string;
  program?: string;
  cost?: number;
  platform?: string;
  function?: string;
  venue?: string;
  hrdcClaimable?: boolean;
  hrdcAllowance?: number | null;
  hrdcGrantId?: string | null;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  trainer?: string;
  trainingProvider?: string | null;
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
  staffOptions = [],
}: {
  action: (formData: FormData) => void;
  initial?: TrainingInitial;
  submitLabel: string;
  /** Active staff - the Trainer list for "Inhouse (Internal Trainer)". */
  staffOptions?: StaffOption[];
}) {
  const [hrdc, setHrdc] = useState(initial?.hrdcClaimable ?? false);
  const [program, setProgram] = useState(initial?.program ?? "");
  const [trainer, setTrainer] = useState(initial?.trainer ?? "");
  // Internal trainer = a TAMCO staff member, picked from the list. The name is stored (as before),
  // so "My Top Trainers" keeps grouping by name. A saved name that's no longer in the list stays selectable.
  const internalTrainer = program === "INTI";
  const trainerOptions = useMemo(() => {
    const opts = staffOptions.map((s) => ({ value: s.staffName, label: `${s.staffName} (${s.staffNo})` }));
    const saved = initial?.trainer;
    if (saved && !opts.some((o) => o.value === saved)) opts.unshift({ value: saved, label: saved });
    return opts;
  }, [staffOptions, initial?.trainer]);
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Program</label>
          <select
            name="program"
            value={program}
            onChange={(e) => setProgram(e.target.value)}
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

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Training Provider <span className="text-text-muted font-normal">(optional)</span>
        </label>
        <input
          name="trainingProvider"
          defaultValue={initial?.trainingProvider ?? ""}
          placeholder="e.g. NIOSH, SHRDC"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
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
          {internalTrainer ? (
            <div className="relative">
              <SearchableSelect
                name="trainer"
                options={trainerOptions}
                value={trainer}
                onChange={setTrainer}
                placeholder="Search staff by name or no..."
                emptyLabel="— Select staff —"
              />
              {/* lets the browser's "please fill in" check cover the staff picker too */}
              <input
                tabIndex={-1}
                aria-hidden
                required
                value={trainer}
                onChange={() => {}}
                className="absolute inset-x-0 bottom-0 h-px opacity-0 pointer-events-none"
              />
            </div>
          ) : (
            <input
              name="trainer"
              value={trainer}
              onChange={(e) => setTrainer(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            checked={hrdc}
            onChange={(e) => setHrdc(e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary"
          />
          HRDC Claimable
        </label>
      </div>

      {hrdc && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              HRDC Allowance (RM) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="hrdcAllowance"
              defaultValue={initial?.hrdcAllowance ?? undefined}
              required
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              HRDC Grant ID <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <input
              name="hrdcGrantId"
              defaultValue={initial?.hrdcGrantId ?? ""}
              placeholder="e.g. HRDC-2026-00123"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      )}

      <SubmitButton label={submitLabel} />
    </form>
  );
}
