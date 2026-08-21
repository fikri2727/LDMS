import { redirect } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { canManageElearning } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ModuleForm } from "@/components/elearning/ModuleForm";
import { createModule } from "@/app/(app)/elearning/admin/actions";

export default async function NewModulePage() {
  const session = await requireSession();
  if (!canManageElearning(session)) redirect("/elearning/learner");

  const categories = await prisma.elearningCategory.findMany({ orderBy: { name: "asc" } });

  return <ModuleForm action={createModule} submitLabel="Create Module" categories={categories} />;
}
