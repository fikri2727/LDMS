"use server";

import { revalidatePath } from "next/cache";
import { applySurveyAnswers, findOrCreateCheckinParticipation } from "@/lib/survey";

export interface CheckinState {
  error?: string;
  verified?: boolean;
  alreadyCompleted?: boolean;
  staffNo?: string;
  staffName?: string;
}

const NOT_FOUND_MESSAGE = "Staff ID not recognised. Please check and try again, or see the training admin.";

export async function verifyCheckin(
  trainingId: number,
  _prevState: CheckinState,
  formData: FormData
): Promise<CheckinState> {
  const staffNo = String(formData.get("staffId") ?? "").trim().toUpperCase();
  if (!staffNo) {
    return { error: "Please enter your Staff ID." };
  }

  const result = await findOrCreateCheckinParticipation(trainingId, staffNo);
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
 * Re-derives the participation from (trainingId, staffNo) itself rather than
 * trusting a client-supplied participationId — this keeps the accepted "know
 * a Staff ID" risk from silently widening into "guess a small integer ID".
 * Auto-enrolls the staff member as a participant if they weren't already
 * added by an admin, same as verifyCheckin.
 */
export async function submitPublicSurvey(trainingId: number, staffNo: string, formData: FormData): Promise<void> {
  const result = await findOrCreateCheckinParticipation(trainingId, staffNo);
  if (!result) throw new Error(NOT_FOUND_MESSAGE);

  const { participation } = result;
  if (participation.attendance === "COMPLETED") {
    throw new Error("This evaluation has already been submitted.");
  }

  await applySurveyAnswers(participation.id, formData);
  revalidatePath(`/training/public/${trainingId}`);
  revalidatePath("/training");
}
