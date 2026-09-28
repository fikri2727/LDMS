"use client";

import { useActionState, useState } from "react";
import { verifyOjtCheckin, submitPublicOjtSurvey, type OjtCheckinState } from "@/app/checkin/ojt/actions";
import { OjtSurveyForm } from "@/components/training/OjtSurveyForm";

const initialState: OjtCheckinState = {};

export function OjtCheckinFlow({ ojtId, ojtTitle }: { ojtId: number; ojtTitle: string }) {
  const boundVerify = verifyOjtCheckin.bind(null, ojtId);
  const [state, formAction, pending] = useActionState(boundVerify, initialState);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSurveySubmit(formData: FormData) {
    setSubmitError(null);
    try {
      await submitPublicOjtSurvey(ojtId, state.staffNo!, formData);
      setDone(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
  }

  if (done) {
    return (
      <div className="text-center py-6">
        <h2 className="text-lg font-semibold text-text-primary mb-2">Thank you!</h2>
        <p className="text-sm text-text-secondary">Your evaluation has been submitted.</p>
      </div>
    );
  }

  if (state.alreadyCompleted) {
    return (
      <div className="text-center py-6">
        <h2 className="text-lg font-semibold text-text-primary mb-2">Already submitted</h2>
        <p className="text-sm text-text-secondary">
          You&apos;ve already submitted your evaluation for this OJT. Thank you.
        </p>
      </div>
    );
  }

  if (state.verified && state.staffNo) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-1">{ojtTitle}</h2>
        <p className="text-sm text-text-secondary mb-6">Welcome, {state.staffName}. Please complete your evaluation.</p>
        {submitError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{submitError}</p>
        )}
        <OjtSurveyForm action={handleSurveySubmit} />
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-1">{ojtTitle}</h2>
        <p className="text-sm text-text-secondary mb-4">Enter your Staff ID to fill your OJT evaluation.</p>
        <label htmlFor="staffId" className="block text-xs font-semibold tracking-wide text-gray-400 uppercase mb-1.5">
          Staff ID
        </label>
        <input
          id="staffId"
          name="staffId"
          autoComplete="off"
          required
          autoFocus
          placeholder="e.g. T1234"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-primary-dark hover:bg-primary disabled:opacity-60 text-white text-sm font-semibold py-2.5 transition-colors"
      >
        {pending ? "Checking..." : "Continue"}
      </button>
    </form>
  );
}
