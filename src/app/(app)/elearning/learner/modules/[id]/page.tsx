import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

export default async function ModulePlayerIndexPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const moduleId = Number(id);

  const lessons = await prisma.elearningLesson.findMany({
    where: { moduleId },
    orderBy: { order: "asc" },
  });

  if (lessons.length === 0) notFound();

  const [progressRows, passedQuizzes] = await Promise.all([
    prisma.elearningLessonProgress.findMany({
      where: { userId: session.userId, lessonId: { in: lessons.map((l) => l.id) }, completed: true },
      select: { lessonId: true },
    }),
    prisma.elearningQuizAttempt.findMany({
      where: { userId: session.userId, lessonId: { in: lessons.map((l) => l.id) }, passed: true },
      select: { lessonId: true },
      distinct: ["lessonId"],
    }),
  ]);

  const doneIds = new Set([...progressRows.map((p) => p.lessonId), ...passedQuizzes.map((p) => p.lessonId)]);
  const nextLesson = lessons.find((l) => !doneIds.has(l.id)) ?? lessons[0];

  redirect(
    nextLesson.type === "QUIZ"
      ? `/elearning/learner/modules/${moduleId}/lessons/${nextLesson.id}/quiz`
      : `/elearning/learner/modules/${moduleId}/lessons/${nextLesson.id}`
  );
}
