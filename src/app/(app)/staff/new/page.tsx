import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageStaff } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { StaffForm } from "@/components/staff/StaffForm";
import { createStaff } from "@/app/(app)/staff/actions";

export default async function NewStaffPage() {
  const session = await requireSession();
  if (!canManageStaff(session)) redirect("/dashboard");

  const [divisions, supervisorOptions] = await Promise.all([
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
      select: { id: true, staffNo: true, staffName: true },
      orderBy: { staffName: "asc" },
    }),
  ]);

  return (
    <div>
      <Link href="/staff" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4">
        <ArrowLeft size={15} /> Back to Staff List
      </Link>
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Add Staff</h1>
      <StaffForm
        action={createStaff}
        divisions={divisions}
        supervisorOptions={supervisorOptions}
        isNew
        submitLabel="Create Staff"
      />
    </div>
  );
}
