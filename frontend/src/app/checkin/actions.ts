"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";

export interface CheckinState {
  error?: string;
  verified?: boolean;
  alreadyCompleted?: boolean;
  staffNo?: string;
  staffName?: string;
}

export async function verifyCheckin(
  trainingId: number,
  _prevState: CheckinState,
  formData: FormData
): Promise<CheckinState> {
  const staffId = String(formData.get("staffId") ?? "");
  return api.post<CheckinState>(`/api/checkin/training/${trainingId}/verify`, { staffId });
}

/** The backend re-derives the participation from (trainingId, staffNo) — never a client-supplied id. */
export async function submitPublicSurvey(trainingId: number, staffNo: string, formData: FormData): Promise<void> {
  formData.set("staffNo", staffNo);
  await api.post(`/api/checkin/training/${trainingId}/survey`, formData);
  revalidatePath(`/training/public/${trainingId}`);
  revalidatePath("/training");
}
