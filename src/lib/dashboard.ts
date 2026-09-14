import { prisma } from "@/lib/prisma";
import { computeDays, computeHours } from "@/lib/training-code";
import { getModuleEstimatedHours } from "@/lib/elearning";
import { PROGRAM_LABELS } from "@/lib/labels";

export interface DateRange {
  start: Date;
  end: Date;
}

export function defaultYearRange(): DateRange {
  const year = new Date().getUTCFullYear();
  return { start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year, 11, 31)) };
}

/** Company-wide L&D KPI: every department should average this many training hours per active staff member, per year. */
export const ANNUAL_DEPARTMENT_HOUR_TARGET = 24;

/** Pro-rates the annual hour target to the length of the selected date range, so a narrower filter doesn't read as "below target" unfairly. */
export function departmentHourTargetForRange(range: DateRange): number {
  const days = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000) + 1);
  return Math.round(((ANNUAL_DEPARTMENT_HOUR_TARGET * days) / 365) * 100) / 100;
}

async function loadTrainings(range: DateRange) {
  return prisma.training.findMany({
    where: { startDate: { gte: range.start }, endDate: { lte: range.end } },
    include: { participations: { include: { user: true } } },
  });
}

async function loadOjts(range: DateRange) {
  return prisma.ojt.findMany({
    where: { startDate: { gte: range.start }, endDate: { lte: range.end } },
    include: { participants: { include: { user: true } } },
  });
}

function trainingSessionHours(t: { startDate: Date; endDate: Date; startTime: string; endTime: string }) {
  return computeDays(t.startDate, t.endDate) * computeHours(t.startTime, t.endTime);
}

/** Org-wide "hours" must match the Man Hours figure shown on the admin Training Records
 * table: session length × how many participants actually completed it — not just the
 * session's own duration, which would undercount a session with many attendees. */
function trainingManHours(t: {
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  participations: { attendance: string }[];
}) {
  const completed = t.participations.filter((p) => p.attendance === "COMPLETED").length;
  return trainingSessionHours(t) * completed;
}

/** Matches the admin OJT Records table's Man Hour figure: session length × how
 * many participants actually completed it — not just the session's own
 * duration, which would undercount a session with many attendees. */
function ojtManHours(o: { totalDay: number; totalHour: number; participants: { attendance: string }[] }) {
  const completed = o.participants.filter((p) => p.attendance === "COMPLETED").length;
  return o.totalDay * o.totalHour * completed;
}

/** Completed E-Learning modules count toward the dashboard totals too: each
 * completion is one "training" on one "day" (matching the My Training table,
 * where an e-learning row is a single-day event), plus its estimated hours. */
async function loadElearningTotals(range: DateRange, userId?: number) {
  const completions = await prisma.elearningCompletion.findMany({
    where: {
      completedAt: { gte: range.start, lte: range.end },
      ...(userId ? { userId } : {}),
    },
    select: { moduleId: true },
  });

  const hoursByModule = new Map<number, number>();
  let hours = 0;
  for (const c of completions) {
    let h = hoursByModule.get(c.moduleId);
    if (h === undefined) {
      h = await getModuleEstimatedHours(c.moduleId);
      hoursByModule.set(c.moduleId, h);
    }
    hours += h;
  }
  return { hours, count: completions.length };
}

export async function getOverview(range: DateRange, userId?: number) {
  const [allTrainings, allOjts] = await Promise.all([loadTrainings(range), loadOjts(range)]);

  const trainings = userId
    ? allTrainings.filter((t) => t.participations.some((p) => p.userId === userId))
    : allTrainings;
  const ojts = userId ? allOjts.filter((o) => o.participants.some((p) => p.userId === userId)) : allOjts;

  const elearning = await loadElearningTotals(range, userId);

  const totalTraining = trainings.length + ojts.length + elearning.count;

  const completedUsers = new Set<number>();
  for (const t of trainings) {
    for (const p of t.participations) {
      if (userId && p.userId !== userId) continue;
      if (p.attendance === "COMPLETED" && p.user.status === "ACTIVE") completedUsers.add(p.userId);
    }
  }
  for (const o of ojts) {
    for (const p of o.participants) {
      if (userId && p.userId !== userId) continue;
      if (p.attendance === "COMPLETED" && p.user.status === "ACTIVE") completedUsers.add(p.userId);
    }
  }

  let totalDay = 0;
  let totalHour = 0;
  for (const t of trainings) {
    totalDay += computeDays(t.startDate, t.endDate);
    totalHour += userId ? trainingSessionHours(t) : trainingManHours(t);
  }
  for (const o of ojts) {
    totalDay += o.totalDay;
    totalHour += userId ? o.totalHour : ojtManHours(o);
  }
  totalDay += elearning.count;
  totalHour += elearning.hours;

  return {
    totalTraining,
    totalUser: completedUsers.size,
    totalDay,
    totalHour: Math.round(totalHour * 100) / 100,
  };
}

export async function getPublicVsOjtSplit(range: DateRange, userId?: number) {
  const [allTrainings, allOjts] = await Promise.all([loadTrainings(range), loadOjts(range)]);

  const trainings = userId
    ? allTrainings.filter((t) => t.participations.some((p) => p.userId === userId))
    : allTrainings;
  const ojts = userId ? allOjts.filter((o) => o.participants.some((p) => p.userId === userId)) : allOjts;

  const publicManHours = trainings.reduce(
    (sum, t) => sum + (userId ? trainingSessionHours(t) : trainingManHours(t)),
    0
  );
  const ojtTotalHours = ojts.reduce((sum, o) => sum + (userId ? o.totalDay * o.totalHour : ojtManHours(o)), 0);
  const elearning = await loadElearningTotals(range, userId);

  return [
    { name: "Public / Inhouse", value: Math.round(publicManHours * 100) / 100 },
    { name: "OJT", value: Math.round(ojtTotalHours * 100) / 100 },
    { name: "E-Learning", value: Math.round(elearning.hours * 100) / 100 },
  ];
}

const MONTH_LABELS = ["JAN", "FEB", "MAC", "APR", "MEI", "JUN", "JUL", "OGO", "SEP", "OKT", "NOV", "DIS"];

export async function getMonthlyCost(range: DateRange) {
  const trainings = await loadTrainings(range);
  const totals = new Array(12).fill(0);
  for (const t of trainings) {
    totals[t.startDate.getMonth()] += t.cost;
  }
  return MONTH_LABELS.map((label, i) => ({ month: label, cost: Math.round(totals[i] * 100) / 100 }));
}

export async function getTop5Trainers(range: DateRange, userId?: number) {
  const [allTrainings, allOjts] = await Promise.all([loadTrainings(range), loadOjts(range)]);

  const trainings = userId
    ? allTrainings.filter((t) => t.participations.some((p) => p.userId === userId))
    : allTrainings;
  const ojts = userId ? allOjts.filter((o) => o.participants.some((p) => p.userId === userId)) : allOjts;

  const hoursByTrainer = new Map<string, number>();
  for (const t of trainings) {
    const hours = computeDays(t.startDate, t.endDate) * computeHours(t.startTime, t.endTime);
    hoursByTrainer.set(t.trainer, (hoursByTrainer.get(t.trainer) ?? 0) + hours);
  }
  for (const o of ojts) {
    const hours = o.totalDay * o.totalHour;
    hoursByTrainer.set(o.trainerName, (hoursByTrainer.get(o.trainerName) ?? 0) + hours);
  }

  return [...hoursByTrainer.entries()]
    .map(([trainer, totalHour]) => ({ trainer, totalHour: Math.round(totalHour * 100) / 100 }))
    .sort((a, b) => b.totalHour - a.totalHour)
    .slice(0, 5);
}

export interface RecentTrainingRecord {
  id: string;
  type: "training" | "ojt" | "elearning";
  program: string;
  title: string;
  date: string;
  status: "COMPLETED" | "PENDING" | "ABSENT";
  hours: number;
  href: string;
}

/** A staff member's most recent training activity across Public/Inhouse, OJT,
 * and E-Learning, merged and sorted by date — independent of the Dashboard's
 * date-range filter, since "recent" should always mean recent. */
export async function getRecentTrainingRecords(userId: number, limit = 5): Promise<RecentTrainingRecord[]> {
  const [participations, ojtParticipations, completions] = await Promise.all([
    prisma.participation.findMany({
      where: { userId },
      include: { training: true },
      orderBy: { training: { startDate: "desc" } },
      take: limit,
    }),
    prisma.participateOjt.findMany({
      where: { userId },
      include: { ojt: true },
      orderBy: { ojt: { startDate: "desc" } },
      take: limit,
    }),
    prisma.elearningCompletion.findMany({
      where: { userId },
      include: { module: true },
      orderBy: { completedAt: "desc" },
      take: limit,
    }),
  ]);

  const trainingRows: RecentTrainingRecord[] = participations.map((p) => ({
    id: `training-${p.id}`,
    type: "training",
    program: PROGRAM_LABELS[p.training.program] ?? p.training.program,
    title: p.training.title,
    date: p.training.startDate.toISOString(),
    status: p.attendance,
    hours: computeDays(p.training.startDate, p.training.endDate) * computeHours(p.training.startTime, p.training.endTime),
    href: `/training/public/${p.trainingId}`,
  }));

  const ojtRows: RecentTrainingRecord[] = ojtParticipations.map((p) => ({
    id: `ojt-${p.id}`,
    type: "ojt",
    program: "OJT",
    title: p.ojt.title,
    date: p.ojt.startDate.toISOString(),
    status: p.attendance,
    hours: p.ojt.totalDay * p.ojt.totalHour,
    href: `/training/ojt/${p.ojtId}`,
  }));

  const elearningRows: RecentTrainingRecord[] = await Promise.all(
    completions.map(async (c) => ({
      id: `elearning-${c.id}`,
      type: "elearning" as const,
      program: "E-Learning",
      title: c.module.title,
      date: c.completedAt.toISOString(),
      status: "COMPLETED" as const,
      hours: await getModuleEstimatedHours(c.moduleId),
      href: `/elearning/learner/modules/${c.moduleId}`,
    }))
  );

  return [...trainingRows, ...ojtRows, ...elearningRows]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

/** Personal monthly hours breakdown for a staff member's own Dashboard — sums their
 * Public/Inhouse, OJT, and E-Learning hours per month across the selected range. */
export async function getMonthlyHoursForUser(range: DateRange, userId: number) {
  const [allTrainings, allOjts, elearningCompletions] = await Promise.all([
    loadTrainings(range),
    loadOjts(range),
    prisma.elearningCompletion.findMany({
      where: { userId, completedAt: { gte: range.start, lte: range.end } },
      select: { moduleId: true, completedAt: true },
    }),
  ]);

  const totals = new Array(12).fill(0);

  for (const t of allTrainings) {
    if (!t.participations.some((p) => p.userId === userId)) continue;
    totals[t.startDate.getMonth()] += trainingSessionHours(t);
  }
  for (const o of allOjts) {
    if (!o.participants.some((p) => p.userId === userId)) continue;
    totals[o.startDate.getMonth()] += o.totalDay * o.totalHour;
  }
  for (const c of elearningCompletions) {
    totals[c.completedAt.getMonth()] += await getModuleEstimatedHours(c.moduleId);
  }

  return MONTH_LABELS.map((label, i) => ({ month: label, hours: Math.round(totals[i] * 100) / 100 }));
}

export async function getDepartmentBreakdown(range: DateRange, departmentId?: number) {
  const [trainings, ojts] = await Promise.all([loadTrainings(range), loadOjts(range)]);

  const manHourByDept = new Map<string, number>();

  function addDept(deptName: string, manHours: number) {
    manHourByDept.set(deptName, (manHourByDept.get(deptName) ?? 0) + manHours);
  }

  for (const t of trainings) {
    const dayHour = computeDays(t.startDate, t.endDate) * computeHours(t.startTime, t.endTime);
    for (const p of t.participations) {
      if (p.attendance !== "COMPLETED" || p.user.status !== "ACTIVE") continue;
      if (departmentId && p.user.departmentId !== departmentId) continue;
      const deptName = p.user.departmentId ? String(p.user.departmentId) : "Unassigned";
      addDept(deptName, dayHour);
    }
  }
  for (const o of ojts) {
    const dayHour = o.totalDay * o.totalHour;
    for (const p of o.participants) {
      if (p.attendance !== "COMPLETED" || p.user.status !== "ACTIVE") continue;
      if (departmentId && p.user.departmentId !== departmentId) continue;
      const deptName = p.user.departmentId ? String(p.user.departmentId) : "Unassigned";
      addDept(deptName, dayHour * p.totalMan);
    }
  }

  const departments = await prisma.department.findMany({
    where: departmentId ? { id: departmentId } : undefined,
    select: { id: true, name: true, shortName: true, _count: { select: { users: { where: { status: "ACTIVE" } } } } },
  });
  const deptLabel = new Map(departments.map((d) => [String(d.id), d.shortName || d.name]));
  // Denominator is every active staff member in the department (not just the
  // ones who happened to train) — that's what makes the average meaningful
  // as a "did the whole department hit the target" KPI, not just an average
  // among participants.
  const staffCountByDeptId = new Map(departments.map((d) => [String(d.id), d._count.users]));

  return departments
    .map((d) => {
      const deptId = String(d.id);
      const manHour = manHourByDept.get(deptId) ?? 0;
      const staffCount = staffCountByDeptId.get(deptId) ?? 0;
      return {
        department: deptLabel.get(deptId) ?? deptId,
        departmentFullName: d.name,
        manHour: Math.round(manHour * 100) / 100,
        staffCount,
        avgHour: staffCount > 0 ? Math.round((manHour / staffCount) * 100) / 100 : 0,
      };
    })
    .sort((a, b) => a.avgHour - b.avgHour);
}
