"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUp, ArrowDown, Pencil, Copy, Trash2, FileText, Video, HelpCircle } from "lucide-react";
import { LESSON_TYPE_LABELS } from "@/lib/labels";
import { reorderLesson, deleteLesson, duplicateLesson } from "@/app/(app)/elearning/admin/actions";
import { useConfirm } from "@/components/ui/ConfirmProvider";

interface LessonRow {
  id: number;
  type: "SLIDE" | "VIDEO" | "QUIZ";
  title: string;
  order: number;
  questionCount?: number;
}

const TYPE_ICON: Record<string, typeof FileText> = {
  SLIDE: FileText,
  VIDEO: Video,
  QUIZ: HelpCircle,
};

export function LessonOutline({ moduleId, lessons }: { moduleId: number; lessons: LessonRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  async function handleDelete(id: number, title: string) {
    if (!(await confirm(`Delete lesson "${title}"? This cannot be undone.`))) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteLesson(id, moduleId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div>
      {error && (
        <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
      )}
      {lessons.length === 0 ? (
        <p className="text-sm text-text-muted py-6 text-center">No lessons yet. Add a slide, video, or quiz below.</p>
      ) : (
        <ol className="space-y-2">
          {lessons.map((l, i) => {
            const Icon = TYPE_ICON[l.type];
            return (
              <li
                key={l.id}
                className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 bg-surface"
              >
                <span className="text-xs text-text-muted w-5 text-right">{i + 1}.</span>
                <Icon size={16} className="text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{l.title}</p>
                  <p className="text-xs text-text-muted">
                    {LESSON_TYPE_LABELS[l.type]}
                    {l.type === "QUIZ" ? ` · ${l.questionCount ?? 0} question(s)` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    disabled={pending || i === 0}
                    onClick={() => startTransition(() => reorderLesson(l.id, moduleId, "up"))}
                    className="p-1.5 text-text-muted hover:text-primary-dark disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    disabled={pending || i === lessons.length - 1}
                    onClick={() => startTransition(() => reorderLesson(l.id, moduleId, "down"))}
                    className="p-1.5 text-text-muted hover:text-primary-dark disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown size={14} />
                  </button>
                  {l.type === "QUIZ" ? (
                    <Link
                      href={`/elearning/admin/modules/${moduleId}/lessons/${l.id}/questions`}
                      className="p-1.5 text-text-muted hover:text-primary-dark"
                      title="Edit questions"
                    >
                      <Pencil size={14} />
                    </Link>
                  ) : (
                    <Link
                      href={`/elearning/admin/modules/${moduleId}/lessons/${l.id}/edit`}
                      className="p-1.5 text-text-muted hover:text-primary-dark"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </Link>
                  )}
                  <button
                    disabled={pending}
                    onClick={() => startTransition(() => duplicateLesson(l.id, moduleId))}
                    className="p-1.5 text-text-muted hover:text-primary-dark"
                    title="Duplicate"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => handleDelete(l.id, l.title)}
                    className="p-1.5 text-text-muted hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
