"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { canReviewRequisitions, canViewAllRequisitions } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/uploads";

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
  const trainingProvider = String(formData.get("trainingProvider") ?? "").trim();
  if (!title || !startTime || !endTime || !venue || !objective || !trainingProvider) {
    throw new Error("Please fill in all required fields.");
  }
  if (hrdcClaimableRaw !== "yes" && hrdcClaimableRaw !== "no") {
    throw new Error("Select whether this training is HRDC claimable.");
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
      trainingProvider,
      remarks: (formData.get("remarks") as string) || null,
      brochureFileName,
      brochureFilePath,
    },
  });

  revalidatePath("/requisition");
  redirect("/requisition");
}

export async function reviewRequisition(id: number, decision: "APPROVED" | "REJECTED") {
  const session = await requireSession();

  const requisition = await prisma.trainingRequisition.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!requisition) throw new Error("Requisition not found.");
  if (requisition.status !== "PENDING") throw new Error("This requisition has already been reviewed.");

  const isOwnHod = canReviewRequisitions(session) && requisition.user.hodId === session.userId;
  const isOrphanFallback = session.roleType === "ADMIN" && requisition.user.hodId == null;
  if (!isOwnHod && !isOrphanFallback) {
    throw new Error("Not authorized to review this requisition.");
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
