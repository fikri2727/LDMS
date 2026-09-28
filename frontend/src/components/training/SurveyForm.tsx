"use client";

import { useFormStatus } from "react-dom";
import { useConfirm } from "@/components/ui/ConfirmProvider";

const RATING_QUESTIONS: { name: string; en: string; bm: string }[] = [
  {
    name: "courseRelevance",
    en: "Course Relevance and Usefulness",
    bm: "Kursus Berkaitan & Berguna",
  },
  {
    name: "practicalExercises",
    en: "Practical, Discussion & Exercises",
    bm: "Amali, Perbincangan & Latihan",
  },
  {
    name: "sufficientTime",
    en: "Sufficient Time Spent on Course Topic",
    bm: "Masa yang mencukupi untuk kursus",
  },
  {
    name: "trainerEffectiveness",
    en: "Overall Effectiveness of Course Trainer",
    bm: "Keberkesanan Keseluruhan Jurulatih",
  },
  {
    name: "courseEffectiveness",
    en: "Overall Effectiveness of Course",
    bm: "Keberkesanan Keseluruhan Kursus",
  },
];

function RatingField({ name, en, bm }: { name: string; en: string; bm: string }) {
  return (
    <fieldset className="py-5 border-b border-border last:border-0">
      <legend className="text-base text-text-primary">
        <span className="uppercase tracking-wide">{en}</span>{" "}
        <span className="italic text-text-secondary">/ ({bm})</span> : <span className="text-rose-500">*</span>
      </legend>
      <p className="italic text-sm text-text-secondary mt-1 mb-3">
        1: Poor, 2: Fair, 3: Good, 4: Very Good, 5: Excellent
      </p>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer">
            <input type="radio" name={name} value={n} required className="peer sr-only" />
            <span className="flex items-center justify-center rounded-xl border border-border bg-surface py-3 text-sm text-text-secondary shadow-[var(--shadow-card)] transition-colors peer-checked:bg-primary-dark peer-checked:text-white peer-checked:border-primary-dark hover:bg-gray-50 peer-checked:hover:bg-primary">
              {n}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
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

export function SurveyForm({ action }: { action: (formData: FormData) => void }) {
  return (
    <form action={action} className="max-w-2xl">
      <div>
        {RATING_QUESTIONS.map((q) => (
          <RatingField key={q.name} name={q.name} en={q.en} bm={q.bm} />
        ))}
      </div>

      <div className="py-5">
        <p className="text-base text-text-primary">
          Identify What You Have Learnt From The Course : <span className="text-rose-500">*</span>
        </p>
        <p className="italic text-sm text-text-secondary mt-1 mb-3">
          Kenalpasti perkara yang telah anda pelajari dalam kursus ini :
        </p>
        <input
          type="text"
          name="whatLearnt"
          required
          placeholder="Enter your answer"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="py-5">
        <p className="text-base text-text-primary">
          Explain Your Personal Actions Plans On How To Apply What You Have Learnt On The Job{" "}
          <span className="text-rose-500">*</span>
        </p>
        <p className="italic text-sm text-text-secondary mt-1 mb-3">
          Terangkan bagaimana anda akan mengaplikasikan perkara yang telah anda pelajari dalam tugas anda.
        </p>
        <input
          type="text"
          name="actionPlan"
          required
          placeholder="Enter your answer"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="py-5">
        <p className="text-base text-text-primary">
          Comment &amp; Suggestions (if any) <span className="text-rose-500">*</span>
        </p>
        <p className="italic text-sm text-text-secondary mt-1 mb-3">Komen dan cadangan (jika ada)</p>
        <input
          type="text"
          name="commentSuggestions"
          required
          placeholder="Enter your answer"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
