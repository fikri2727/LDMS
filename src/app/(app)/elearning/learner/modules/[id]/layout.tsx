import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Video, HelpCircle, CheckCircle2, Circle } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageElearning } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getModuleProgress } from "@/lib/elearning";

const TYPE_ICON = { SLIDE: FileText, VIDEO: Video, QUIZ: HelpCircle };

export default async function ModulePlayerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const moduleId = Number(id);

  const module_ = await prisma.elearningModule.findUnique({
    where: { id: moduleId },
    include: { lessons: { orderBy: { order: "asc" } } },
  });

  if (!module_) notFound();
  if (module_.status !== "PUBLISHED" && !canManageElearning(session)) notFound();

  const [progressRows, passedQuizzes, completion] = await Promise.all([
    prisma.elearningLessonProgress.findMany({
      where: { userId: session.userId, lessonId: { in: module_.lessons.map((l) => l.id) }, completed: true },
      select: { lessonId: true },
    }),
    prisma.elearningQuizAttempt.findMany({
      where: { userId: session.userId, lessonId: { in: module_.lessons.map((l) => l.id) }, passed: true },
      select: { lessonId: true },
      distinct: ["lessonId"],
    }),
    prisma.elearningCompletion.findUnique({ where: { moduleId_userId: { moduleId, userId: session.userId } } }),
  ]);

  const doneIds = new Set([...progressRows.map((p) => p.lessonId), ...passedQuizzes.map((p) => p.lessonId)]);
  const progress = await getModuleProgress(moduleId, session.userId);

  return (
    <div>
      <Link
        href="/elearning/learner"
        className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-4"
      >
        <ArrowLeft size={15} /> Back to My Learning
      </Link>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-text-primary mb-2">{module_.title}</h2>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden max-w-md">
            <div className="h-full bg-primary" style={{ width: `${completion ? 100 : progress.percent}%` }} />
          </div>
          <span className="text-sm text-text-secondary">
            {completion ? progress.totalLessons : progress.completedLessons} / {progress.totalLessons} lessons ·{" "}
            {completion ? 100 : progress.percent}% Complete
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-surface rounded-2xl border border-border p-3 h-fit">
          <ol className="space-y-1">
            {module_.lessons.map((l, i) => {
              const Icon = TYPE_ICON[l.type];
              const done = doneIds.has(l.id);
              const href =
                l.type === "QUIZ"
                  ? `/elearning/learner/modules/${moduleId}/lessons/${l.id}/quiz`
                  : `/elearning/learner/modules/${moduleId}/lessons/${l.id}`;
              return (
                <li key={l.id}>
                  <Link
                    href={href}
                    className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm hover:bg-gray-50"
                  >
                    {done ? (
                      <CheckCircle2 size={16} className="text-primary-dark shrink-0" />
                    ) : (
                      <Circle size={16} className="text-text-muted shrink-0" />
                    )}
                    <Icon size={14} className="text-text-muted shrink-0" />
                    <span className={`truncate ${done ? "text-text-secondary" : "text-text-primary"}`}>
                      {i + 1}. {l.title}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="col-span-3">{children}</div>
      </div>
    </div>
  );
}
