import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageElearning } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { LESSON_TYPE_LABELS } from "@/lib/labels";
import { LessonForm } from "@/components/elearning/LessonForm";
import { createLesson } from "@/app/(app)/elearning/admin/actions";
import type { LessonType } from "@/generated/prisma/client";

export default async function NewLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await requireSession();
  if (!canManageElearning(session)) redirect("/elearning/learner");

  const { id } = await params;
  const { type: typeRaw } = await searchParams;
  const moduleId = Number(id);
  const type = (["SLIDE", "VIDEO", "QUIZ"].includes(typeRaw ?? "") ? typeRaw : "SLIDE") as LessonType;

  const module_ = await prisma.elearningModule.findUnique({ where: { id: moduleId } });
  if (!module_) notFound();

  return (
    <div>
      <Link
        href={`/elearning/admin/modules/${moduleId}`}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4"
      >
        <ArrowLeft size={15} /> Back to Module
      </Link>
      <h2 className="text-xl font-semibold text-text-primary mb-1">Add {LESSON_TYPE_LABELS[type]}</h2>
      <p className="text-sm text-text-muted mb-6">{module_.title}</p>
      <LessonForm
        action={createLesson.bind(null, moduleId, type)}
        type={type}
        submitLabel={type === "QUIZ" ? "Create Quiz & Add Questions" : "Add Lesson"}
      />
    </div>
  );
}
