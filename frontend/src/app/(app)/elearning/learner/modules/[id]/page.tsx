import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { api } from "@/lib/api";
import type { ElearningLesson } from "@/lib/db-types";

export default async function ModulePlayerIndexPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const moduleId = Number(id);

  const {
    module: { lessons },
    doneLessonIds,
  } = await api.get<{ module: { lessons: ElearningLesson[] }; doneLessonIds: number[] }>(
    `/api/elearning/learner/modules/${moduleId}`
  );
  if (lessons.length === 0) notFound();
  const doneIds = new Set(doneLessonIds);

  const nextLesson = lessons.find((l) => !doneIds.has(l.id)) ?? lessons[0];

  redirect(
    nextLesson.type === "QUIZ"
      ? `/elearning/learner/modules/${moduleId}/lessons/${nextLesson.id}/quiz`
      : `/elearning/learner/modules/${moduleId}/lessons/${nextLesson.id}`
  );
}
