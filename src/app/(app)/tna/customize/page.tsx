import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageTna } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { TnaTrainingCatalog } from "@/components/training/TnaTrainingCatalog";

export default async function TnaCustomizeTrainingPage() {
  const session = await requireSession();
  if (!canManageTna(session)) {
    redirect("/tna");
  }

  const options = await prisma.tnaTrainingOption.findMany({
    orderBy: [{ section: "asc" }, { order: "asc" }],
    select: { id: true, section: true, groupName: true, label: true },
  });

  return (
    <div>
      <Link href="/tna" className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-4">
        <ArrowLeft size={15} /> Back to TNA
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Customize Training</h1>
        <p className="text-text-secondary text-sm mt-1">
          Add, rename, or remove the trainings staff can select from when filling out their TNA, for each of the
          7 sections (a–g).
        </p>
      </div>

      <TnaTrainingCatalog options={options} />
    </div>
  );
}
