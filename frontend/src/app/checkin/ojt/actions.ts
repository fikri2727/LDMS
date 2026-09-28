"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";

export interface OjtCheckinState {
  error?: string;
  verified?: boolean;
  alreadyCompleted?: boolean;
  staffNo?: string;
  staffName?: string;
}

export async function verifyOjtCheckin(
  ojtId: number,
  _prevState: OjtCheckinState,
  formData: FormData
): Promise<OjtCheckinState> {
  const staffId = String(formData.get("staffId") ?? "");
  return api.post<OjtCheckinState>(`/api/checkin/ojt/${ojtId}/verify`, { staffId });
}

export async function submitPublicOjtSurvey(ojtId: number, staffNo: string, formData: FormData): Promise<void> {
  formData.set("staffNo", staffNo);
  await api.post(`/api/checkin/ojt/${ojtId}/survey`, formData);
  revalidatePath(`/training/ojt/${ojtId}`);
  revalidatePath("/training");
}
