"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { QUESTION_TYPE_LABELS } from "@/lib/labels";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-primary-dark hover:bg-primary disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors"
    >
      {pending ? "Adding..." : "Add Question"}
    </button>
  );
}

const OPTION_SLOTS = 4;

export function QuestionForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [type, setType] = useState<"SINGLE_CHOICE" | "TRUE_FALSE" | "MULTIPLE_ANSWER">("SINGLE_CHOICE");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          try {
            await action(fd);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong.");
          }
        })
      }
      className="space-y-4 bg-surface rounded-2xl border border-border p-5"
    >
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Question Type</label>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {Object.entries(QUESTION_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Marks</label>
          <input
            type="number"
            name="marks"
            defaultValue={1}
            min={1}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Question</label>
        <textarea
          name="question"
          required
          rows={2}
          placeholder='e.g. "What is the primary purpose of a safety harness?"'
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {type === "TRUE_FALSE" ? (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Correct Answer</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-sm text-text-secondary">
              <input type="radio" name="trueFalseAnswer" value="true" defaultChecked /> True
            </label>
            <label className="flex items-center gap-1.5 text-sm text-text-secondary">
              <input type="radio" name="trueFalseAnswer" value="false" /> False
            </label>
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Answer Options — check the correct {type === "MULTIPLE_ANSWER" ? "answers" : "answer"}
          </label>
          <div className="space-y-2">
            {Array.from({ length: OPTION_SLOTS }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type={type === "MULTIPLE_ANSWER" ? "checkbox" : "radio"}
                  name="correctOption"
                  value={i}
                  className="text-primary focus:ring-primary"
                />
                <input
                  name="optionText"
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  className="flex-1 rounded-xl border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Explanation (optional)</label>
        <textarea
          name="explanation"
          rows={2}
          placeholder="Shown to learners after they answer, if enabled in quiz settings."
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
