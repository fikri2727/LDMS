import { redirect } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { canManageTraining } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getModuleEstimatedHours } from "@/lib/elearning";
import { ElearningHoursTable, type ElearningHoursRow } from "@/components/training/ElearningHoursTable";

export default async function ElearningHoursPage() {
  const session = await requireSession();
  if (!canManageTraining(session)) redirect("/training");

  const completions = await prisma.elearningCompletion.findMany({
    orderBy: { completedAt: "desc" },
    include: { user: { include: { department: true } }, module: true },
  });

  const hoursByModule = new Map<number, number>();
  const rows: ElearningHoursRow[] = [];
  for (const c of completions) {
    let hours = hoursByModule.get(c.moduleId);
    if (hours === undefined) {
      hours = await getModuleEstimatedHours(c.moduleId);
      hoursByModule.set(c.moduleId, hours);
    }
    rows.push({
      id: c.id,
      staffNo: c.user.staffNo,
      staffName: c.user.staffName,
      department: c.user.department?.name ?? "—",
      moduleId: c.moduleId,
      moduleTitle: c.module.title,
      completedAt: c.completedAt.toISOString(),
      score: c.finalScore,
      hours,
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-text-muted text-sm">{rows.length} completed e-learning record(s)</p>
      </div>
      <ElearningHoursTable rows={rows} />
    </div>
  );
}
