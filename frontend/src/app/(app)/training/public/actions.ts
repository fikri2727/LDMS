"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";

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

export async function uploadCertificate(trainingId: number, formData: FormData) {
  await api.post(`/api/training/public/${trainingId}/certificates`, formData);
  revalidatePath(`/training/public/${trainingId}`);
}

export async function deleteCertificate(trainingId: number, certificateId: number) {
  await api.del(`/api/training/public/${trainingId}/certificates/${certificateId}`);
  revalidatePath(`/training/public/${trainingId}`);
}
