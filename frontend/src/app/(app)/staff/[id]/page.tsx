import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageStaff } from "@/lib/rbac";
import { api } from "@/lib/api";
import type { DivisionTree, StaffOption, User } from "@/lib/db-types";
import { StaffForm } from "@/components/staff/StaffForm";
import { updateStaff } from "@/app/(app)/staff/actions";
import { StaffDangerZone } from "@/components/staff/StaffDangerZone";

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!canManageStaff(session)) redirect("/dashboard");

  const { id } = await params;
  const staffId = Number(id);

  const [staff, { divisions, supervisorOptions }] = await Promise.all([
    api.get<User>(`/api/staff/${staffId}`),
    api.get<{ divisions: DivisionTree[]; supervisorOptions: StaffOption[] }>("/api/staff/form-options", {
      excludeId: staffId,
    }),
  ]);

  if (!staff) notFound();

  const boundUpdate = updateStaff.bind(null, staff.id);

  return (
    <div>
      <Link href="/staff" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4">
        <ArrowLeft size={15} /> Back to Staff List
      </Link>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">{staff.staffName}</h1>

      <StaffForm
        key={staff.updatedAt.toISOString()}
        action={boundUpdate}
        divisions={divisions}
        supervisorOptions={supervisorOptions}
        isNew={false}
        submitLabel="Save Changes"
        initial={{
          staffNo: staff.staffNo,
          staffName: staff.staffName,
          email: staff.email,
          gender: staff.gender,
          designation: staff.designation,
          nationality: staff.nationality,
          divisionId: staff.divisionId,
          departmentId: staff.departmentId,
          sectionId: staff.sectionId,
          supervisorId: staff.supervisorId,
          roleType: staff.roleType,
          status: staff.status,
          dateResign: staff.dateResign ? staff.dateResign.toISOString().slice(0, 10) : null,
        }}
      />

      <StaffDangerZone staffId={staff.id} staffName={staff.staffName} />
    </div>
  );
}
