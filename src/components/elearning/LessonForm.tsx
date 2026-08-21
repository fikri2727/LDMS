"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useConfirm } from "@/components/ui/ConfirmProvider";

interface LessonInitial {
  title?: string;
  slideContent?: string | null;
  slideFileName?: string | null;
  videoUrl?: string | null;
  videoDescription?: string | null;
  videoFileName?: string | null;
  passPercent?: number | null;
  maxAttempts?: number | null;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  showCorrectAnswers?: boolean;
  showExplanation?: boolean;
  timeLimitMinutes?: number | null;
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
        if (await confirm(`${label}?`)) form?.requestSubmit();
      }}
      className="rounded-xl bg-primary-dark hover:bg-primary disabled:opacity-60 text-white text-sm font-medium px-4 py-2 transition-colors"
    >
      {pending ? "Saving..." : label}
    </button>
  );
}

export function LessonForm({
  action,
  type,
  initial,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  type: "SLIDE" | "VIDEO" | "QUIZ";
  initial?: LessonInitial;
  submitLabel: string;
}) {
  const [preview, setPreview] = useState(false);
  const [slideContent, setSlideContent] = useState(initial?.slideContent ?? "");

  return (
    <form action={action} className="space-y-6 max-w-2xl">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Lesson Title</label>
        <input
          name="title"
          defaultValue={initial?.title}
          required
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {type === "SLIDE" && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-text-secondary">Slide Content</label>
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              className="text-xs text-primary hover:text-primary-dark"
            >
              {preview ? "Edit" : "Preview"}
            </button>
          </div>
          {preview ? (
            <div className="w-full rounded-xl border border-border px-4 py-3 min-h-[160px] bg-gray-50 text-sm text-text-primary whitespace-pre-wrap">
              {slideContent || <span className="text-text-muted">Nothing to preview yet.</span>}
            </div>
          ) : (
            <textarea
              name="slideContent"
              value={slideContent}
              onChange={(e) => setSlideContent(e.target.value)}
              rows={10}
              placeholder={"Learning Objectives\n\n- Identify common working-at-height hazards.\n- Understand fall protection requirements.\n- Apply safe working procedures."}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
          <p className="text-xs text-text-muted mt-1">
            Plain text — start a line with &quot;- &quot; for a bullet point, or &quot;# &quot; for a heading.
          </p>

          <div className="mt-4">
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Attach Image, PDF, or PowerPoint (optional)
            </label>
            {initial?.slideFileName && (
              <div className="flex items-center gap-2 mb-2 text-sm text-text-secondary">
                <span>Current file: {initial.slideFileName}</span>
                <label className="flex items-center gap-1 text-xs text-red-600">
                  <input type="checkbox" name="removeSlideFile" /> Remove
                </label>
              </div>
            )}
            <input
              type="file"
              name="slideFile"
              accept="image/*,application/pdf,.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              className="w-full text-sm text-text-secondary file:mr-3 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary-dark file:px-3 file:py-1.5 file:text-sm"
            />
            <p className="text-xs text-text-muted mt-1">Shown to learners below the text content.</p>
          </div>
        </div>
      )}

      {type === "VIDEO" && (
        <>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Video URL</label>
            <input
              name="videoUrl"
              defaultValue={initial?.videoUrl ?? ""}
              placeholder="YouTube, Vimeo, or direct .mp4 link"
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-text-muted mt-1">Optional if you upload a video file below.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Upload Video File (optional)</label>
            {initial?.videoFileName && (
              <div className="flex items-center gap-2 mb-2 text-sm text-text-secondary">
                <span>Current file: {initial.videoFileName}</span>
                <label className="flex items-center gap-1 text-xs text-red-600">
                  <input type="checkbox" name="removeVideoFile" /> Remove
                </label>
              </div>
            )}
            <input
              type="file"
              name="videoFile"
              accept="video/*"
              className="w-full text-sm text-text-secondary file:mr-3 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary-dark file:px-3 file:py-1.5 file:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Video Description</label>
            <textarea
              name="videoDescription"
              defaultValue={initial?.videoDescription ?? ""}
              rows={3}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </>
      )}

      {type === "QUIZ" && (
        <div className="space-y-4 rounded-2xl border border-border p-4">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Quiz Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Pass Percentage</label>
              <input
                type="number"
                name="passPercent"
                defaultValue={initial?.passPercent ?? 80}
                min={0}
                max={100}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Max Attempts</label>
              <input
                type="number"
                name="maxAttempts"
                defaultValue={initial?.maxAttempts ?? 3}
                min={1}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Time Limit (minutes, optional)</label>
              <input
                type="number"
                name="timeLimitMinutes"
                defaultValue={initial?.timeLimitMinutes ?? ""}
                min={1}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" name="randomizeQuestions" defaultChecked={initial?.randomizeQuestions} />
              Randomise question order
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" name="randomizeOptions" defaultChecked={initial?.randomizeOptions} />
              Randomise answer options
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                name="showCorrectAnswers"
                defaultChecked={initial?.showCorrectAnswers ?? true}
              />
              Show correct answers after submission
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" name="showExplanation" defaultChecked={initial?.showExplanation ?? true} />
              Show explanation after answer
            </label>
          </div>
        </div>
      )}

      <SubmitButton label={submitLabel} />
    </form>
  );
}
