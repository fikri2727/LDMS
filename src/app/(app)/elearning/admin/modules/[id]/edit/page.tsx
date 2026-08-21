import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageElearning } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ModuleForm } from "@/components/elearning/ModuleForm";
import { updateModule } from "@/app/(app)/elearning/admin/actions";

export default async function EditModulePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!canManageElearning(session)) redirect("/elearning/learner");

  const { id } = await params;
  const moduleId = Number(id);

  const [module_, categories] = await Promise.all([
    prisma.elearningModule.findUnique({ where: { id: moduleId } }),
    prisma.elearningCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!module_) notFound();

  return (
    <div>
      <Link
        href={`/elearning/admin/modules/${moduleId}`}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4"
      >
        <ArrowLeft size={15} /> Back to Module
      </Link>
      <h2 className="text-xl font-semibold text-text-primary mb-6">Edit Module</h2>
      <ModuleForm
        action={updateModule.bind(null, moduleId)}
        submitLabel="Save Changes"
        categories={categories}
        initial={{
          title: module_.title,
          categoryId: module_.categoryId,
          description: module_.description,
          objectives: module_.objectives,
          passThreshold: module_.passThreshold,
          certificateBackgroundName: module_.certificateBackgroundName,
        }}
      />
    </div>
  );
}
