import { redirect } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { canManageTraining } from "@/lib/rbac";
import { api } from "@/lib/api";
import { ElearningHoursTable, type ElearningHoursRow } from "@/components/training/ElearningHoursTable";

export default async function ElearningHoursPage() {
  const session = await requireSession();
  if (!canManageTraining(session)) redirect("/training");

  const rows = (await api.get<ElearningHoursRow[]>("/api/training/elearning-hours")).map((r) => ({
    ...r,
    completedAt: new Date(r.completedAt).toISOString(),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-text-muted text-sm">{rows.length} completed e-learning record(s)</p>
      </div>
      <ElearningHoursTable rows={rows} />
    </div>
  );
}
