import { redirect } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { canManageTraining } from "@/lib/rbac";
import { api } from "@/lib/api";
import { PendingEvaluationsView, type PendingData } from "@/components/training/PendingEvaluationsView";

export default async function PendingEvaluationsPage() {
  const session = await requireSession();
  if (!canManageTraining(session)) redirect("/training");

  const data = await api.get<PendingData>("/api/training/pending-evaluations");
  return <PendingEvaluationsView data={data} />;
}
