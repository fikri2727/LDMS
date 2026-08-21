import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { SlideLessonPlayer } from "@/components/elearning/SlideLessonPlayer";
import { VideoLessonPlayer } from "@/components/elearning/VideoLessonPlayer";
import { LessonNav } from "@/components/elearning/LessonNav";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const session = await requireSession();
  const { id, lessonId } = await params;
  const moduleId = Number(id);

  const lessons = await prisma.elearningLesson.findMany({
    where: { moduleId },
    orderBy: { order: "asc" },
  });

  const index = lessons.findIndex((l) => l.id === Number(lessonId));
  if (index === -1) notFound();

  const lesson = lessons[index];
  if (lesson.type === "QUIZ") {
    redirect(`/elearning/learner/modules/${moduleId}/lessons/${lesson.id}/quiz`);
  }

  const progress = await prisma.elearningLessonProgress.findUnique({
    where: { lessonId_userId: { lessonId: lesson.id, userId: session.userId } },
  });

  const prev = index > 0 ? lessons[index - 1] : null;
  const next = index < lessons.length - 1 ? lessons[index + 1] : null;

  function hrefFor(l: (typeof lessons)[number]) {
    return l.type === "QUIZ"
      ? `/elearning/learner/modules/${moduleId}/lessons/${l.id}/quiz`
      : `/elearning/learner/modules/${moduleId}/lessons/${l.id}`;
  }

  const prevHref = prev ? hrefFor(prev) : null;
  const nextHref = next ? hrefFor(next) : null;
  const completed = progress?.completed ?? false;
  const isSlideWithContent = lesson.type === "SLIDE" && !!(lesson.slideContent || lesson.slideFilePath);
  const isVideoWithContent = lesson.type === "VIDEO" && !!(lesson.videoUrl || lesson.videoFilePath);

  return (
    <div className="bg-surface rounded-2xl border border-border p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">{lesson.title}</h3>

      {isSlideWithContent ? (
        <SlideLessonPlayer
          content={lesson.slideContent}
          fileUrl={lesson.slideFilePath ? `/api/elearning/lesson-files/${lesson.id}?kind=slide` : null}
          fileType={lesson.slideFileType}
          fileName={lesson.slideFileName}
          lessonId={lesson.id}
          moduleId={moduleId}
          completed={completed}
          prevHref={prevHref}
          nextHref={nextHref}
        />
      ) : isVideoWithContent ? (
        <VideoLessonPlayer
          url={lesson.videoUrl ?? ""}
          fileUrl={lesson.videoFilePath ? `/api/elearning/lesson-files/${lesson.id}?kind=video` : null}
          description={lesson.videoDescription}
          lessonId={lesson.id}
          moduleId={moduleId}
          completed={completed}
          prevHref={prevHref}
          nextHref={nextHref}
        />
      ) : (
        <div className="mt-6">
          <LessonNav
            lessonId={lesson.id}
            moduleId={moduleId}
            completed={completed}
            prevHref={prevHref}
            nextHref={nextHref}
          />
        </div>
      )}
    </div>
  );
}
