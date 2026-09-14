"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";
import { canManageStaff } from "@/lib/rbac";
import { hashPassword, DEFAULT_STAFF_PASSWORD } from "@/lib/auth";
import { syncDepartmentHod } from "@/lib/org-sync";
import { parseStaffExcel, type StaffExcelRow } from "@/lib/staff-excel";
import { GENDER_LABELS, DESIGNATION_LABELS, ROLE_LABELS, STATUS_LABELS } from "@/lib/labels";
import type { Designation, Gender, StaffStatus, RoleType, Department, Section } from "@/generated/prisma/client";

async function requireStaffAdmin() {
  const session = await requireSession();
  if (!canManageStaff(session)) {
    throw new Error("You do not have permission to manage staff records.");
  }
  return session;
}

function num(formData: FormData, key: string): number | null {
  const v = formData.get(key);
  if (!v || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

async function resolveHodId(departmentId: number | null) {
  if (!departmentId) return null;
  const dept = await prisma.department.findUnique({ where: { id: departmentId } });
  return dept?.hodUserId ?? null;
}

/** Active admins other than the given user — used to stop the last admin from locking everyone out. */
async function otherActiveAdminCount(excludingUserId: number) {
  return prisma.user.count({
    where: { roleType: "ADMIN", status: "ACTIVE", id: { not: excludingUserId } },
  });
}

export async function createStaff(formData: FormData) {
  await requireStaffAdmin();

  const staffNo = String(formData.get("staffNo") ?? "").trim().toUpperCase();
  const staffName = String(formData.get("staffName") ?? "").trim().toUpperCase();
  const email = String(formData.get("email") ?? "").trim() || null;
  const gender = String(formData.get("gender") ?? "") as Gender;
  const designation = String(formData.get("designation") ?? "") as Designation;
  const nationality = String(formData.get("nationality") ?? "").trim() || null;
  const divisionId = num(formData, "divisionId");
  const departmentId = num(formData, "departmentId");
  const sectionId = num(formData, "sectionId");
  const supervisorId = num(formData, "supervisorId");
  const roleType = String(formData.get("roleType") ?? "STAFF") as RoleType;

  if (!staffNo || !staffName || !gender || !designation) {
    throw new Error("Staff No., Name, Gender, and Designation are required.");
  }

  const password = await hashPassword(DEFAULT_STAFF_PASSWORD);
  const hodId = await resolveHodId(departmentId);

  const user = await prisma.user.create({
    data: {
      staffNo,
      staffName,
      email,
      gender,
      designation,
      nationality,
      divisionId,
      departmentId,
      sectionId,
      supervisorId,
      roleType,
      password,
      passwordIsDefault: true,
      hodId,
      status: "ACTIVE",
    },
  });

  if (departmentId) await syncDepartmentHod(departmentId);

  revalidatePath("/staff");
  redirect(`/staff/${user.id}`);
}

export async function updateStaff(id: number, formData: FormData) {
  const session = await requireStaffAdmin();

  const staffName = String(formData.get("staffName") ?? "").trim().toUpperCase();
  const email = String(formData.get("email") ?? "").trim() || null;
  const gender = String(formData.get("gender") ?? "") as Gender;
  const designation = String(formData.get("designation") ?? "") as Designation;
  const nationality = String(formData.get("nationality") ?? "").trim() || null;
  const divisionId = num(formData, "divisionId");
  const departmentId = num(formData, "departmentId");
  const sectionId = num(formData, "sectionId");
  const supervisorId = num(formData, "supervisorId");
  const status = String(formData.get("status") ?? "ACTIVE") as StaffStatus;
  const dateResignRaw = String(formData.get("dateResign") ?? "");
  const dateResign = status === "RESIGN" && dateResignRaw ? new Date(dateResignRaw) : null;
  const roleType = String(formData.get("roleType") ?? "STAFF") as RoleType;

  if (!staffName || !gender || !designation) {
    throw new Error("Name, Gender, and Designation are required.");
  }
  if (supervisorId === id) {
    throw new Error("A staff member cannot be their own supervisor.");
  }
  if (id === session.userId && (roleType !== "ADMIN" || status !== "ACTIVE")) {
    if ((await otherActiveAdminCount(id)) === 0) {
      throw new Error("You are the only active Admin — have another Admin make this change instead.");
    }
  }

  const existing = await prisma.user.findUniqueOrThrow({ where: { id } });
  const hodId = await resolveHodId(departmentId);

  await prisma.user.update({
    where: { id },
    data: {
      staffName,
      email,
      gender,
      designation,
      nationality,
      divisionId,
      departmentId,
      sectionId,
      supervisorId,
      status,
      dateResign,
      roleType,
      hodId,
    },
  });

  // Department may have changed — resync both the old and new department's staff.
  if (existing.departmentId) await syncDepartmentHod(existing.departmentId);
  if (departmentId && departmentId !== existing.departmentId) await syncDepartmentHod(departmentId);

  revalidatePath("/staff");
  revalidatePath(`/staff/${id}`);
}

export async function resetPassword(id: number) {
  await requireStaffAdmin();
  const password = await hashPassword(DEFAULT_STAFF_PASSWORD);
  await prisma.user.update({ where: { id }, data: { password, passwordIsDefault: true } });
  revalidatePath(`/staff/${id}`);
}

export async function deleteStaff(id: number) {
  const session = await requireStaffAdmin();

  if (id === session.userId) {
    throw new Error("You cannot delete your own account. Have another Admin do this instead.");
  }

  const [participationCount, ojtParticipationCount, pmeCount] = await Promise.all([
    prisma.participation.count({ where: { userId: id } }),
    prisma.participateOjt.count({ where: { userId: id } }),
    prisma.pme.count({ where: { userId: id } }),
  ]);

  if (participationCount > 0 || ojtParticipationCount > 0 || pmeCount > 0) {
    throw new Error(
      "This staff member has training history (attendance, OJT, or PME records) and cannot be deleted. " +
        'Set their status to "Resigned" instead to preserve those records.'
    );
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath("/staff");
  redirect("/staff");
}

// ---------- Bulk upload / update via Excel ----------

function enumFromLabel<T extends string>(labels: Record<T, string>, raw: string): T | undefined {
  const needle = raw.trim().toUpperCase();
  if (!needle) return undefined;
  return (Object.keys(labels) as T[]).find((key) => key === needle || labels[key].toUpperCase() === needle);
}

function matchOrgUnit<T extends { name: string; shortName: string | null }>(list: T[], needle: string): T | undefined {
  const n = needle.trim().toUpperCase();
  return list.find((x) => (x.shortName && x.shortName.toUpperCase() === n) || x.name.toUpperCase() === n);
}

interface ResolvedStaffRow {
  row: StaffExcelRow;
  isNew: boolean;
  staffName?: string;
  email?: string | null;
  gender?: Gender;
  designation?: Designation;
  nationality?: string | null;
  divisionId?: number | null;
  departmentId?: number | null;
  sectionId?: number | null;
  supervisorId?: number | null;
  roleType?: RoleType;
  status?: StaffStatus;
}

/**
 * Bulk-import/update staff from an Excel file (see staff-upload-template.xlsx
 * / src/lib/staff-excel.ts for the expected format). Matched by Staff No: a
 * row whose Staff No already exists UPDATES that profile (blank cells leave
 * the existing value untouched); a row with an unrecognised Staff No CREATES
 * a new staff record (with the default password, same as the manual "Add
 * Staff" form). All-or-nothing — if any row fails to resolve, nothing is
 * written and every problem is reported together.
 */
export async function bulkUploadStaff(formData: FormData) {
  const session = await requireStaffAdmin();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Please choose an Excel file to upload.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = await parseStaffExcel(buffer);

  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.staffNo)) {
      throw new Error(`Row ${r.rowNumber}: Staff No "${r.staffNo}" appears more than once in this file.`);
    }
    seen.add(r.staffNo);
  }

  const [existingUsers, allDivisions, allDepartments, allSections, allStaff] = await Promise.all([
    prisma.user.findMany({ where: { staffNo: { in: rows.map((r) => r.staffNo) } } }),
    prisma.division.findMany(),
    prisma.department.findMany(),
    prisma.section.findMany(),
    prisma.user.findMany({ select: { id: true, staffNo: true } }),
  ]);
  const existingByStaffNo = new Map(existingUsers.map((u) => [u.staffNo, u]));
  const staffNoToId = new Map(allStaff.map((u) => [u.staffNo, u.id]));
  const hodUserIdByDeptId = new Map(allDepartments.map((d) => [d.id, d.hodUserId]));

  const errors: string[] = [];
  const resolved: ResolvedStaffRow[] = [];

  for (const row of rows) {
    const existing = existingByStaffNo.get(row.staffNo);
    const isNew = !existing;
    const label = `Row ${row.rowNumber} (${row.staffNo})`;

    const result: ResolvedStaffRow = { row, isNew };

    if (row.staffName) result.staffName = row.staffName.trim().toUpperCase();
    if (row.email) result.email = row.email.trim();
    if (row.nationality) result.nationality = row.nationality.trim().toUpperCase();

    if (row.gender) {
      const gender = enumFromLabel<Gender>(GENDER_LABELS, row.gender);
      if (!gender) errors.push(`${label}: unknown Gender "${row.gender}".`);
      result.gender = gender;
    }
    if (row.designation) {
      const designation = enumFromLabel<Designation>(DESIGNATION_LABELS, row.designation);
      if (!designation) errors.push(`${label}: unknown Designation "${row.designation}".`);
      result.designation = designation;
    }
    if (row.roleType) {
      const roleType = enumFromLabel<RoleType>(ROLE_LABELS, row.roleType);
      if (!roleType) errors.push(`${label}: unknown System Role "${row.roleType}".`);
      result.roleType = roleType;
    }
    if (row.status) {
      const status = enumFromLabel<StaffStatus>(STATUS_LABELS, row.status);
      if (!status) errors.push(`${label}: unknown Status "${row.status}".`);
      result.status = status;
    }

    let department: Department | undefined;
    if (row.department) {
      department = matchOrgUnit(allDepartments, row.department);
      if (!department) errors.push(`${label}: Department "${row.department}" not found.`);
      result.departmentId = department?.id;
    }
    if (row.division) {
      const division = matchOrgUnit(allDivisions, row.division);
      if (!division) errors.push(`${label}: Division "${row.division}" not found.`);
      result.divisionId = division?.id ?? (department ? department.divisionId : undefined);
    } else if (department) {
      result.divisionId = department.divisionId;
    }
    if (row.section) {
      const candidates: Section[] = department
        ? allSections.filter((s) => s.departmentId === department!.id)
        : allSections;
      const section = matchOrgUnit(candidates, row.section);
      if (!section) errors.push(`${label}: Section "${row.section}" not found${department ? " in that department" : ""}.`);
      result.sectionId = section?.id;
    }

    if (row.supervisorStaffNo) {
      if (row.supervisorStaffNo === row.staffNo) {
        errors.push(`${label}: a staff member cannot be their own supervisor.`);
      } else {
        const supervisorId = staffNoToId.get(row.supervisorStaffNo);
        if (!supervisorId) errors.push(`${label}: Supervisor Staff No "${row.supervisorStaffNo}" not found.`);
        result.supervisorId = supervisorId;
      }
    }

    if (isNew) {
      if (!result.staffName) errors.push(`${label}: Staff Name is required for a new staff member.`);
      if (!result.gender) errors.push(`${label}: Gender is required for a new staff member.`);
      if (!result.designation) errors.push(`${label}: Designation is required for a new staff member.`);
    }

    // Mirror updateStaff's lockout guard — bulk upload can't be used to strip
    // the uploader's own Admin access (they'd have no way to undo a mistake).
    if (
      existing &&
      row.staffNo === session.staffNo &&
      ((result.roleType && result.roleType !== "ADMIN") || (result.status && result.status !== "ACTIVE"))
    ) {
      errors.push(`${label}: you can't change your own role or status via bulk upload — have another Admin do it.`);
    }

    resolved.push(result);
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  const touchedDepartmentIds = new Set<number>();

  // Every new staff record gets the same default password — hash it once,
  // outside the transaction, so bcrypt doesn't run per-row (which would blow
  // the interactive-transaction timeout on a large import).
  const defaultPasswordHash = resolved.some((r) => r.isNew) ? await hashPassword(DEFAULT_STAFF_PASSWORD) : "";

  await prisma.$transaction(async (tx) => {
    for (const r of resolved) {
      if (r.isNew) {
        await tx.user.create({
          data: {
            staffNo: r.row.staffNo,
            staffName: r.staffName!,
            email: r.email ?? null,
            gender: r.gender!,
            designation: r.designation!,
            nationality: r.nationality ?? null,
            divisionId: r.divisionId ?? null,
            departmentId: r.departmentId ?? null,
            sectionId: r.sectionId ?? null,
            supervisorId: r.supervisorId ?? null,
            roleType: r.roleType ?? "STAFF",
            status: r.status ?? "ACTIVE",
            hodId: r.departmentId ? hodUserIdByDeptId.get(r.departmentId) ?? null : null,
            password: defaultPasswordHash,
            passwordIsDefault: true,
          },
        });
      } else {
        const data: Record<string, unknown> = {};
        if (r.staffName !== undefined) data.staffName = r.staffName;
        if (r.email !== undefined) data.email = r.email;
        if (r.gender !== undefined) data.gender = r.gender;
        if (r.designation !== undefined) data.designation = r.designation;
        if (r.nationality !== undefined) data.nationality = r.nationality;
        if (r.divisionId !== undefined) data.divisionId = r.divisionId;
        if (r.sectionId !== undefined) data.sectionId = r.sectionId;
        if (r.supervisorId !== undefined) data.supervisorId = r.supervisorId;
        if (r.roleType !== undefined) data.roleType = r.roleType;
        if (r.status !== undefined) data.status = r.status;
        if (r.departmentId !== undefined) {
          data.departmentId = r.departmentId;
          data.hodId = r.departmentId ? hodUserIdByDeptId.get(r.departmentId) ?? null : null;
        }

        if (Object.keys(data).length > 0) {
          await tx.user.update({ where: { staffNo: r.row.staffNo }, data });
        }
      }

      if (r.departmentId) touchedDepartmentIds.add(r.departmentId);
    }
  });

  for (const departmentId of touchedDepartmentIds) {
    await syncDepartmentHod(departmentId);
  }

  revalidatePath("/staff");
}
