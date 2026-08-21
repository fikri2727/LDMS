import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { requireSession } from "@/lib/guard";
import { canManageStaff } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { StaffTrainingRecordTable, type StaffTrainingRecordRow } from "@/components/staff/StaffTrainingRecordTable";
import { FUNCTION_LABELS } from "@/lib/labels";
import { computeDays, computeHours } from "@/lib/training-code";
import { getModuleEstimatedHours } from "@/lib/elearning";

export default async function StaffTrainingRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!canManageStaff(session)) redirect("/dashboard");

  const { id } = await params;
  const staffId = Number(id);

  const [staff, trainings, ojts, elearningAssignments, elearningCompletions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: staffId },
      include: { department: true },
    }),
    prisma.training.findMany({
      where: { participations: { some: { userId: staffId } } },
      include: { participations: { where: { userId: staffId } } },
      orderBy: { startDate: "desc" },
    }),
    prisma.ojt.findMany({
      where: { participants: { some: { userId: staffId } } },
      include: { participants: { where: { userId: staffId } } },
      orderBy: { startDate: "desc" },
    }),
    prisma.elearningAssignment.findMany({
      where: { userId: staffId },
      include: { module: { include: { category: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.elearningCompletion.findMany({
      where: { userId: staffId },
      include: { module: { include: { category: true } } },
    }),
  ]);

  if (!staff) notFound();

  // Build from the union of assignments and completions — a completed module's
  // assignment may since have been removed by an admin, but the completion record
  // (and the hours/credit for it) must still show up here.
  const assignmentByModuleId = new Map(elearningAssignments.map((a) => [a.moduleId, a]));
  const completionByModuleId = new Map(elearningCompletions.map((c) => [c.moduleId, c]));
  const elearningModuleIds = new Set([...assignmentByModuleId.keys(), ...completionByModuleId.keys()]);
  const elearningRows: StaffTrainingRecordRow[] = await Promise.all(
    [...elearningModuleIds].map(async (moduleId): Promise<StaffTrainingRecordRow> => {
      const assignment = assignmentByModuleId.get(moduleId);
      const completion = completionByModuleId.get(moduleId);
      const module_ = assignment?.module ?? completion?.module;
      const hours = await getModuleEstimatedHours(moduleId);
      const date = completion?.completedAt ?? assignment?.createdAt ?? new Date();
      return {
        id: moduleId,
        type: "elearning",
        title: module_?.title ?? "Untitled Module",
        href: `/elearning/admin/modules/${moduleId}`,
        typeLabel: "E-Learning",
        functionLabel: module_?.category?.name ?? "—",
        startDate: date,
        endDate: date,
        venue: "Online",
        status: completion ? "COMPLETED" : "PENDING",
        totalHours: hours,
      };
    })
  );

  const trainingRows: StaffTrainingRecordRow[] = trainings.map((t) => {
    const participation = t.participations[0];
    const hoursPerDay = computeHours(t.startTime, t.endTime);
    return {
      id: t.id,
      type: "training",
      title: t.title,
      href: `/training/public/${t.id}`,
      typeLabel: "Public/Inhouse",
      functionLabel: FUNCTION_LABELS[t.function],
      startDate: t.startDate,
      endDate: t.endDate,
      venue: t.venue,
      status: participation?.attendance ?? "PENDING",
      totalHours: computeDays(t.startDate, t.endDate) * hoursPerDay,
    };
  });
  const ojtRows: StaffTrainingRecordRow[] = ojts.map((o) => {
    const participant = o.participants[0];
    return {
      id: o.id,
      type: "ojt",
      title: o.title,
      href: `/training/ojt/${o.id}`,
      typeLabel: "OJT",
      functionLabel: "—",
      startDate: o.startDate,
      endDate: o.endDate,
      venue: o.venue,
      status: participant?.attendance ?? "PENDING",
      totalHours: o.totalDay * o.totalHour,
    };
  });
  const rows = [...trainingRows, ...ojtRows, ...elearningRows].sort(
    (a, b) => b.startDate.getTime() - a.startDate.getTime()
  );

  return (
    <div>
      <Link href="/staff" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary mb-4">
        <ArrowLeft size={15} /> Back to Staff List
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{staff.staffName}</h1>
          <p className="text-sm text-text-muted mt-1">
            {staff.staffNo} · {staff.department?.name ?? "—"}
          </p>
        </div>
        <Link
          href={`/staff/${staff.id}`}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-surface text-text-secondary text-sm font-medium px-4 py-2 hover:bg-gray-50 transition-colors"
        >
          <Pencil size={14} /> Edit Staff
        </Link>
      </div>

      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
        Training Record ({rows.length})
      </h2>
      <StaffTrainingRecordTable rows={rows} />
    </div>
  );
}
