"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";
import { canManageTraining } from "@/lib/rbac";
import { generateTrainingCode } from "@/lib/training-code";
import { maybeCreatePme } from "@/lib/pme";
import { saveUpload, deleteUpload } from "@/lib/uploads";
import type { Platform, TrainingFunction, TrainingProgram } from "@/generated/prisma/client";

async function requireTrainingAdmin() {
  const session = await requireSession();
  if (!canManageTraining(session)) {
    throw new Error("You do not have permission to manage training records.");
  }
  return session;
}

function readTrainingFields(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim().toUpperCase(),
    program: String(formData.get("program") ?? "") as TrainingProgram,
    cost: Number(formData.get("cost") ?? 0) || 0,
    platform: String(formData.get("platform") ?? "") as Platform,
    function: String(formData.get("function") ?? "") as TrainingFunction,
    venue: String(formData.get("venue") ?? "").trim().toUpperCase(),
    hrdcClaimable: formData.get("hrdcClaimable") === "on",
    startDate: new Date(String(formData.get("startDate"))),
    endDate: new Date(String(formData.get("endDate"))),
    startTime: String(formData.get("startTime") ?? "09:00"),
    endTime: String(formData.get("endTime") ?? "17:00"),
    trainer: String(formData.get("trainer") ?? "").trim().toUpperCase(),
  };
}

export async function createTraining(formData: FormData) {
  const session = await requireTrainingAdmin();
  const fields = readTrainingFields(formData);

  if (!fields.title || !fields.program || !fields.venue) {
    throw new Error("Title, Program, and Venue are required.");
  }

  const training = await prisma.training.create({
    data: { ...fields, trainingCode: "", createdByUserId: session.userId },
  });

  await prisma.training.update({
    where: { id: training.id },
    data: { trainingCode: generateTrainingCode(fields.program, training.id, fields.startDate) },
  });

  revalidatePath("/training/public");
  redirect(`/training/public/${training.id}`);
}

export async function updateTraining(id: number, formData: FormData) {
  await requireTrainingAdmin();
  const fields = readTrainingFields(formData);

  if (!fields.title || !fields.program || !fields.venue) {
    throw new Error("Title, Program, and Venue are required.");
  }

  await prisma.training.update({ where: { id }, data: fields });

  revalidatePath("/training/public");
  revalidatePath(`/training/public/${id}`);
}

export async function deleteTraining(id: number) {
  await requireTrainingAdmin();
  await prisma.training.delete({ where: { id } });
  revalidatePath("/training/public");
  redirect("/training/public");
}

export async function addParticipant(trainingId: number, formData: FormData) {
  await requireTrainingAdmin();
  const userId = Number(formData.get("userId"));
  if (!userId) throw new Error("Please select a staff member.");

  await prisma.participation.create({ data: { trainingId, userId } });
  revalidatePath(`/training/public/${trainingId}`);
}

export async function removeParticipant(trainingId: number, participationId: number) {
  await requireTrainingAdmin();
  await prisma.participation.delete({ where: { id: participationId } });
  revalidatePath(`/training/public/${trainingId}`);
}

export async function markAbsent(trainingId: number, participationId: number) {
  await requireTrainingAdmin();
  await prisma.participation.update({ where: { id: participationId }, data: { attendance: "ABSENT" } });
  revalidatePath(`/training/public/${trainingId}`);
}

export async function submitSurvey(trainingId: number, participationId: number, formData: FormData) {
  await requireSession();

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

  revalidatePath(`/training/public/${trainingId}`);
  revalidatePath("/training");
  redirect("/training");
}

export async function uploadCertificate(trainingId: number, formData: FormData) {
  const session = await requireTrainingAdmin();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Please choose a file to upload.");

  const filePath = await saveUpload("certificates", file);

  await prisma.certificate.create({
    data: {
      trainingId,
      fileName: file.name,
      filePath,
      uploadedByUserId: session.userId,
    },
  });

  revalidatePath(`/training/public/${trainingId}`);
}

export async function deleteCertificate(trainingId: number, certificateId: number) {
  await requireTrainingAdmin();
  const cert = await prisma.certificate.delete({ where: { id: certificateId } });
  await deleteUpload(cert.filePath);
  revalidatePath(`/training/public/${trainingId}`);
}
