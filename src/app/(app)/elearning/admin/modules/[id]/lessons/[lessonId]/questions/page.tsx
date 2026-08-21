import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, X } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageElearning } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { QUESTION_TYPE_LABELS } from "@/lib/labels";
import { QuestionForm } from "@/components/elearning/QuestionForm";
import { DeleteQuestionButton } from "@/components/elearning/DeleteQuestionButton";
import { addQuestion, deleteQuestion } from "@/app/(app)/elearning/admin/actions";

export default async function QuizQuestionsPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const session = await requireSession();
  if (!canManageElearning(session)) redirect("/elearning/learner");

  const { id, lessonId } = await params;
  const moduleId = Number(id);

  const lesson = await prisma.elearningLesson.findUnique({
    where: { id: Number(lessonId) },
    include: { questions: { include: { options: true }, orderBy: { order: "asc" } }, module: true },
  });

  if (!lesson || lesson.moduleId !== moduleId) notFound();

  return (
    <div>
      <Link
        href={`/elearning/admin/modules/${moduleId}`}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4"
      >
        <ArrowLeft size={15} /> Back to Module
      </Link>
      <h2 className="text-xl font-semibold text-text-primary mb-1">{lesson.title}</h2>
      <p className="text-sm text-text-muted mb-6">
        {lesson.module.title} · Pass {lesson.passPercent}% · {lesson.maxAttempts} attempt(s)
      </p>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
            Questions ({lesson.questions.length})
          </h3>
          {lesson.questions.length === 0 ? (
            <p className="text-sm text-text-muted mb-6">No questions yet. Add one using the form.</p>
          ) : (
            <ol className="space-y-3 mb-6">
              {lesson.questions.map((q, i) => (
                <li key={q.id} className="bg-surface rounded-2xl border border-border p-4 shadow-[var(--shadow-card)]">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm text-text-primary font-medium">
                      {i + 1}. {q.question}
                    </p>
                    <DeleteQuestionButton
                      id={q.id}
                      lessonId={lesson.id}
                      moduleId={moduleId}
                      onDelete={deleteQuestion}
                    />
                  </div>
                  <p className="text-xs text-text-muted mb-2">
                    {QUESTION_TYPE_LABELS[q.type]} · {q.marks} mark(s)
                  </p>
                  <ul className="space-y-1">
                    {q.options.map((o) => (
                      <li key={o.id} className="flex items-center gap-1.5 text-sm text-text-secondary">
                        {o.isCorrect ? (
                          <Check size={13} className="text-primary-dark" />
                        ) : (
                          <X size={13} className="text-gray-300" />
                        )}
                        {o.text}
                      </li>
                    ))}
                  </ul>
                  {q.explanation && <p className="text-xs text-text-muted mt-2 italic">{q.explanation}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Add Question</h3>
          <QuestionForm action={addQuestion.bind(null, lesson.id, moduleId)} />
        </div>
      </div>
    </div>
  );
}
