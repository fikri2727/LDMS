import { redirect } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { canManageOrg } from "@/lib/rbac";
import { api } from "@/lib/api";
import type { DivisionTree, StaffOption } from "@/lib/db-types";
import { OrgTree } from "@/components/org/OrgTree";

export default async function OrganizationPage() {
  const session = await requireSession();
  if (!canManageOrg(session)) redirect("/dashboard");

  const { divisions, staff } = await api.get<{
    divisions: DivisionTree[];
    staff: (StaffOption & { departmentId: number | null })[];
  }>("/api/org");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Organization Structure</h1>
      <div className="mt-6">
        <OrgTree divisions={divisions} staffOptions={staff} />
      </div>
    </div>
  );
}
