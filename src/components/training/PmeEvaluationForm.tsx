"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { RATING_BAND_LABELS, RATING_BAND_RANGES, RATING_BAND_SHORT_LABELS } from "@/lib/labels";
import { useConfirm } from "@/components/ui/ConfirmProvider";

function extractPercent(text: string): number | null {
  const match = text.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  const confirm = useConfirm();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={async (e) => {
        e.preventDefault();
        const form = e.currentTarget.form;
        if (await confirm("Submit this PME evaluation? You won't be able to change it afterwards.")) {
          form?.requestSubmit();
        }
      }}
      className="w-full rounded-xl bg-primary-dark hover:bg-primary disabled:opacity-60 text-white text-sm font-medium py-2.5 transition-colors"
    >
      {pending ? "Submitting..." : "Submit"}
    </button>
  );
}

function DisplayField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-text-primary mb-1">{label}</p>
      <div className="w-full rounded-xl border border-border bg-gray-50 px-2.5 py-1.5 text-xs text-text-secondary">
        {value || "—"}
      </div>
    </div>
  );
}

function RatingQuestion({
  prefix,
  number,
  question,
  remarkRequired = false,
}: {
  prefix: string;
  number: number;
  question: string;
  remarkRequired?: boolean;
}) {
  const [selectedBand, setSelectedBand] = useState<string | null>(null);
  const [percentText, setPercentText] = useState("");
  const percentRef = useRef<HTMLInputElement>(null);

  const range = selectedBand ? RATING_BAND_RANGES[selectedBand] : null;
  const enteredNumber = extractPercent(percentText);
  const outOfRange =
    range != null && enteredNumber != null && (enteredNumber < range[0] || enteredNumber > range[1]);

  useEffect(() => {
    if (!percentRef.current) return;
    if (outOfRange && range) {
      percentRef.current.setCustomValidity(
        `Must be between ${range[0]}% and ${range[1]}% to match the selected rating.`
      );
    } else {
      percentRef.current.setCustomValidity("");
    }
  }, [outOfRange, range]);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 mb-4">
      <p className="text-sm text-text-primary mb-3">
        {number}. {question} <span className="text-rose-500">*</span>
      </p>
      <div className="space-y-1.5 mb-3">
        {Object.entries(RATING_BAND_LABELS).map(([v, l]) => (
          <label key={v} className="flex items-start gap-2 text-xs text-text-secondary cursor-pointer">
            <input
              type="radio"
              name={`${prefix}Rating`}
              value={v}
              required
              checked={selectedBand === v}
              onChange={() => setSelectedBand(v)}
              className="mt-0.5 text-primary focus:ring-primary"
            />
            <span className="font-medium">{l}</span>
          </label>
        ))}
      </div>
      <input
        ref={percentRef}
        type="text"
        name={`${prefix}Percent`}
        required
        value={percentText}
        onChange={(e) => setPercentText(e.target.value)}
        disabled={!selectedBand}
        placeholder={
          selectedBand
            ? `eg ${range![0]}% = ${RATING_BAND_SHORT_LABELS[selectedBand].split(" (")[0]}`
            : "Select a rating above first"
        }
        className="w-full rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {range && (
        <p className={`text-[11px] mt-1 mb-3 ${outOfRange ? "text-rose-600" : "text-text-muted"}`}>
          {outOfRange
            ? `Must be between ${range[0]}% and ${range[1]}% to match "${RATING_BAND_SHORT_LABELS[selectedBand!]}".`
            : `Enter a value between ${range[0]}% and ${range[1]}%.`}
        </p>
      )}
      {!range && <div className="mb-3" />}
      <p className="text-xs font-medium text-text-secondary mb-1">
        Remarks{" "}
        {remarkRequired ? (
          <span className="text-rose-500">*</span>
        ) : (
          <span className="text-text-muted font-normal">(optional)</span>
        )}
      </p>
      <textarea
        name={`${prefix}Remark`}
        required={remarkRequired}
        rows={2}
        className="w-full rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

export function PmeEvaluationForm({
  action,
  employee,
}: {
  action: (formData: FormData) => Promise<void>;
  employee: {
    staffName: string;
    staffNo: string;
    department: string;
    trainingTitle: string;
    periodStart: string;
    periodEnd: string;
  };
}) {
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await action(formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  return (
    <form action={handleSubmit} className="max-w-2xl">
      {error && (
        <p className="mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>
      )}

      <div className="rounded-2xl border border-border bg-surface p-4 mb-4">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">Employee Information</h3>
        <div className="space-y-3">
          <DisplayField label="Employee Name" value={employee.staffName} />
          <DisplayField label="Staff No" value={employee.staffNo} />
          <DisplayField label="Department" value={employee.department} />
          <DisplayField label="Training Title" value={employee.trainingTitle} />
          <div className="grid grid-cols-2 gap-3">
            <DisplayField label="Evaluation Period Start" value={employee.periodStart} />
            <DisplayField label="Evaluation Period End" value={employee.periodEnd} />
          </div>
          <p className="text-[11px] text-text-muted">
            The evaluation period is calculated automatically — 3 months starting the day after the training ends.
          </p>
        </div>
      </div>

      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Learning Level</h3>
      <RatingQuestion
        prefix="level"
        number={1}
        question="Evaluate employees Knowledge Sharing Sessions (KSS) and On-the-Job Training (OJT) conducted for their teams after attending training"
      />

      <div className="rounded-2xl border border-border bg-surface p-4 mb-4">
        <p className="text-xs font-medium text-text-secondary mb-2">
          Please confirm whether the On-the-Job Training (OJT) has been conducted.
        </p>
        <div className="flex gap-4 mb-3">
          <label className="flex items-center gap-1.5 text-xs text-text-secondary">
            <input type="radio" name="ojtConducted" value="yes" className="text-primary focus:ring-primary" />
            Yes
          </label>
          <label className="flex items-center gap-1.5 text-xs text-text-secondary">
            <input type="radio" name="ojtConducted" value="no" className="text-primary focus:ring-primary" />
            No
          </label>
        </div>
        <p className="text-[11px] text-text-secondary mb-1">
          If yes, please specify the date, time, and location of the training. If not, kindly provide the reason.
        </p>
        <textarea
          name="ojtDetails"
          rows={2}
          className="w-full rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Learning Level</h3>
      <RatingQuestion
        prefix="level2"
        number={2}
        question="Did the employee learn what he / she is are supposed to learn from the training attended ?"
      />

      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Behavioral Change</h3>
      <RatingQuestion
        prefix="behavioral"
        number={3}
        question="Did the employee apply his / her newly acquired skills and knowledge to his / her jobs ?"
      />

      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Result Training Attended</h3>
      <RatingQuestion
        prefix="result"
        number={4}
        question="Did the training has any measurable business impact ?"
      />

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
