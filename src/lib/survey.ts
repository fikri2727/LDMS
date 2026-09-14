import { prisma } from "@/lib/prisma";
import { maybeCreatePme } from "@/lib/pme";

/**
 * Resolves a QR check-in Staff ID to a Participation for the given training,
 * auto-enrolling the staff member as a participant if they're a valid active
 * staff record but weren't pre-added by an admin. Returns null if staffNo
 * doesn't match any active staff — there's nothing to attach an evaluation
 * to in that case. Kept out of any "use server" file for the same reason as
 * applySurveyAnswers: every export of one becomes a network-callable action,
 * and this one mutates data (creates a Participation) on a no-login path.
 */
export async function findOrCreateCheckinParticipation(trainingId: number, staffNo: string) {
  const user = await prisma.user.findUnique({ where: { staffNo } });
  if (!user || user.status === "RESIGN") return null;

  const participation = await prisma.participation.upsert({
    where: { trainingId_userId: { trainingId, userId: user.id } },
    update: {},
    create: { trainingId, userId: user.id },
  });

  return { participation, user };
}

/**
 * Applies the rating/free-text answers from a submitted survey FormData to a
 * Participation row and marks it COMPLETED. Shared by the authenticated
 * survey action (submitSurvey) and the public QR check-in action
 * (submitPublicSurvey). Callers are responsible for authorization — this
 * helper does none, and must NEVER be exported from a "use server" file,
 * since every export from one becomes a directly network-callable action.
 */
export async function applySurveyAnswers(participationId: number, formData: FormData) {
  function rating(key: string) {
    const v = formData.get(key);
    return v ? Number(v) : null;
  }

  await prisma.participation.update({
    where: { id: participationId },
    data: {
      courseRelevance: rating("courseRelevance"),
      practicalExercises: rating("practicalExercises"),
      sufficientTime: rating("sufficientTime"),
      trainerEffectiveness: rating("trainerEffectiveness"),
      courseEffectiveness: rating("courseEffectiveness"),
      whatLearnt: String(formData.get("whatLearnt") ?? "").trim(),
      actionPlan: String(formData.get("actionPlan") ?? "").trim(),
      commentSuggestions: String(formData.get("commentSuggestions") ?? "").trim(),
      attendance: "COMPLETED",
    },
  });

  await maybeCreatePme(participationId);
}

/**
 * OJT counterpart of findOrCreateCheckinParticipation — resolves a QR
 * check-in Staff ID to a ParticipateOjt row for the given OJT session,
 * auto-enrolling the staff member (with a denormalized department snapshot,
 * matching addOjtParticipant's convention) if they weren't already added by
 * an admin/clerk. Returns null if staffNo doesn't match any active staff.
 */
export async function findOrCreateOjtCheckinParticipation(ojtId: number, staffNo: string) {
  const user = await prisma.user.findUnique({ where: { staffNo }, include: { department: true } });
  if (!user || user.status === "RESIGN") return null;

  const participation = await prisma.participateOjt.upsert({
    where: { ojtId_userId: { ojtId, userId: user.id } },
    update: {},
    create: {
      ojtId,
      userId: user.id,
      department: user.department?.shortName ?? user.department?.name ?? null,
    },
  });

  return { participation, user };
}

/**
 * Applies the OJT before/after skill survey answers to a ParticipateOjt row
 * and marks it COMPLETED. Shared by the authenticated self-service action
 * (submitOjtSurvey) and the public QR check-in action (submitPublicOjtSurvey).
 * Must never be exported from a "use server" file — see applySurveyAnswers.
 */
export async function applyOjtSurveyAnswers(participationId: number, formData: FormData) {
  await prisma.participateOjt.update({
    where: { id: participationId },
    data: {
      q1: String(formData.get("q1") ?? "").trim().toUpperCase(),
      q2: Number(formData.get("q2")) || null,
      q3: Number(formData.get("q3")) || null,
      attendance: "COMPLETED",
    },
  });
}
