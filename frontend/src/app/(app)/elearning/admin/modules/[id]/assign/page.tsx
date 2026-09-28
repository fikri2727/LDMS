import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageElearning } from "@/lib/rbac";
import { api } from "@/lib/api";
import type { ElearningModule, StaffOption } from "@/lib/db-types";
import { AssignForm } from "@/components/elearning/AssignForm";
import { assignModule } from "@/app/(app)/elearning/admin/actions";

export default async function AssignModulePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!canManageElearning(session)) redirect("/elearning/learner");

  const { id } = await params;
  const moduleId = Number(id);

  const { module: module_, staffOptions, departmentOptions } = await api.get<{
    module: ElearningModule;
    staffOptions: StaffOption[];
    departmentOptions: { id: number; name: string }[];
  }>(`/api/elearning/modules/${moduleId}/assign-options`);

  return (
    <div>
      <Link
        href={`/elearning/admin/modules/${moduleId}`}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4"
      >
        <ArrowLeft size={15} /> Back to Module
      </Link>
      <h2 className="text-xl font-semibold text-text-primary mb-1">Assign Module</h2>
      <p className="text-sm text-text-muted mb-6">{module_.title}</p>
      <AssignForm
        action={assignModule.bind(null, moduleId)}
        staffOptions={staffOptions}
        departmentOptions={departmentOptions}
      />
    </div>
  );
}
