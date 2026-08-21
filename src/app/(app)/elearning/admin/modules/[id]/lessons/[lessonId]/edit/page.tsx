import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageElearning } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { LESSON_TYPE_LABELS } from "@/lib/labels";
import { LessonForm } from "@/components/elearning/LessonForm";
import { updateLesson } from "@/app/(app)/elearning/admin/actions";

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const session = await requireSession();
  if (!canManageElearning(session)) redirect("/elearning/learner");

  const { id, lessonId } = await params;
  const moduleId = Number(id);

  const lesson = await prisma.elearningLesson.findUnique({ where: { id: Number(lessonId) } });
  if (!lesson || lesson.moduleId !== moduleId) notFound();
  if (lesson.type === "QUIZ") redirect(`/elearning/admin/modules/${moduleId}/lessons/${lesson.id}/questions`);

  return (
    <div>
      <Link
        href={`/elearning/admin/modules/${moduleId}`}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4"
      >
        <ArrowLeft size={15} /> Back to Module
      </Link>
      <h2 className="text-xl font-semibold text-text-primary mb-6">Edit {LESSON_TYPE_LABELS[lesson.type]}</h2>
      <LessonForm
        action={updateLesson.bind(null, lesson.id, moduleId, lesson.type)}
        type={lesson.type}
        submitLabel="Save Changes"
        initial={{
          title: lesson.title,
          slideContent: lesson.slideContent,
          slideFileName: lesson.slideFileName,
          videoUrl: lesson.videoUrl,
          videoDescription: lesson.videoDescription,
          videoFileName: lesson.videoFileName,
        }}
      />
    </div>
  );
}
