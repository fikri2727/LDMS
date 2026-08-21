import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageTraining } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PROGRAM_LABELS } from "@/lib/labels";
import { computeDays, computeHours } from "@/lib/training-code";
import { getModuleEstimatedHours } from "@/lib/elearning";
import { MyTrainingTable, type MyTrainingRow } from "@/components/training/MyTrainingTable";

export default async function TrainingIndexPage() {
  const session = await requireSession();

  if (canManageTraining(session)) {
    redirect("/training/public");
  }

  const [trainings, ojts, elearningAssignments, elearningCompletions] = await Promise.all([
    prisma.training.findMany({
      where: { participations: { some: { userId: session.userId } } },
      include: { participations: { where: { userId: session.userId } } },
      orderBy: { startDate: "desc" },
    }),
    prisma.ojt.findMany({
      where: { participants: { some: { userId: session.userId } } },
      include: { participants: { where: { userId: session.userId } } },
      orderBy: { startDate: "desc" },
    }),
    prisma.elearningAssignment.findMany({
      where: { userId: session.userId },
      include: { module: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.elearningCompletion.findMany({
      where: { userId: session.userId },
      include: { certificate: true, module: true },
    }),
  ]);

  // Build from the union of assignments and completions — a completed module's
  // assignment may since have been removed by an admin, but the completion record
  // (and the hours/credit for it) must still show up here.
  const assignmentByModuleId = new Map(elearningAssignments.map((a) => [a.moduleId, a]));
  const completionByModuleId = new Map(elearningCompletions.map((c) => [c.moduleId, c]));
  const elearningModuleIds = new Set([...assignmentByModuleId.keys(), ...completionByModuleId.keys()]);
  const elearningRows: MyTrainingRow[] = await Promise.all(
    [...elearningModuleIds].map(async (moduleId): Promise<MyTrainingRow> => {
      const assignment = assignmentByModuleId.get(moduleId);
      const completion = completionByModuleId.get(moduleId);
      const title = assignment?.module.title ?? completion?.module.title ?? "Untitled Module";
      const hours = await getModuleEstimatedHours(moduleId);
      const date = (completion?.completedAt ?? assignment?.createdAt ?? new Date()).toISOString();
      return {
        id: moduleId,
        type: "elearning",
        program: "E-Learning",
        title,
        href: `/elearning/learner/modules/${moduleId}`,
        startDate: date,
        endDate: date,
        hoursPerDay: hours,
        totalHours: hours,
        status: completion ? "COMPLETED" : "PENDING",
        evaluateHref: null,
        editHref: null,
        certificateHref: completion?.certificate ? `/elearning/learner/certificates/${completion.certificate.id}` : null,
      };
    })
  );

  const rows: MyTrainingRow[] = [
    ...trainings.map((t): MyTrainingRow => {
      const participation = t.participations[0];
      const hoursPerDay = computeHours(t.startTime, t.endTime);
      return {
        id: t.id,
        type: "training",
        program: PROGRAM_LABELS[t.program],
        title: t.title,
        href: `/training/public/${t.id}`,
        startDate: t.startDate.toISOString(),
        endDate: t.endDate.toISOString(),
        hoursPerDay,
        totalHours: computeDays(t.startDate, t.endDate) * hoursPerDay,
        status: participation?.attendance ?? "PENDING",
        evaluateHref:
          participation && participation.attendance === "PENDING"
            ? `/training/public/${t.id}/survey/${participation.id}`
            : null,
        editHref: null,
        certificateHref: null,
      };
    }),
    ...ojts.map((o): MyTrainingRow => {
      const participant = o.participants[0];
      const status = participant?.attendance ?? "PENDING";
      const isOwner = o.createdByUserId === session.userId;
      return {
        id: o.id,
        type: "ojt",
        program: "OJT",
        title: o.title,
        href: `/training/ojt/${o.id}`,
        startDate: o.startDate.toISOString(),
        endDate: o.endDate.toISOString(),
        hoursPerDay: o.totalHour,
        totalHours: o.totalDay * o.totalHour,
        status,
        evaluateHref:
          participant && status === "PENDING" ? `/training/ojt/${o.id}/survey/${participant.id}` : null,
        editHref: isOwner ? `/training/ojt/${o.id}/edit` : null,
        certificateHref: null,
      };
    }),
    ...elearningRows,
  ].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-text-muted text-sm">{rows.length} training record(s)</p>
        <Link
          href="/training/ojt/new"
          className="flex items-center gap-1.5 rounded-xl bg-primary-dark hover:bg-primary text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          <Plus size={16} /> Add My OJT
        </Link>
      </div>
      <MyTrainingTable rows={rows} />
    </div>
  );
}
