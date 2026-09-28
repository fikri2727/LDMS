"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ui/ConfirmProvider";

interface OptionView {
  id: number;
  text: string;
}

interface QuestionView {
  id: number;
  type: "SINGLE_CHOICE" | "TRUE_FALSE" | "MULTIPLE_ANSWER";
  question: string;
  marks: number;
  options: OptionView[];
}

export function QuizForm({
  questions,
  action,
}: {
  questions: QuestionView[];
  action: (formData: FormData) => Promise<{ score: number; passed: boolean }>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await action(formData);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {questions.map((q, i) => (
        <fieldset key={q.id} className="pb-5 border-b border-border last:border-0">
          <legend className="text-sm text-text-secondary mb-1">
            Question {i + 1} of {questions.length}
          </legend>
          <p className="text-base text-text-primary mb-3">{q.question}</p>
          <div className="space-y-2">
            {q.options.map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input
                  type={q.type === "MULTIPLE_ANSWER" ? "checkbox" : "radio"}
                  name={`q_${q.id}`}
                  value={o.id}
                  className="text-primary focus:ring-primary"
                />
                {o.text}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <button
        type="submit"
        disabled={pending}
        onClick={async (e) => {
          e.preventDefault();
          const form = e.currentTarget.form;
          if (await confirm("Submit your answers? You won't be able to change them for this attempt.")) {
            form?.requestSubmit();
          }
        }}
        className="rounded-xl bg-primary hover:bg-primary-dark disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 transition-colors"
      >
        {pending ? "Submitting..." : "Submit Answers"}
      </button>
    </form>
  );
}
