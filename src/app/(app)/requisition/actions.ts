"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { canReviewRequisitions, canViewAllRequisitions } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { saveUpload, deleteUpload } from "@/lib/uploads";

export async function createRequisition(formData: FormData) {
  const session = await requireSession();

  const fees = Number(formData.get("fees"));
  if (Number.isNaN(fees) || fees < 0) {
    throw new Error("Invalid fees amount.");
  }

  const participantUserIds = formData
    .getAll("participantUserIds")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));
  if (participantUserIds.length === 0) {
    throw new Error("Add at least one participant.");
  }

  const trainingDateStr = String(formData.get("trainingDate") ?? "");
  if (!trainingDateStr) {
    throw new Error("Select a training date.");
  }
  const trainingEndDateStr = String(formData.get("trainingEndDate") ?? "") || trainingDateStr;

  const title = String(formData.get("title") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim();
  const objective = String(formData.get("objective") ?? "").trim();
  const hrdcClaimableRaw = formData.get("hrdcClaimable");
  const underAtpRaw = formData.get("underAtp");
  const trainingProvider = String(formData.get("trainingProvider") ?? "").trim();
  if (!title || !startTime || !endTime || !venue || !objective || !trainingProvider) {
    throw new Error("Please fill in all required fields.");
  }
  if (hrdcClaimableRaw !== "yes" && hrdcClaimableRaw !== "no") {
    throw new Error("Select whether this training is HRDC claimable.");
  }
  if (underAtpRaw !== "yes" && underAtpRaw !== "no") {
    throw new Error("Select whether this training is under ATP (Annual Training Plan).");
  }

  const brochureFile = formData.get("brochureFile") as File | null;
  let brochureFileName: string | null = null;
  let brochureFilePath: string | null = null;
  if (brochureFile && brochureFile.size > 0) {
    brochureFileName = brochureFile.name;
    brochureFilePath = await saveUpload("requisition-brochures", brochureFile);
  }

  await prisma.trainingRequisition.create({
    data: {
      userId: session.userId,
      participants: { create: participantUserIds.map((userId) => ({ userId })) },
      title,
      trainingDate: new Date(trainingDateStr),
      trainingEndDate: new Date(trainingEndDateStr),
      startTime,
      endTime,
      venue,
      objective,
      fees,
      hrdcClaimable: hrdcClaimableRaw === "yes",
      underAtp: underAtpRaw === "yes",
      trainingProvider,
      remarks: (formData.get("remarks") as string) || null,
      brochureFileName,
      brochureFilePath,
    },
  });

  revalidatePath("/requisition");
  redirect("/requisition");
}

export async function reviewRequisition(id: number, decision: "APPROVED" | "REJECTED" | "COMPLETED") {
  const session = await requireSession();

  const requisition = await prisma.trainingRequisition.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!requisition) throw new Error("Requisition not found.");

  // Admins can approve/reject/complete on behalf of anyone and revise a
  // decision that's already been made; an HOD only ever makes the one-time
  // Approve/Reject call for their own direct report, and only while it's
  // still pending — that part is unchanged, and HODs can't set Completed.
  const isAdmin = canViewAllRequisitions(session);
  const isOwnHod = canReviewRequisitions(session) && requisition.user.hodId === session.userId;
  if (decision === "COMPLETED" && !isAdmin) {
    throw new Error("Only an Admin can mark a requisition as Completed.");
  }
  if (!isAdmin && !isOwnHod) {
    throw new Error("Not authorized to review this requisition.");
  }
  if (!isAdmin && requisition.status !== "PENDING") {
    throw new Error("This requisition has already been reviewed.");
  }

  await prisma.trainingRequisition.update({
    where: { id },
    data: {
      status: decision,
      reviewedByUserId: session.userId,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/requisition");
  revalidatePath(`/requisition/${id}`);
}

/** Admin-only: permanently removes a training requisition (and its participants/brochure). */
export async function deleteRequisition(id: number) {
  const session = await requireSession();
  if (!canViewAllRequisitions(session)) {
    throw new Error("Only an Admin can delete a training requisition.");
  }

  const requisition = await prisma.trainingRequisition.findUniqueOrThrow({ where: { id } });
  await prisma.trainingRequisition.delete({ where: { id } });
  if (requisition.brochureFilePath) await deleteUpload(requisition.brochureFilePath);

  revalidatePath("/requisition");
  redirect("/requisition");
}

export async function updateGrantId(id: number, grantId: string) {
  const session = await requireSession();
  if (!canViewAllRequisitions(session)) {
    throw new Error("Not authorized to set the grant ID.");
  }

  await prisma.trainingRequisition.update({
    where: { id },
    data: { grantId: grantId.trim() || null },
  });

  revalidatePath("/requisition");
  revalidatePath(`/requisition/${id}`);
}
