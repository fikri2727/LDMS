import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { canManageStaff } from "@/lib/rbac";
import { api } from "@/lib/api";
import { StaffFilters } from "@/components/staff/StaffFilters";
import { StaffTable } from "@/components/staff/StaffTable";
import { DownloadStaffReportButton, type StaffReportRow } from "@/components/staff/DownloadStaffReportButton";
import { Plus, Upload } from "lucide-react";
import type { User } from "@/lib/db-types";

type StaffRow = User & {
  division: { name: string } | null;
  department: { name: string } | null;
  section: { name: string } | null;
  supervisor: { staffNo: string; staffName: string } | null;
};

export default async function StaffListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; divisionId?: string; departmentId?: string; status?: string; role?: string }>;
}) {
  const session = await requireSession();
  if (!canManageStaff(session)) redirect("/dashboard");

  const { q, divisionId, departmentId, status, role } = await searchParams;

  const { staff, divisions, departments } = await api.get<{
    staff: StaffRow[];
    divisions: { id: number; name: string }[];
    departments: { id: number; name: string; divisionId: number }[];
  }>(
    "/api/staff",
    { q, divisionId, departmentId, status, role }
  );

  const staffRows: StaffReportRow[] = staff.map((s) => ({
    staffNo: s.staffNo,
    staffName: s.staffName,
    email: s.email,
    gender: s.gender,
    designation: s.designation,
    nationality: s.nationality,
    divisionName: s.division?.name ?? null,
    departmentName: s.department?.name ?? null,
    sectionName: s.section?.name ?? null,
    supervisorStaffNo: s.supervisor?.staffNo ?? null,
    supervisorName: s.supervisor?.staffName ?? null,
    roleType: s.roleType,
    isHod: s.isHod,
    status: s.status,
    dateResign: s.dateResign ? s.dateResign.toISOString() : null,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Staff List</h1>
          <p className="text-text-muted text-sm mt-1">{staff.length} staff record(s)</p>
        </div>
        <div className="flex items-center gap-3">
          <DownloadStaffReportButton staffRows={staffRows} />
          <Link
            href="/staff/upload"
            className="flex items-center gap-1.5 rounded-xl border border-border text-sm font-medium px-4 py-2 text-text-secondary hover:bg-gray-50 transition-colors"
          >
            <Upload size={16} /> Upload Excel
          </Link>
          <Link
            href="/staff/new"
            className="flex items-center gap-1.5 rounded-xl bg-primary-dark hover:bg-primary text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            <Plus size={16} /> Add Staff
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <StaffFilters divisions={divisions} departments={departments} />
      </div>

      <StaffTable staff={staff} />
    </div>
  );
}
