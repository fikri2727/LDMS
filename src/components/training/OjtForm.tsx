"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { TRAINER_TYPE_LABELS } from "@/lib/labels";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RatingField } from "@/components/training/OjtRatingField";

interface OjtInitial {
  title?: string;
  venue?: string;
  trainerType?: string;
  trainerName?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
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
            ? "Save changes to this OJT record?"
            : label === "Submit OJT"
              ? "Submit this OJT record?"
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

export function OjtForm({
  action,
  initial,
  submitLabel,
  isNew,
  canKeyInForOthers,
  trainerStaffOptions,
}: {
  action: (formData: FormData) => void;
  initial?: OjtInitial;
  submitLabel: string;
  isNew: boolean;
  canKeyInForOthers?: boolean;
  trainerStaffOptions?: string[];
}) {
  const [trainerType, setTrainerType] = useState(initial?.trainerType ?? "");
  const [trainerName, setTrainerName] = useState(initial?.trainerName ?? "");

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
          <label className="block text-sm font-medium text-text-secondary mb-1">Trainer Type</label>
          <select
            name="trainerType"
            value={trainerType}
            onChange={(e) => {
              setTrainerType(e.target.value);
              setTrainerName("");
            }}
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>
              Select trainer type
            </option>
            {Object.entries(TRAINER_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Trainer Name</label>
        {trainerType === "INTERNAL" ? (
          <SearchableSelect
            name="trainerName"
            value={trainerName}
            onChange={setTrainerName}
            options={(trainerStaffOptions ?? []).map((name) => ({ value: name, label: name }))}
            placeholder="Search staff name..."
            emptyLabel="— Select staff —"
          />
        ) : (
          <input
            name="trainerName"
            value={trainerName}
            onChange={(e) => setTrainerName(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        )}
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

      {isNew && canKeyInForOthers && (
        <div className="border-t border-border pt-5">
          <p className="text-sm text-text-secondary">
            Save this OJT session first, then add participants by searching staff (or upload an Excel list) from
            the OJT record page. Each participant fills in their own before/after skill survey.
          </p>
        </div>
      )}

      {isNew && !canKeyInForOthers && (
        <div className="border-t border-border pt-5">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
            My Learning Survey
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                What have you learned from this OJT?
              </label>
              <textarea
                name="q1"
                rows={2}
                required
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <RatingField name="q2" label="Self-rated skill level BEFORE this OJT" />
            <RatingField name="q3" label="Self-rated skill level AFTER this OJT" />
          </div>
        </div>
      )}

      <SubmitButton label={submitLabel} />
    </form>
  );
}
