"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";

/**
 * Admin/Clerk keying in an OJT for others -> session only; participants are added
 * afterwards. "Add My OJT" (hidden `isSelf` field) -> enrolled immediately with
 * the staff member's own survey answers. The backend decides which.
 */
export async function createOjt(formData: FormData) {
  const { redirect: to } = await api.post<{ id: number; redirect: string }>("/api/ojt", formData);
  revalidatePath("/training/ojt");
  revalidatePath("/training");
  redirect(to);
}

/** Admin/Clerk: bulk-create an OJT session and its participants from Excel (all-or-nothing). */
export async function createOjtFromExcel(formData: FormData) {
  const { id } = await api.post<{ id: number }>("/api/ojt/upload", formData);
  revalidatePath("/training/ojt");
  revalidatePath("/training");
  redirect(`/training/ojt/${id}`);
}

export async function updateOjt(id: number, formData: FormData) {
  const { redirect: to } = await api.post<{ redirect: string }>(`/api/ojt/${id}`, formData);
  revalidatePath("/training/ojt");
  revalidatePath(`/training/ojt/${id}`);
  revalidatePath("/training");
  redirect(to);
}

export async function deleteOjt(id: number) {
  const { redirect: to } = await api.del<{ redirect: string }>(`/api/ojt/${id}`);
  revalidatePath("/training/ojt");
  revalidatePath("/training");
  redirect(to);
}

export async function addOjtParticipant(ojtId: number, formData: FormData) {
  await api.post(`/api/ojt/${ojtId}/participants`, formData);
  revalidatePath(`/training/ojt/${ojtId}`);
  revalidatePath("/training");
}

export async function removeOjtParticipant(ojtId: number, participationId: number) {
  await api.del(`/api/ojt/${ojtId}/participants/${participationId}`);
  revalidatePath(`/training/ojt/${ojtId}`);
  revalidatePath("/training");
}

/** The participant evaluates their own before/after skill survey. */
export async function submitOjtSurvey(ojtId: number, participationId: number, formData: FormData) {
  await api.post(`/api/ojt/${ojtId}/participants/${participationId}/survey`, formData);
  revalidatePath(`/training/ojt/${ojtId}`);
  revalidatePath("/training");
  redirect("/training");
}

/** Admin filling in a participant's OJT evaluation on their behalf -> back to the OJT roster. */
export async function submitOjtSurveyOnBehalf(ojtId: number, participationId: number, formData: FormData) {
  await api.post(`/api/ojt/${ojtId}/participants/${participationId}/survey`, formData);
  revalidatePath(`/training/ojt/${ojtId}`);
  redirect(`/training/ojt/${ojtId}`);
}
