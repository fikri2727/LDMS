"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { markLessonComplete } from "@/app/(app)/elearning/learner/actions";

export function LessonNav({
  lessonId,
  moduleId,
  completed,
  prevHref,
  nextHref,
  disabled = false,
  disabledReason,
}: {
  lessonId: number;
  moduleId: number;
  completed: boolean;
  prevHref: string | null;
  nextHref: string | null;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isLastLesson = !nextHref;

  function handleComplete() {
    setError(null);
    startTransition(async () => {
      try {
        await markLessonComplete(lessonId, moduleId);
        if (nextHref) {
          router.push(nextHref);
        } else {
          router.push("/elearning/learner");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        {prevHref ? (
          <Link href={prevHref} className="rounded-xl border border-border text-sm font-medium px-4 py-2 text-text-secondary hover:bg-gray-50">
            Previous
          </Link>
        ) : (
          <span />
        )}
        <div className="flex flex-col items-end gap-1">
          {!completed && (
            <>
              <button
                disabled={pending || disabled}
                onClick={handleComplete}
                title={disabled ? disabledReason : undefined}
                className="rounded-xl bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pending ? "Saving..." : isLastLesson ? "Finish" : "Mark as Complete"}
              </button>
              {disabled && disabledReason && <p className="text-xs text-text-muted">{disabledReason}</p>}
            </>
          )}
          {completed &&
            (nextHref ? (
              <Link href={nextHref} className="rounded-xl border border-border text-sm font-medium px-4 py-2 text-text-secondary hover:bg-gray-50">
                Next
              </Link>
            ) : (
              <Link href="/elearning/learner" className="rounded-xl bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-dark">
                Back to My Learning
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
