"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";
import { canManageStaff } from "@/lib/rbac";
import { hashPassword, DEFAULT_STAFF_PASSWORD } from "@/lib/auth";
import { syncDepartmentHod } from "@/lib/org-sync";
import type { Designation, Gender, StaffStatus, RoleType } from "@/generated/prisma/client";

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
  await requireStaffAdmin();

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
  await requireStaffAdmin();

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
