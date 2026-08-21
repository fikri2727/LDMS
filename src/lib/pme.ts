import { addMonths, addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { PME_ELIGIBLE_DESIGNATIONS } from "@/lib/labels";

/** PME becomes actionable by the supervisor this many months after the training ends. */
export const PME_WAIT_MONTHS = 3;

/** Due 3 months after the day following the training's completion date. */
export function getPmeDueDate(trainingEndDate: Date) {
  return addMonths(addDays(trainingEndDate, 1), PME_WAIT_MONTHS);
}

/** The evaluation observation window: day after training ends → due date. */
export function getEvaluationPeriod(trainingEndDate: Date) {
  return { start: addDays(trainingEndDate, 1), end: getPmeDueDate(trainingEndDate) };
}

export function isPmeDue(trainingEndDate: Date, now: Date = new Date()) {
  return now >= getPmeDueDate(trainingEndDate);
}

/** Whether this user has at least one active direct report — gates the PME nav/tab for staff. */
export async function isSupervisor(userId: number) {
  return (await prisma.user.count({ where: { supervisorId: userId, status: "ACTIVE" } })) > 0;
}

/**
 * Once a Public/Inhouse participation is marked COMPLETED, an eligible
 * (Executive/Manager) participant gets a PME record created right away, but
 * it only becomes actionable by their supervisor 3 months after the training
 * ends (see isPmeDue). The supervisor is snapshotted from the participant's
 * profile (User.supervisorId) at creation time.
 */
export async function maybeCreatePme(participationId: number) {
  const participation = await prisma.participation.findUniqueOrThrow({
    where: { id: participationId },
    include: { user: { include: { department: true } }, training: true },
  });

  if (!PME_ELIGIBLE_DESIGNATIONS.includes(participation.user.designation)) return;

  const existing = await prisma.pme.findUnique({ where: { participationId } });
  if (existing) return;

  await prisma.pme.create({
    data: {
      trainingId: participation.trainingId,
      participationId: participation.id,
      userId: participation.userId,
      supervisorId: participation.user.supervisorId,
      designation: participation.user.designation,
      staffName: participation.user.staffName,
      staffNo: participation.user.staffNo,
      department: participation.user.department?.name ?? "",
      trainingTitle: participation.training.title,
      status: "PENDING",
    },
  });
}
