import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { QuizForm } from "@/components/elearning/QuizForm";
import { submitQuiz } from "@/app/(app)/elearning/learner/actions";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const session = await requireSession();
  const { id, lessonId } = await params;
  const moduleId = Number(id);

  const lesson = await prisma.elearningLesson.findUnique({
    where: { id: Number(lessonId) },
    include: { questions: { include: { options: true }, orderBy: { order: "asc" } } },
  });

  if (!lesson || lesson.moduleId !== moduleId || lesson.type !== "QUIZ") notFound();

  const attempts = await prisma.elearningQuizAttempt.findMany({
    where: { lessonId: lesson.id, userId: session.userId },
    orderBy: { attemptNo: "desc" },
  });

  const passed = attempts.some((a) => a.passed);
  const bestAttempt = attempts[0];
  const attemptsUsed = attempts.length;
  const canRetry = !passed && (lesson.maxAttempts == null || attemptsUsed < lesson.maxAttempts);

  const lessons = await prisma.elearningLesson.findMany({ where: { moduleId }, orderBy: { order: "asc" } });
  const index = lessons.findIndex((l) => l.id === lesson.id);
  const next = index < lessons.length - 1 ? lessons[index + 1] : null;
  const nextHref = next
    ? next.type === "QUIZ"
      ? `/elearning/learner/modules/${moduleId}/lessons/${next.id}/quiz`
      : `/elearning/learner/modules/${moduleId}/lessons/${next.id}`
    : null;

  const showReview = passed || (attemptsUsed > 0 && !canRetry);

  if (showReview) {
    const answers: Record<string, number[]> = JSON.parse(bestAttempt.answers || "{}");
    return (
      <div className="bg-surface rounded-2xl border border-border p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-1">{lesson.title}</h3>
        <p className="text-sm text-text-secondary mb-4">
          Score: <span className="font-semibold text-text-primary">{bestAttempt.score}%</span> — Result:{" "}
          <span className={passed ? "text-primary-dark font-semibold" : "text-red-600 font-semibold"}>
            {passed ? "PASSED" : "NOT PASSED"}
          </span>
        </p>

        {lesson.showCorrectAnswers && (
          <div className="space-y-4 mb-6">
            {lesson.questions.map((q, i) => {
              const selected = new Set(answers[String(q.id)] ?? []);
              return (
                <div key={q.id} className="border-t border-border pt-4 first:border-0 first:pt-0">
                  <p className="text-sm text-text-primary mb-2">
                    {i + 1}. {q.question}
                  </p>
                  <ul className="space-y-1">
                    {q.options.map((o) => (
                      <li
                        key={o.id}
                        className={`flex items-center gap-1.5 text-sm ${
                          o.isCorrect ? "text-primary-dark" : selected.has(o.id) ? "text-red-600" : "text-text-muted"
                        }`}
                      >
                        {o.isCorrect ? <Check size={13} /> : selected.has(o.id) ? <X size={13} /> : <span className="w-[13px]" />}
                        {o.text}
                        {selected.has(o.id) && !o.isCorrect && <span className="text-xs italic">(your answer)</span>}
                      </li>
                    ))}
                  </ul>
                  {lesson.showExplanation && q.explanation && (
                    <p className="text-xs text-text-muted mt-1.5 italic">{q.explanation}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-border">
          {!passed && !canRetry && (
            <p className="text-sm text-text-secondary">You have used all {lesson.maxAttempts} attempt(s) for this quiz.</p>
          )}
          {passed &&
            (nextHref ? (
              <Link
                href={nextHref}
                className="rounded-xl bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-dark"
              >
                Next
              </Link>
            ) : (
              <Link
                href="/elearning/learner"
                className="rounded-xl bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-dark"
              >
                Finish — Back to My Learning
              </Link>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl border border-border p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-1">{lesson.title}</h3>
      <p className="text-sm text-text-secondary mb-6">
        Pass mark: {lesson.passPercent}% · {lesson.questions.length} question(s)
        {attemptsUsed > 0 && (
          <>
            {" "}
            · Attempt {attemptsUsed + 1} of {lesson.maxAttempts ?? "∞"} — previous score {bestAttempt.score}% (Not
            Passed)
          </>
        )}
      </p>
      <QuizForm
        questions={lesson.questions.map((q) => ({
          id: q.id,
          type: q.type,
          question: q.question,
          marks: q.marks,
          options: q.options.map((o) => ({ id: o.id, text: o.text })),
        }))}
        action={submitQuiz.bind(null, lesson.id, moduleId)}
      />
    </div>
  );
}
