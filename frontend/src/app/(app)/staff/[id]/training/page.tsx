import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageStaff } from "@/lib/rbac";
import { api } from "@/lib/api";
import { StaffTrainingRecordTable, type StaffTrainingRecordRow } from "@/components/staff/StaffTrainingRecordTable";

export default async function StaffTrainingRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!canManageStaff(session)) redirect("/dashboard");

  const { id } = await params;
  const staffId = Number(id);

  // Rows (Public/Inhouse, OJT, E-Learning) are built and sorted by the backend.
  const { staff, rows } = await api.get<{
    staff: { id: number; staffNo: string; staffName: string; department: { name: string } | null };
    rows: StaffTrainingRecordRow[];
  }>(`/api/staff/${staffId}/training-record`);

  return (
    <div>
      <Link href="/staff" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4">
        <ArrowLeft size={15} /> Back to Staff List
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{staff.staffName}</h1>
          <p className="text-sm text-text-muted mt-1">
            {staff.staffNo} · {staff.department?.name ?? "—"}
          </p>
        </div>
        <Link
          href={`/staff/${staff.id}`}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-surface text-text-secondary text-sm font-medium px-4 py-2 hover:bg-gray-50 transition-colors"
        >
          <Pencil size={14} /> Edit Staff
        </Link>
      </div>

      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
        Training Record ({rows.length})
      </h2>
      <StaffTrainingRecordTable rows={rows} />
    </div>
  );
}
