import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageTna } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { TNA_STATUS_LABELS } from "@/lib/labels";
import { TnaForm } from "@/components/training/TnaForm";
import { emptyTnaFormState, buildTrainingOptionsMap, type TnaFormState } from "@/lib/tna-options";
import { PmeActionButton } from "@/components/training/PmeActionButton";
import { approveTna } from "@/app/(app)/tna/actions";

export default async function TnaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const manage = canManageTna(session);

  if (!manage) {
    redirect("/tna");
  }

  const [tna, trainingOptionRows] = await Promise.all([
    prisma.tna.findUnique({
      where: { id: Number(id) },
      include: { user: { include: { department: true } }, items: { orderBy: { order: "asc" } } },
    }),
    prisma.tnaTrainingOption.findMany({ orderBy: { order: "asc" } }),
  ]);

  if (!tna) {
    notFound();
  }
  const trainingOptions = buildTrainingOptionsMap(trainingOptionRows);

  const initial: TnaFormState = emptyTnaFormState();
  for (const item of tna.items) {
    initial[item.section].push({
      problem: item.problemStatement,
      training: item.training,
      trainingOther: "",
      target: item.targetSkill,
      current: item.currentSkill,
      type: item.trainingType,
      month: item.monthApply,
    });
  }

  return (
    <div>
      <Link href="/tna" className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-4">
        <ArrowLeft size={15} /> Back to TNA Records
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            {tna.user.staffName} ({tna.user.staffNo}) — {tna.year}
          </h2>
          <p className="text-xs text-text-muted mt-1">{tna.user.department?.name ?? "—"}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={
              tna.status === "APPROVED"
                ? "inline-flex rounded-full bg-primary/10 text-primary-dark text-xs font-medium px-3 py-1.5"
                : "inline-flex rounded-full bg-purple/10 text-purple text-xs font-medium px-3 py-1.5"
            }
          >
            {TNA_STATUS_LABELS[tna.status]}
          </span>
          {tna.status === "PENDING" && (
            <PmeActionButton
              label="Approve TNA"
              confirmMessage="Approve this TNA record?"
              onAction={async () => {
                "use server";
                await approveTna(tna.id);
              }}
            />
          )}
        </div>
      </div>

      <TnaForm initial={initial} readOnly submitLabel="" trainingOptions={trainingOptions} />
    </div>
  );
}
