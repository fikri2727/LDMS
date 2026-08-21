import { redirect } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { canManageOrg } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { OrgTree } from "@/components/org/OrgTree";

export default async function OrganizationPage() {
  const session = await requireSession();
  if (!canManageOrg(session)) redirect("/dashboard");

  const [divisions, staff] = await Promise.all([
    prisma.division.findMany({
      orderBy: { name: "asc" },
      include: {
        departments: {
          orderBy: { name: "asc" },
          include: { sections: { orderBy: { name: "asc" } } },
        },
      },
    }),
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, staffNo: true, staffName: true, departmentId: true },
      orderBy: { staffName: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Organization Structure</h1>
      <div className="mt-6">
        <OrgTree divisions={divisions} staffOptions={staff} />
      </div>
    </div>
  );
}
