"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";

/** The assigned supervisor fills in and submits the evaluation in one step. */
export async function evaluatePme(pmeId: number, formData: FormData) {
  await api.post(`/api/pme/${pmeId}/evaluate`, formData);
  revalidatePath("/training/pme");
  revalidatePath(`/training/pme/${pmeId}`);
}
