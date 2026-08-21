"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, X } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { useConfirm } from "@/components/ui/ConfirmProvider";

interface StaffOption {
  id: number;
  staffNo: string;
  staffName: string;
}

interface RequisitionInitial {
  title?: string;
  trainingDate?: string;
  trainingEndDate?: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
  objective?: string;
  fees?: number;
  hrdcClaimable?: boolean;
  trainingProvider?: string;
  remarks?: string;
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
        const form = e.currentTarget.closest("form");
        const participantCount = form?.querySelectorAll('input[name="participantUserIds"]').length ?? 0;
        if (participantCount === 0) {
          alert("Add at least one participant.");
          return;
        }
        const dateValue = (form?.elements.namedItem("trainingDate") as HTMLInputElement | null)?.value;
        if (!dateValue) {
          alert("Please select a training date.");
          return;
        }
        if (await confirm(`${label} this training requisition?`)) {
          form?.requestSubmit();
        }
      }}
      className="rounded-xl bg-primary-dark hover:bg-primary disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 transition-colors"
    >
      {pending ? "Submitting..." : label}
    </button>
  );
}

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-text-secondary mb-1">
      {children} <span className="text-rose-500">*</span>
    </label>
  );
}

function ParticipantsField({
  staffOptions,
  initialParticipants,
}: {
  staffOptions: StaffOption[];
  initialParticipants: StaffOption[];
}) {
  const [participants, setParticipants] = useState<StaffOption[]>(initialParticipants);
  const [pickerValue, setPickerValue] = useState("");

  const available = staffOptions.filter((s) => !participants.some((p) => p.id === s.id));

  function addParticipant() {
    const id = Number(pickerValue);
    const staff = staffOptions.find((s) => s.id === id);
    if (!staff || participants.some((p) => p.id === id)) return;
    setParticipants((prev) => [...prev, staff]);
    setPickerValue("");
  }

  function removeParticipant(id: number) {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <RequiredLabel>Participants</RequiredLabel>
      <div className="flex gap-2 mb-2">
        <div className="flex-1">
          <SearchableSelect
            name="__participantPicker"
            value={pickerValue}
            onChange={setPickerValue}
            options={available.map((s) => ({ value: String(s.id), label: `${s.staffName} (${s.staffNo})` }))}
            placeholder="Search staff to add..."
            emptyLabel="— Select staff —"
          />
        </div>
        <button
          type="button"
          onClick={addParticipant}
          disabled={!pickerValue}
          className="flex shrink-0 items-center gap-1 rounded-xl bg-primary-dark hover:bg-primary disabled:opacity-40 text-white text-sm font-medium px-3 py-2 transition-colors"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {participants.length === 0 ? (
        <p className="text-xs text-text-muted">No participants added yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-border bg-gray-50 px-3 py-1.5 text-sm"
            >
              <span className="text-text-primary">
                {p.staffName} <span className="text-text-muted">({p.staffNo})</span>
              </span>
              <button
                type="button"
                onClick={() => removeParticipant(p.id)}
                className="text-rose-500 hover:text-rose-600"
              >
                <X size={14} />
              </button>
              <input type="hidden" name="participantUserIds" value={p.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RequisitionForm({
  action,
  initial,
  submitLabel,
  staffOptions,
  initialParticipants,
}: {
  action: (formData: FormData) => void;
  initial?: RequisitionInitial;
  submitLabel: string;
  staffOptions: StaffOption[];
  initialParticipants: StaffOption[];
}) {
  return (
    <form action={action} className="space-y-5 max-w-2xl">
      <ParticipantsField staffOptions={staffOptions} initialParticipants={initialParticipants} />

      <div>
        <RequiredLabel>Title</RequiredLabel>
        <input
          name="title"
          defaultValue={initial?.title}
          required
          placeholder="Training / course title"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <RequiredLabel>Date</RequiredLabel>
        <p className="text-xs text-text-muted mb-2">Click a start date, then click again for the end date (or the same day for a one-day training).</p>
        <DateRangePicker
          startName="trainingDate"
          endName="trainingEndDate"
          initialStart={initial?.trainingDate}
          initialEnd={initial?.trainingEndDate}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <RequiredLabel>Start Time</RequiredLabel>
          <input
            type="time"
            name="startTime"
            defaultValue={initial?.startTime ?? "09:00"}
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <RequiredLabel>End Time</RequiredLabel>
          <input
            type="time"
            name="endTime"
            defaultValue={initial?.endTime ?? "17:00"}
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <RequiredLabel>Venue</RequiredLabel>
        <input
          name="venue"
          defaultValue={initial?.venue}
          required
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <RequiredLabel>Objective Training</RequiredLabel>
        <textarea
          name="objective"
          defaultValue={initial?.objective}
          required
          rows={3}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <RequiredLabel>Fees (RM)</RequiredLabel>
          <input
            type="number"
            name="fees"
            defaultValue={initial?.fees}
            min={0}
            step="0.01"
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <RequiredLabel>HRDC Claimable</RequiredLabel>
          <select
            name="hrdcClaimable"
            defaultValue={initial?.hrdcClaimable ? "yes" : initial?.hrdcClaimable === false ? "no" : ""}
            required
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>
              Select
            </option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>

      <div>
        <RequiredLabel>Training Provider</RequiredLabel>
        <input
          name="trainingProvider"
          defaultValue={initial?.trainingProvider}
          required
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Remarks (if any)</label>
        <textarea
          name="remarks"
          defaultValue={initial?.remarks}
          rows={2}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Training Brochure <span className="text-text-muted font-normal">(optional)</span>
        </label>
        <input
          type="file"
          name="brochureFile"
          accept="application/pdf,image/*"
          className="w-full text-sm text-text-secondary file:mr-3 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary-dark file:px-3 file:py-1.5 file:text-sm"
        />
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
