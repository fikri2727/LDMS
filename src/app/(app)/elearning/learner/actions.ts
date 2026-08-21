"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";
import { maybeCompleteModule } from "@/lib/elearning";

export async function markLessonComplete(lessonId: number, moduleId: number) {
  const session = await requireSession();

  await prisma.elearningLessonProgress.upsert({
    where: { lessonId_userId: { lessonId, userId: session.userId } },
    update: { completed: true, completedAt: new Date() },
    create: { lessonId, userId: session.userId, completed: true, completedAt: new Date() },
  });

  await maybeCompleteModule(moduleId, session.userId);

  revalidatePath(`/elearning/learner/modules/${moduleId}`);
  revalidatePath("/elearning/learner");
}

export async function submitQuiz(lessonId: number, moduleId: number, formData: FormData) {
  const session = await requireSession();

  const lesson = await prisma.elearningLesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: { questions: { include: { options: true } } },
  });

  const previousAttempts = await prisma.elearningQuizAttempt.count({
    where: { lessonId, userId: session.userId },
  });

  if (lesson.maxAttempts && previousAttempts >= lesson.maxAttempts) {
    throw new Error("You have used all your attempts for this quiz.");
  }

  let earned = 0;
  let total = 0;
  const answerLog: Record<number, number[]> = {};

  for (const q of lesson.questions) {
    total += q.marks;
    const selected = formData.getAll(`q_${q.id}`).map((v) => Number(v));
    answerLog[q.id] = selected;

    const correctIds = new Set(q.options.filter((o) => o.isCorrect).map((o) => o.id));
    const selectedSet = new Set(selected);

    const isCorrect =
      correctIds.size === selectedSet.size && [...correctIds].every((id) => selectedSet.has(id));

    if (isCorrect) earned += q.marks;
  }

  const score = total > 0 ? Math.round((earned / total) * 10000) / 100 : 0;
  const passed = score >= (lesson.passPercent ?? 80);

  await prisma.elearningQuizAttempt.create({
    data: {
      lessonId,
      userId: session.userId,
      attemptNo: previousAttempts + 1,
      score,
      passed,
      answers: JSON.stringify(answerLog),
    },
  });

  if (passed) {
    await maybeCompleteModule(moduleId, session.userId);
  }

  revalidatePath(`/elearning/learner/modules/${moduleId}`);
  revalidatePath("/elearning/learner");

  return { score, passed };
}
