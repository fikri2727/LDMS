"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import type { TnaSection } from "@/lib/db-types";

/** HOD submits/updates their TNA for the year (form fields: year, payload = JSON rows). */
export async function saveTna(formData: FormData) {
  await api.post("/api/tna", formData);
  revalidatePath("/tna");
  redirect("/tna");
}

export async function approveTna(id: number) {
  await api.post(`/api/tna/${id}/approve`);
  revalidatePath("/tna");
  revalidatePath(`/tna/${id}`);
}

// ---------- Training catalogue (Customize Training) ----------

export async function createTnaTrainingOption(section: TnaSection, formData: FormData) {
  await api.post(`/api/tna/options?section=${section}`, formData);
  revalidatePath("/tna/customize");
  revalidatePath("/tna");
}

export async function updateTnaTrainingOption(id: number, formData: FormData) {
  await api.post(`/api/tna/options/${id}`, formData);
  revalidatePath("/tna/customize");
  revalidatePath("/tna");
}

export async function deleteTnaTrainingOption(id: number) {
  await api.del(`/api/tna/options/${id}`);
  revalidatePath("/tna/customize");
  revalidatePath("/tna");
}
