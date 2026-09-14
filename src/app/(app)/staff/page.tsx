import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { canManageStaff } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { StaffFilters } from "@/components/staff/StaffFilters";
import { StaffTable } from "@/components/staff/StaffTable";
import { DownloadStaffReportButton, type StaffReportRow } from "@/components/staff/DownloadStaffReportButton";
import { Plus, Upload } from "lucide-react";
import type { Designation, Prisma, RoleType } from "@/generated/prisma/client";
import { DESIGNATION_LABELS } from "@/lib/labels";

export default async function StaffListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; divisionId?: string; departmentId?: string; status?: string; role?: string }>;
}) {
  const session = await requireSession();
  if (!canManageStaff(session)) redirect("/dashboard");

  const { q, divisionId, departmentId, status, role } = await searchParams;

  const where: Prisma.UserWhereInput = {};
  if (q) {
    const needle = q.toUpperCase();
    // Designation is an enum, so Prisma can't `contains`-match it directly — resolve which
    // enum values whose label (e.g. "Manager") or raw name (e.g. "NON_EXECUTIVE") match instead.
    const matchingDesignations = (Object.keys(DESIGNATION_LABELS) as Designation[]).filter(
      (key) => key.includes(needle) || DESIGNATION_LABELS[key].toUpperCase().includes(needle)
    );
    where.OR = [
      { staffName: { contains: needle } },
      { staffNo: { contains: needle } },
      { division: { name: { contains: needle } } },
      { department: { name: { contains: needle } } },
      { section: { name: { contains: needle } } },
      ...(matchingDesignations.length > 0 ? [{ designation: { in: matchingDesignations } }] : []),
    ];
  }
  if (divisionId) where.divisionId = Number(divisionId);
  if (departmentId) where.departmentId = Number(departmentId);
  if (status) where.status = status as "ACTIVE" | "RESIGN";
  if (role) where.roleType = role as RoleType;

  const [staff, divisions, departments] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        division: true,
        department: true,
        section: true,
        supervisor: { select: { staffNo: true, staffName: true } },
      },
      orderBy: { staffName: "asc" },
    }),
    prisma.division.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, divisionId: true } }),
  ]);

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
