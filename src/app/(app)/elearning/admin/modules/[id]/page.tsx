import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Users } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageElearning } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { MODULE_STATUS_LABELS } from "@/lib/labels";
import { LessonOutline } from "@/components/elearning/LessonOutline";
import { PublishButton } from "@/components/elearning/PublishButton";
import { DeleteModuleButton } from "@/components/elearning/DeleteModuleButton";
import { removeAssignment } from "@/app/(app)/elearning/admin/actions";
import { RemoveAssignmentButton } from "@/components/elearning/RemoveAssignmentButton";
import { format } from "date-fns";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-text-secondary",
  REVIEW: "bg-purple/10 text-purple",
  PUBLISHED: "bg-primary/10 text-primary-dark",
  ARCHIVED: "bg-rose-50 text-rose-600",
};

export default async function ModuleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!canManageElearning(session)) redirect("/elearning/learner");

  const { id } = await params;
  const moduleId = Number(id);

  const module_ = await prisma.elearningModule.findUnique({
    where: { id: moduleId },
    include: {
      category: true,
      lessons: { orderBy: { order: "asc" }, include: { questions: { select: { id: true } } } },
      assignments: { include: { user: true }, orderBy: { createdAt: "desc" } },
      completions: { select: { userId: true } },
    },
  });

  if (!module_) notFound();

  const completedUserIds = new Set(module_.completions.map((c) => c.userId));
  const objectives = (module_.objectives ?? "").split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <div>
      <Link
        href="/elearning/admin"
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4"
      >
        <ArrowLeft size={15} /> Back to Modules
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-primary-dark font-medium">{module_.category?.name ?? "Uncategorized"}</span>
            <span className={`inline-flex rounded-full text-xs font-medium px-2 py-0.5 ${STATUS_STYLES[module_.status]}`}>
              {MODULE_STATUS_LABELS[module_.status]}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-text-primary">{module_.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/elearning/admin/modules/${module_.id}/edit`}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface text-sm font-medium px-3 py-2 text-text-secondary hover:bg-gray-50 transition-colors"
          >
            <Pencil size={15} /> Edit
          </Link>
          <PublishButton moduleId={module_.id} status={module_.status} />
          <DeleteModuleButton moduleId={module_.id} title={module_.title} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="col-span-2 space-y-6">
          {module_.description && (
            <div className="bg-surface rounded-2xl border border-border p-5 shadow-[var(--shadow-card)]">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">Description</h3>
              <p className="text-sm text-text-secondary">{module_.description}</p>
            </div>
          )}

          {objectives.length > 0 && (
            <div className="bg-surface rounded-2xl border border-border p-5 shadow-[var(--shadow-card)]">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">Learning Objectives</h3>
              <ul className="list-disc list-inside text-sm text-text-secondary space-y-1">
                {objectives.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-surface rounded-2xl border border-border p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
                Lesson Outline ({module_.lessons.length})
              </h3>
              <div className="flex items-center gap-2">
                <Link
                  href={`/elearning/admin/modules/${module_.id}/lessons/new?type=SLIDE`}
                  className="text-xs rounded-xl border border-border px-2.5 py-1.5 text-text-secondary hover:bg-gray-50 flex items-center gap-1 transition-colors"
                >
                  <Plus size={12} /> Slide
                </Link>
                <Link
                  href={`/elearning/admin/modules/${module_.id}/lessons/new?type=VIDEO`}
                  className="text-xs rounded-xl border border-border px-2.5 py-1.5 text-text-secondary hover:bg-gray-50 flex items-center gap-1 transition-colors"
                >
                  <Plus size={12} /> Video
                </Link>
                <Link
                  href={`/elearning/admin/modules/${module_.id}/lessons/new?type=QUIZ`}
                  className="text-xs rounded-xl border border-border px-2.5 py-1.5 text-text-secondary hover:bg-gray-50 flex items-center gap-1 transition-colors"
                >
                  <Plus size={12} /> Quiz
                </Link>
              </div>
            </div>
            <LessonOutline
              moduleId={module_.id}
              lessons={module_.lessons.map((l) => ({
                id: l.id,
                type: l.type,
                title: l.title,
                order: l.order,
                questionCount: l.questions.length,
              }))}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-[var(--shadow-card)]">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">Settings</h3>
            <p className="text-sm text-text-secondary">
              Pass Threshold: <span className="font-medium text-text-primary">{module_.passThreshold}%</span>
            </p>
          </div>

          <div className="bg-surface rounded-2xl border border-border p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
                Assigned ({module_.assignments.length})
              </h3>
              <Link
                href={`/elearning/admin/modules/${module_.id}/assign`}
                className="text-xs flex items-center gap-1 text-primary hover:text-primary-dark"
              >
                <Users size={13} /> Assign
              </Link>
            </div>
            {module_.assignments.length === 0 ? (
              <p className="text-sm text-text-muted">No learners assigned yet.</p>
            ) : (
              <ul className="space-y-2 max-h-96 overflow-y-auto">
                {module_.assignments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-text-primary">{a.user.staffName}</p>
                      <p className="text-xs text-text-muted">
                        {completedUserIds.has(a.userId) ? "Completed" : "In Progress"}
                        {a.dueDate ? ` · Due ${format(a.dueDate, "d MMM yyyy")}` : ""}
                      </p>
                    </div>
                    <RemoveAssignmentButton
                      assignmentId={a.id}
                      moduleId={module_.id}
                      staffName={a.user.staffName}
                      onRemove={removeAssignment}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
