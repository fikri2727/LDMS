import { prisma } from "@/lib/prisma";

export function generateCertificateNo(id: number, date = new Date()) {
  return `CERT-${date.getFullYear()}-${String(id).padStart(5, "0")}`;
}

/**
 * If every lesson in the module is complete for this user (video/slide lessons
 * marked complete, quiz lessons passed), create the ElearningCompletion and
 * issue a certificate. No-ops if already completed or not yet eligible.
 */
export async function maybeCompleteModule(moduleId: number, userId: number) {
  const existing = await prisma.elearningCompletion.findUnique({
    where: { moduleId_userId: { moduleId, userId } },
  });
  if (existing) return;

  const lessons = await prisma.elearningLesson.findMany({ where: { moduleId } });
  if (lessons.length === 0) return;

  const [progress, quizAttempts] = await Promise.all([
    prisma.elearningLessonProgress.findMany({
      where: { userId, lessonId: { in: lessons.map((l) => l.id) } },
    }),
    prisma.elearningQuizAttempt.findMany({
      where: { userId, lessonId: { in: lessons.map((l) => l.id) } },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  const progressByLesson = new Map(progress.map((p) => [p.lessonId, p]));
  const bestAttemptByLesson = new Map<number, (typeof quizAttempts)[number]>();
  for (const a of quizAttempts) {
    if (!bestAttemptByLesson.has(a.lessonId)) bestAttemptByLesson.set(a.lessonId, a);
  }

  let allDone = true;
  const quizScores: number[] = [];
  for (const lesson of lessons) {
    if (lesson.type === "QUIZ") {
      const attempt = bestAttemptByLesson.get(lesson.id);
      const passed = quizAttempts.some((a) => a.lessonId === lesson.id && a.passed);
      if (!passed) {
        allDone = false;
        break;
      }
      if (attempt) quizScores.push(attempt.score);
    } else {
      const p = progressByLesson.get(lesson.id);
      if (!p?.completed) {
        allDone = false;
        break;
      }
    }
  }

  if (!allDone) return;

  const finalScore = quizScores.length
    ? Math.round((quizScores.reduce((a, b) => a + b, 0) / quizScores.length) * 100) / 100
    : 100;

  const completion = await prisma.elearningCompletion.create({
    data: { moduleId, userId, finalScore },
  });

  await prisma.elearningCertificate.create({
    data: {
      certificateNo: generateCertificateNo(completion.id),
      completionId: completion.id,
      moduleId,
      userId,
      score: finalScore,
    },
  });
}

const AVG_READING_WPM = 200;
const DEFAULT_VIDEO_MINUTES = 10; // video length isn't tracked, so this is a flat per-video estimate
const DEFAULT_QUIZ_MINUTES_PER_QUESTION = 1;
const MIN_QUIZ_MINUTES = 5;

/** Auto-estimated minutes for a single lesson — no manual duration entry required. */
export function estimateLessonMinutes(lesson: {
  type: "SLIDE" | "VIDEO" | "QUIZ";
  slideContent?: string | null;
  timeLimitMinutes?: number | null;
  questionCount?: number;
}): number {
  if (lesson.type === "SLIDE") {
    const words = (lesson.slideContent ?? "").trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / AVG_READING_WPM));
  }
  if (lesson.type === "VIDEO") {
    return DEFAULT_VIDEO_MINUTES;
  }
  // QUIZ
  if (lesson.timeLimitMinutes) return lesson.timeLimitMinutes;
  return Math.max(MIN_QUIZ_MINUTES, (lesson.questionCount ?? 0) * DEFAULT_QUIZ_MINUTES_PER_QUESTION);
}

/** Auto-calculated total training hours for a module, summed from all its lessons. */
export async function getModuleEstimatedHours(moduleId: number): Promise<number> {
  const lessons = await prisma.elearningLesson.findMany({
    where: { moduleId },
    include: { questions: { select: { id: true } } },
  });
  const totalMinutes = lessons.reduce(
    (sum, l) =>
      sum +
      estimateLessonMinutes({
        type: l.type,
        slideContent: l.slideContent,
        timeLimitMinutes: l.timeLimitMinutes,
        questionCount: l.questions.length,
      }),
    0
  );
  return Math.round((totalMinutes / 60) * 100) / 100;
}

export interface ModuleProgressSummary {
  totalLessons: number;
  completedLessons: number;
  percent: number;
}

export async function getModuleProgress(moduleId: number, userId: number): Promise<ModuleProgressSummary> {
  const lessons = await prisma.elearningLesson.findMany({ where: { moduleId }, select: { id: true, type: true } });
  if (lessons.length === 0) return { totalLessons: 0, completedLessons: 0, percent: 0 };

  const [progress, passedQuizLessonIds] = await Promise.all([
    prisma.elearningLessonProgress.findMany({
      where: { userId, lessonId: { in: lessons.map((l) => l.id) }, completed: true },
      select: { lessonId: true },
    }),
    prisma.elearningQuizAttempt.findMany({
      where: { userId, lessonId: { in: lessons.map((l) => l.id) }, passed: true },
      select: { lessonId: true },
      distinct: ["lessonId"],
    }),
  ]);

  const completedIds = new Set([
    ...progress.map((p) => p.lessonId),
    ...passedQuizLessonIds.map((p) => p.lessonId),
  ]);

  const completedLessons = lessons.filter((l) => completedIds.has(l.id)).length;
  return {
    totalLessons: lessons.length,
    completedLessons,
    percent: Math.round((completedLessons / lessons.length) * 100),
  };
}
