"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";
import { isPmeDue, getEvaluationPeriod } from "@/lib/pme";
import { RATING_BAND_RANGES, RATING_BAND_SHORT_LABELS } from "@/lib/labels";
import type { RatingBand } from "@/generated/prisma/client";

function ratingFields(formData: FormData, prefix: string, questionLabel: string) {
  const rating = (String(formData.get(`${prefix}Rating`) ?? "") || null) as RatingBand | null;
  const percentText = String(formData.get(`${prefix}Percent`) ?? "").trim();
  const parsedNumber = percentText.match(/\d+(\.\d+)?/)?.[0];
  const percentNumber = parsedNumber ? Number(parsedNumber) : null;

  if (rating && percentNumber != null) {
    const [min, max] = RATING_BAND_RANGES[rating];
    if (percentNumber < min || percentNumber > max) {
      throw new Error(
        `"${questionLabel}": ${percentNumber}% doesn't match "${RATING_BAND_SHORT_LABELS[rating]}" — must be between ${min}% and ${max}%.`
      );
    }
  }

  return {
    rating,
    percentText: percentText || null,
    percentNumber,
    remark: String(formData.get(`${prefix}Remark`) ?? "").trim() || null,
  };
}

/**
 * The assigned supervisor fills in and submits the evaluation in one step —
 * no separate participant agreement or admin verification.
 */
export async function evaluatePme(pmeId: number, formData: FormData) {
  const session = await requireSession();
  const pme = await prisma.pme.findUniqueOrThrow({
    where: { id: pmeId },
    include: { training: true },
  });

  if (pme.supervisorId !== session.userId) {
    throw new Error("Only this staff member's supervisor can evaluate this PME.");
  }
  if (pme.status !== "PENDING") {
    throw new Error("This PME has already been evaluated.");
  }
  if (!isPmeDue(pme.training.endDate)) {
    throw new Error("This PME is not due yet.");
  }

  const level = ratingFields(formData, "level", "Knowledge Sharing / OJT");
  const level2 = ratingFields(formData, "level2", "Learning");
  const behavioral = ratingFields(formData, "behavioral", "Behavior");
  const result = ratingFields(formData, "result", "Results");

  const percentNumbers = [level.percentNumber, level2.percentNumber, behavioral.percentNumber, result.percentNumber].filter(
    (p): p is number => p != null
  );
  const totalMark = percentNumbers.length
    ? Math.round(percentNumbers.reduce((sum, p) => sum + p, 0))
    : null;
  const averageMark = percentNumbers.length
    ? percentNumbers.reduce((sum, p) => sum + p, 0) / percentNumbers.length
    : null;

  const ojtConductedRaw = String(formData.get("ojtConducted") ?? "");
  const period = getEvaluationPeriod(pme.training.endDate);

  await prisma.pme.update({
    where: { id: pmeId },
    data: {
      fromDate: period.start,
      toDate: period.end,
      ojtConducted: ojtConductedRaw ? ojtConductedRaw === "yes" : null,
      ojtDetails: String(formData.get("ojtDetails") ?? "").trim() || null,
      levelRating: level.rating,
      levelPercent: level.percentText,
      levelRemark: level.remark,
      levelRating2: level2.rating,
      levelPercent2: level2.percentText,
      levelRemark2: level2.remark,
      behavioralRating: behavioral.rating,
      behavioralPercent: behavioral.percentText,
      behavioralRemark: behavioral.remark,
      resultRating: result.rating,
      resultPercent: result.percentText,
      resultRemark: result.remark,
      totalMark,
      averageMark,
      status: "VERIFIED",
      evaluatedAt: new Date(),
    },
  });

  revalidatePath("/training/pme");
  revalidatePath(`/training/pme/${pmeId}`);
}
