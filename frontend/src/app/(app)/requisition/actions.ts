"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";

export async function createRequisition(formData: FormData) {
  await api.post("/api/requisitions", formData);
  revalidatePath("/requisition");
  redirect("/requisition");
}

/** Admins can decide any requisition (and revise); an HOD makes the one-time call for their own staff. */
export async function reviewRequisition(id: number, decision: "APPROVED" | "REJECTED" | "COMPLETED") {
  await api.post(`/api/requisitions/${id}/review`, { decision });
  revalidatePath("/requisition");
  revalidatePath(`/requisition/${id}`);
}

/** Admin-only: permanently removes a training requisition (and its participants/brochure). */
export async function deleteRequisition(id: number) {
  await api.del(`/api/requisitions/${id}`);
  revalidatePath("/requisition");
  redirect("/requisition");
}

export async function updateGrantId(id: number, grantId: string) {
  await api.post(`/api/requisitions/${id}/grant-id`, { grantId });
  revalidatePath("/requisition");
  revalidatePath(`/requisition/${id}`);
}
