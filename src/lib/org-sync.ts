import { prisma } from "@/lib/prisma";

/**
 * Keeps User.hodId in sync with Department.hodUserId for every staff member
 * in that department — mirrors the legacy DB trigger (trg_departments_hod_update).
 */
export async function syncDepartmentHod(departmentId: number) {
  const department = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!department) return;

  await prisma.user.updateMany({
    where: { departmentId },
    data: { hodId: department.hodUserId },
  });
}
