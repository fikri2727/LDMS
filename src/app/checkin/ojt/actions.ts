"use server";

import { revalidatePath } from "next/cache";
import { applyOjtSurveyAnswers, findOrCreateOjtCheckinParticipation } from "@/lib/survey";

export interface OjtCheckinState {
  error?: string;
  verified?: boolean;
  alreadyCompleted?: boolean;
  staffNo?: string;
  staffName?: string;
}

const NOT_FOUND_MESSAGE = "Staff ID not recognised. Please check and try again, or see the training admin.";

export async function verifyOjtCheckin(
  ojtId: number,
  _prevState: OjtCheckinState,
  formData: FormData
): Promise<OjtCheckinState> {
  const staffNo = String(formData.get("staffId") ?? "").trim().toUpperCase();
  if (!staffNo) {
    return { error: "Please enter your Staff ID." };
  }

  const result = await findOrCreateOjtCheckinParticipation(ojtId, staffNo);
  if (!result) {
    return { error: NOT_FOUND_MESSAGE };
  }

  const { participation, user } = result;
  if (participation.attendance === "COMPLETED") {
    return { alreadyCompleted: true, staffName: user.staffName };
  }

  return { verified: true, staffNo: user.staffNo, staffName: user.staffName };
}

/**
 * Re-derives the participation from (ojtId, staffNo) itself rather than
 * trusting a client-supplied participationId — mirrors submitPublicSurvey's
 * reasoning for the Public/Inhouse check-in flow.
 */
export async function submitPublicOjtSurvey(ojtId: number, staffNo: string, formData: FormData): Promise<void> {
  const result = await findOrCreateOjtCheckinParticipation(ojtId, staffNo);
  if (!result) throw new Error(NOT_FOUND_MESSAGE);

  const { participation } = result;
  if (participation.attendance === "COMPLETED") {
    throw new Error("This evaluation has already been submitted.");
  }

  await applyOjtSurveyAnswers(participation.id, formData);
  revalidatePath(`/training/ojt/${ojtId}`);
  revalidatePath("/training");
}
