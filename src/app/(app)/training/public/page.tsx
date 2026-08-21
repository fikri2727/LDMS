import Link from "next/link";
import { requireSession } from "@/lib/guard";
import { canManageTraining } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PROGRAM_LABELS } from "@/lib/labels";
import { computeDays, computeHours } from "@/lib/training-code";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { TrainingRecordsTable, type TrainingRow } from "@/components/training/TrainingRecordsTable";
import {
  DownloadTrainingReportButton,
  type OjtReportRow,
  type PublicParticipantRow,
} from "@/components/training/DownloadTrainingReportButton";

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100;
}

export default async function PublicTrainingListPage() {
  const session = await requireSession();
  const manage = canManageTraining(session);

  const trainings = await prisma.training.findMany({
    where: manage ? undefined : { participations: { some: { userId: session.userId } } },
    orderBy: { startDate: "desc" },
    include: {
      participations: {
        include: { pme: true, user: { include: { department: true } } },
      },
    },
  });

  if (manage) {
    const rows: TrainingRow[] = trainings.map((t) => {
      const totalDays = computeDays(t.startDate, t.endDate);
      const totalHours = computeHours(t.startTime, t.endTime);
      const par = t.participations.length;
      const comp = t.participations.filter((p) => p.attendance === "COMPLETED").length;
      const pend = t.participations.filter((p) => p.attendance === "PENDING").length;
      const abs = t.participations.filter((p) => p.attendance === "ABSENT").length;
      const pmeRecords = t.participations.map((p) => p.pme).filter((pme) => pme != null);
      const pmeComp = pmeRecords.filter((pme) => pme.status === "VERIFIED").length;
      const pmePend = pmeRecords.length - pmeComp;

      return {
        id: t.id,
        trainingCode: t.trainingCode,
        title: t.title,
        program: t.program,
        startDate: t.startDate.toISOString(),
        endDate: t.endDate.toISOString(),
        startTime: t.startTime,
        endTime: t.endTime,
        hrdcClaimable: t.hrdcClaimable,
        platform: t.platform,
        function: t.function,
        cost: t.cost,
        totalDays,
        totalHours,
        totalManHours: Math.round(totalDays * totalHours * comp * 100) / 100,
        par,
        comp,
        pend,
        abs,
        pmeComp,
        pmePend,
      };
    });

    const participantRows: PublicParticipantRow[] = trainings.flatMap((t) =>
      t.participations.map((p) => ({
        trainingCode: t.trainingCode,
        trainingTitle: t.title,
        program: t.program,
        startDate: t.startDate.toISOString(),
        endDate: t.endDate.toISOString(),
        platform: t.platform,
        function: t.function,
        cost: t.cost,
        staffNo: p.user.staffNo,
        staffName: p.user.staffName,
        department: p.user.department?.name ?? "—",
        designation: p.user.designation,
        attendance: p.attendance,
        courseRelevance: p.courseRelevance,
        practicalExercises: p.practicalExercises,
        sufficientTime: p.sufficientTime,
        trainerEffectiveness: p.trainerEffectiveness,
        courseEffectiveness: p.courseEffectiveness,
        whatLearnt: p.whatLearnt,
        actionPlan: p.actionPlan,
        commentSuggestions: p.commentSuggestions,
        pmeStatus: p.pme?.status ?? null,
        pmeLevelRating: p.pme?.levelRating ?? null,
        pmeBehavioralRating: p.pme?.behavioralRating ?? null,
        pmeResultRating: p.pme?.resultRating ?? null,
        pmeTotalMark: p.pme?.totalMark ?? null,
        pmeAverageMark: p.pme?.averageMark ?? null,
      }))
    );

    const ojts = await prisma.ojt.findMany({
      orderBy: { startDate: "desc" },
      include: { participants: true },
    });

    const ojtRows: OjtReportRow[] = ojts.map((o) => {
      const par = o.participants.length;
      const comp = o.participants.filter((p) => p.attendance === "COMPLETED").length;
      const pend = o.participants.filter((p) => p.attendance === "PENDING").length;
      const abs = o.participants.filter((p) => p.attendance === "ABSENT").length;
      const skillBefore = o.participants.map((p) => p.q2).filter((v): v is number => v != null);
      const skillAfter = o.participants.map((p) => p.q3).filter((v): v is number => v != null);
      const avgSkillBefore = average(skillBefore);
      const avgSkillAfter = average(skillAfter);

      return {
        id: o.id,
        trainingCode: o.trainingCode,
        title: o.title,
        trainerType: o.trainerType,
        trainerName: o.trainerName,
        startDate: o.startDate.toISOString(),
        endDate: o.endDate.toISOString(),
        startTime: o.startTime,
        endTime: o.endTime,
        totalDay: o.totalDay,
        totalHour: o.totalHour,
        totalManHour: Math.round(o.totalDay * o.totalHour * par * 100) / 100,
        par,
        comp,
        pend,
        abs,
        avgSkillBefore,
        avgSkillAfter,
        avgSkillImprovement: avgSkillBefore != null && avgSkillAfter != null ? Math.round((avgSkillAfter - avgSkillBefore) * 100) / 100 : null,
      };
    });

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-text-muted text-sm">{trainings.length} training session(s)</p>
          <div className="flex items-center gap-2">
            <DownloadTrainingReportButton participantRows={participantRows} ojtRows={ojtRows} />
            <Link
              href="/training/public/new"
              className="flex items-center gap-1.5 rounded-xl bg-primary-dark hover:bg-primary text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              <Plus size={16} /> Add Training
            </Link>
          </div>
        </div>
        <TrainingRecordsTable rows={rows} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-text-muted text-sm">{trainings.length} training session(s)</p>
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-text-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Program</th>
              <th className="px-4 py-3 font-medium">Dates</th>
              <th className="px-4 py-3 font-medium">Venue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {trainings.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-text-muted font-mono text-xs">{t.trainingCode}</td>
                <td className="px-4 py-3">
                  <Link href={`/training/public/${t.id}`} className="text-primary-dark font-medium hover:underline">
                    {t.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary">{PROGRAM_LABELS[t.program]}</td>
                <td className="px-4 py-3 text-text-secondary">
                  {format(t.startDate, "d MMM yyyy")} – {format(t.endDate, "d MMM yyyy")}
                </td>
                <td className="px-4 py-3 text-text-secondary">{t.venue}</td>
              </tr>
            ))}
            {trainings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-text-muted">
                  No training sessions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
