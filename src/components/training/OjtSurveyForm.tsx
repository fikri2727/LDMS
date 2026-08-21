"use client";

import { useFormStatus } from "react-dom";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RatingField } from "@/components/training/OjtRatingField";

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
        if (await confirm("Submit this evaluation? You won't be able to change your answers afterwards.")) {
          form?.requestSubmit();
        }
      }}
      className="rounded-xl bg-primary-dark hover:bg-primary disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors"
    >
      {pending ? "Submitting..." : "Submit Evaluation"}
    </button>
  );
}

export function OjtSurveyForm({ action }: { action: (formData: FormData) => void }) {
  return (
    <form action={action} className="max-w-2xl space-y-5">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          What have you learned from this OJT?
        </label>
        <textarea
          name="q1"
          rows={3}
          required
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <RatingField name="q2" label="Self-rated skill level BEFORE this OJT" />
      <RatingField name="q3" label="Self-rated skill level AFTER this OJT" />
      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
