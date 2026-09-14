"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";
import { canManageOjt } from "@/lib/rbac";
import { generateOjtCode, computeDays, computeHours } from "@/lib/training-code";
import { parseOjtExcel } from "@/lib/ojt-excel";
import { applyOjtSurveyAnswers } from "@/lib/survey";
import type { TrainerType } from "@/generated/prisma/client";

function readOjtFields(formData: FormData) {
  const startDate = new Date(String(formData.get("startDate")));
  const endDate = new Date(String(formData.get("endDate")));
  const startTime = String(formData.get("startTime") ?? "09:00");
  const endTime = String(formData.get("endTime") ?? "17:00");

  return {
    title: String(formData.get("title") ?? "").trim().toUpperCase(),
    venue: String(formData.get("venue") ?? "").trim().toUpperCase(),
    trainerType: String(formData.get("trainerType") ?? "") as TrainerType,
    trainerName: String(formData.get("trainerName") ?? "").trim().toUpperCase(),
    startDate,
    endDate,
    startTime,
    endTime,
    totalDay: computeDays(startDate, endDate),
    totalHour: computeHours(startTime, endTime),
  };
}

async function createOjtRecord(fields: ReturnType<typeof readOjtFields>, createdByUserId: number) {
  const ojt = await prisma.ojt.create({
    data: { ...fields, trainingCode: "", createdByUserId },
  });
  await prisma.ojt.update({
    where: { id: ojt.id },
    data: { trainingCode: generateOjtCode(ojt.id, fields.startDate) },
  });
  return ojt;
}

/**
 * Admin/Clerk keying in an OJT session for others: creates the session's
 * details only, no participants attached yet — those are added afterwards
 * by searching staff, or via the Excel bulk-upload method, from the OJT
 * detail page. Anyone adding their OWN OJT (including a Clerk using "Add My
 * OJT" — see the hidden `isSelf` field set by OjtForm) instead falls through
 * to the self-service branch below, which enrolls them immediately with
 * their own survey answers.
 */
export async function createOjt(formData: FormData) {
  const session = await requireSession();
  const fields = readOjtFields(formData);

  if (!fields.title || !fields.venue || !fields.trainerName) {
    throw new Error("Title, Venue, and Trainer Name are required.");
  }

  // "Add My OJT" from My Training always means the self-service flow below,
  // even for a Clerk who otherwise keys in OJT sessions for others — the
  // form marks that intent with a hidden `isSelf` field.
  if (canManageOjt(session) && formData.get("isSelf") !== "1") {
    const ojt = await createOjtRecord(fields, session.userId);
    revalidatePath("/training/ojt");
    revalidatePath("/training");
    redirect(`/training/ojt/${ojt.id}`);
  }

  // Self-service: the logged-in staff creates their own OJT record and
  // immediately submits their own pre/post skill survey in one step,
  // matching the legacy app's one-shot flow.
  const participant = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    include: { department: true },
  });

  const ojt = await prisma.ojt.create({
    data: {
      ...fields,
      trainingCode: "",
      createdByUserId: session.userId,
      participants: {
        create: {
          userId: session.userId,
          attendance: "COMPLETED",
          q1: String(formData.get("q1") ?? "").trim().toUpperCase(),
          q2: Number(formData.get("q2")) || null,
          q3: Number(formData.get("q3")) || null,
          department: participant.department?.shortName ?? participant.department?.name ?? null,
        },
      },
    },
  });

  await prisma.ojt.update({
    where: { id: ojt.id },
    data: { trainingCode: generateOjtCode(ojt.id, fields.startDate) },
  });

  revalidatePath("/training/ojt");
  revalidatePath("/training");
  redirect("/training");
}

/**
 * Admin/Clerk: bulk-create an OJT session and its participants from an
 * uploaded Excel file (see src/lib/ojt-excel.ts for the expected format).
 * All-or-nothing — if any staff number doesn't match an active staff
 * record, nothing is created and the clerk is told which ones to fix.
 */
export async function createOjtFromExcel(formData: FormData) {
  const session = await requireSession();
  if (!canManageOjt(session)) throw new Error("You do not have permission to upload OJT records.");

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Please choose an Excel file to upload.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseOjtExcel(buffer);

  const staff = await prisma.user.findMany({
    where: { staffNo: { in: parsed.staffNos }, status: "ACTIVE" },
    include: { department: true },
  });
  const staffByNo = new Map(staff.map((s) => [s.staffNo.toUpperCase(), s]));

  const missing = parsed.staffNos.filter((no) => !staffByNo.has(no));
  if (missing.length > 0) {
    throw new Error(`These Staff No(s) were not found among active staff: ${missing.join(", ")}`);
  }

  const fields = {
    ...parsed.fields,
    totalDay: computeDays(parsed.fields.startDate, parsed.fields.endDate),
    totalHour: computeHours(parsed.fields.startTime, parsed.fields.endTime),
  };

  const ojt = await prisma.$transaction(async (tx) => {
    const created = await tx.ojt.create({
      data: { ...fields, trainingCode: "", createdByUserId: session.userId },
    });
    await tx.ojt.update({
      where: { id: created.id },
      data: { trainingCode: generateOjtCode(created.id, fields.startDate) },
    });
    await tx.participateOjt.createMany({
      data: parsed.staffNos.map((no) => {
        const s = staffByNo.get(no)!;
        return {
          ojtId: created.id,
          userId: s.id,
          department: s.department?.shortName ?? s.department?.name ?? null,
          clerkId: session.userId,
        };
      }),
    });
    return created;
  });

  revalidatePath("/training/ojt");
  revalidatePath("/training");
  redirect(`/training/ojt/${ojt.id}`);
}

export async function updateOjt(id: number, formData: FormData) {
  const session = await requireSession();
  const ojt = await prisma.ojt.findUniqueOrThrow({ where: { id } });
  if (!canManageOjt(session) && ojt.createdByUserId !== session.userId) {
    throw new Error("You do not have permission to edit this OJT record.");
  }

  const fields = readOjtFields(formData);

  if (!fields.title || !fields.venue || !fields.trainerName) {
    throw new Error("Title, Venue, and Trainer Name are required.");
  }

  await prisma.ojt.update({ where: { id }, data: fields });

  revalidatePath("/training/ojt");
  revalidatePath(`/training/ojt/${id}`);
  revalidatePath("/training");
  redirect(canManageOjt(session) ? `/training/ojt/${id}` : "/training");
}

export async function deleteOjt(id: number) {
  const session = await requireSession();
  const manage = canManageOjt(session);
  const ojt = await prisma.ojt.findUniqueOrThrow({ where: { id } });
  if (!manage && ojt.createdByUserId !== session.userId) {
    throw new Error("You do not have permission to delete this OJT record.");
  }

  await prisma.ojt.delete({ where: { id } });
  revalidatePath("/training/ojt");
  revalidatePath("/training");
  redirect(manage ? "/training/ojt" : "/training");
}

export async function addOjtParticipant(ojtId: number, formData: FormData) {
  const session = await requireSession();
  if (!canManageOjt(session)) throw new Error("You do not have permission to add participants.");

  const userId = Number(formData.get("userId"));
  if (!userId) throw new Error("Please select a staff member.");

  const participant = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { department: true },
  });

  await prisma.participateOjt.create({
    data: {
      ojtId,
      userId,
      department: participant.department?.shortName ?? participant.department?.name ?? null,
      clerkId: session.userId,
    },
  });

  revalidatePath(`/training/ojt/${ojtId}`);
  revalidatePath("/training");
}

export async function removeOjtParticipant(ojtId: number, participationId: number) {
  const session = await requireSession();
  const participation = await prisma.participateOjt.findUniqueOrThrow({ where: { id: participationId } });

  if (participation.userId !== session.userId && !canManageOjt(session)) {
    throw new Error("You do not have permission to remove this participant.");
  }

  await prisma.participateOjt.delete({ where: { id: participationId } });
  revalidatePath(`/training/ojt/${ojtId}`);
  revalidatePath("/training");
}

/**
 * The participant evaluates their own before/after skill survey for an OJT
 * session that Admin/Clerk keyed them into (attendance was left PENDING).
 */
export async function submitOjtSurvey(ojtId: number, participationId: number, formData: FormData) {
  const session = await requireSession();
  const participation = await prisma.participateOjt.findUniqueOrThrow({ where: { id: participationId } });

  if (participation.userId !== session.userId) {
    throw new Error("You do not have permission to submit this evaluation.");
  }

  await applyOjtSurveyAnswers(participationId, formData);

  revalidatePath(`/training/ojt/${ojtId}`);
  revalidatePath("/training");
  redirect("/training");
}
