"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";
import { canManageOrg } from "@/lib/rbac";
import { syncDepartmentHod } from "@/lib/org-sync";
import { isForeignKeyError } from "@/lib/friendly-error";

async function requireOrgAdmin() {
  const session = await requireSession();
  if (!canManageOrg(session)) {
    throw new Error("You do not have permission to manage organization structure.");
  }
  return session;
}

function nameFromForm(formData: FormData) {
  return String(formData.get("name") ?? "").trim().toUpperCase();
}

function shortNameFromForm(formData: FormData) {
  const v = String(formData.get("shortName") ?? "").trim();
  return v ? v.toUpperCase() : null;
}

// ---------- Division ----------

export async function createDivision(formData: FormData) {
  await requireOrgAdmin();
  const name = nameFromForm(formData);
  if (!name) throw new Error("Division name is required.");
  await prisma.division.create({ data: { name, shortName: shortNameFromForm(formData) } });
  revalidatePath("/organization");
}

export async function updateDivision(id: number, formData: FormData) {
  await requireOrgAdmin();
  const name = nameFromForm(formData);
  if (!name) throw new Error("Division name is required.");
  await prisma.division.update({ where: { id }, data: { name, shortName: shortNameFromForm(formData) } });
  revalidatePath("/organization");
}

export async function deleteDivision(id: number) {
  await requireOrgAdmin();
  try {
    await prisma.division.delete({ where: { id } });
  } catch (e) {
    if (isForeignKeyError(e)) {
      throw new Error(
        "This division still has staff assigned to it (directly, or via its departments/sections). Reassign those staff first."
      );
    }
    throw e;
  }
  revalidatePath("/organization");
}

// ---------- Department ----------

export async function createDepartment(divisionId: number, formData: FormData) {
  await requireOrgAdmin();
  const name = nameFromForm(formData);
  if (!name) throw new Error("Department name is required.");
  await prisma.department.create({
    data: { divisionId, name, shortName: shortNameFromForm(formData) },
  });
  revalidatePath("/organization");
}

export async function updateDepartment(id: number, formData: FormData) {
  await requireOrgAdmin();
  const name = nameFromForm(formData);
  if (!name) throw new Error("Department name is required.");
  await prisma.department.update({
    where: { id },
    data: { name, shortName: shortNameFromForm(formData) },
  });
  revalidatePath("/organization");
}

export async function deleteDepartment(id: number) {
  await requireOrgAdmin();
  try {
    await prisma.department.delete({ where: { id } });
  } catch (e) {
    if (isForeignKeyError(e)) {
      throw new Error(
        "This department still has staff assigned to it (directly, or via its sections). Reassign those staff first."
      );
    }
    throw e;
  }
  revalidatePath("/organization");
}

export async function assignHod(departmentId: number, formData: FormData) {
  await requireOrgAdmin();
  const raw = String(formData.get("hodUserId") ?? "");
  const hodUserId = raw ? Number(raw) : null;

  await prisma.$transaction(async (tx) => {
    // Clear isHod on the previous HOD (if different) and set on the new one.
    const dept = await tx.department.findUniqueOrThrow({ where: { id: departmentId } });
    if (dept.hodUserId && dept.hodUserId !== hodUserId) {
      await tx.user.update({ where: { id: dept.hodUserId }, data: { isHod: false } });
    }
    await tx.department.update({ where: { id: departmentId }, data: { hodUserId } });
    if (hodUserId) {
      await tx.user.update({ where: { id: hodUserId }, data: { isHod: true } });
    }
  });

  await syncDepartmentHod(departmentId);
  revalidatePath("/organization");
  revalidatePath("/staff");
}

// ---------- Section ----------

export async function createSection(departmentId: number, formData: FormData) {
  await requireOrgAdmin();
  const name = nameFromForm(formData);
  if (!name) throw new Error("Section name is required.");
  await prisma.section.create({
    data: { departmentId, name, shortName: shortNameFromForm(formData) },
  });
  revalidatePath("/organization");
}

export async function updateSection(id: number, formData: FormData) {
  await requireOrgAdmin();
  const name = nameFromForm(formData);
  if (!name) throw new Error("Section name is required.");
  await prisma.section.update({
    where: { id },
    data: { name, shortName: shortNameFromForm(formData) },
  });
  revalidatePath("/organization");
}

export async function deleteSection(id: number) {
  await requireOrgAdmin();
  try {
    await prisma.section.delete({ where: { id } });
  } catch (e) {
    if (isForeignKeyError(e)) {
      throw new Error("This section still has staff assigned to it. Reassign those staff first.");
    }
    throw e;
  }
  revalidatePath("/organization");
}
