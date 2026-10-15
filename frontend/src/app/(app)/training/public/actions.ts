"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError, toForm } from "@/lib/api";

export async function createTraining(formData: FormData) {
  const { id } = await api.post<{ id: number }>("/api/training/public", formData);
  revalidatePath("/training/public");
  redirect(`/training/public/${id}`);
}

export async function updateTraining(id: number, formData: FormData) {
  await api.post(`/api/training/public/${id}`, formData);
  revalidatePath("/training/public");
  revalidatePath(`/training/public/${id}`);
}

export async function deleteTraining(id: number) {
  await api.del(`/api/training/public/${id}`);
  revalidatePath("/training/public");
  redirect("/training/public");
}

export async function addParticipant(trainingId: number, formData: FormData) {
  await api.post(`/api/training/public/${trainingId}/participants`, formData);
  revalidatePath(`/training/public/${trainingId}`);
}

export async function removeParticipant(trainingId: number, participationId: number) {
  await api.del(`/api/training/public/${trainingId}/participants/${participationId}`);
  revalidatePath(`/training/public/${trainingId}`);
}

export async function markAbsent(trainingId: number, participationId: number) {
  await api.post(`/api/training/public/${trainingId}/participants/${participationId}/absent`);
  revalidatePath(`/training/public/${trainingId}`);
}

export async function submitSurvey(trainingId: number, participationId: number, formData: FormData) {
  await api.post(`/api/training/public/${trainingId}/participants/${participationId}/survey`, formData);
  revalidatePath(`/training/public/${trainingId}`);
  revalidatePath("/training");
  redirect("/training");
}

/** Admin filling in a participant's survey on their behalf -> back to the training's roster. */
export async function submitSurveyOnBehalf(trainingId: number, participationId: number, formData: FormData) {
  await api.post(`/api/training/public/${trainingId}/participants/${participationId}/survey`, formData);
  revalidatePath(`/training/public/${trainingId}`);
  redirect(`/training/public/${trainingId}`);
}

/** A note on a participant, e.g. why they were absent. Blank clears it. */
export async function setParticipantRemark(
  trainingId: number,
  participationId: number,
  remark: string
): Promise<{ error: string } | void> {
  try {
    await api.post(`/api/training/public/${trainingId}/participants/${participationId}/remark`, toForm({ remark }));
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/training/public/${trainingId}`);
  revalidatePath("/training/public");
}

/** Multi-day training: which days a participant attended. */
export async function setAttendedDays(
  trainingId: number,
  participationId: number,
  days: number[]
): Promise<{ error: string } | void> {
  const form = new FormData();
  for (const d of days) form.append("days", String(d));
  try {
    await api.post(`/api/training/public/${trainingId}/participants/${participationId}/days`, form);
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/training/public/${trainingId}`);
  revalidatePath("/training/public");
}

export async function uploadCertificate(trainingId: number, formData: FormData) {
  await api.post(`/api/training/public/${trainingId}/certificates`, formData);
  revalidatePath(`/training/public/${trainingId}`);
}

export async function deleteCertificate(trainingId: number, certificateId: number) {
  await api.del(`/api/training/public/${trainingId}/certificates/${certificateId}`);
  revalidatePath(`/training/public/${trainingId}`);
}
