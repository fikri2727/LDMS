"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { canManageTna } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import type { TnaSection, TnaTrainingType } from "@/generated/prisma/client";

interface TnaItemPayload {
  section: TnaSection;
  order: number;
  problemStatement: string;
  training: string;
  targetSkill: number;
  currentSkill: number;
  trainingType: TnaTrainingType;
  monthApply: string;
}

export async function saveTna(formData: FormData) {
  const session = await requireSession();
  const year = Number(formData.get("year"));
  const items = JSON.parse(String(formData.get("payload") ?? "[]")) as TnaItemPayload[];

  const existing = await prisma.tna.findUnique({ where: { userId_year: { userId: session.userId, year } } });
  if (existing?.status === "APPROVED") {
    throw new Error("This TNA record has already been approved and can no longer be edited.");
  }

  await prisma.$transaction(async (tx) => {
    const tna = existing
      ? existing
      : await tx.tna.create({ data: { userId: session.userId, year, status: "PENDING" } });

    await tx.tnaItem.deleteMany({ where: { tnaId: tna.id } });
    if (items.length > 0) {
      await tx.tnaItem.createMany({
        data: items.map((it) => ({
          tnaId: tna.id,
          section: it.section,
          order: it.order,
          problemStatement: it.problemStatement,
          training: it.training,
          targetSkill: it.targetSkill,
          currentSkill: it.currentSkill,
          trainingType: it.trainingType,
          monthApply: it.monthApply,
        })),
      });
    }
  });

  revalidatePath("/tna");
  redirect("/tna");
}

export async function approveTna(id: number) {
  const session = await requireSession();
  if (!canManageTna(session)) {
    throw new Error("Not authorized");
  }

  await prisma.tna.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date(), approvedByUserId: session.userId },
  });

  revalidatePath("/tna");
  revalidatePath(`/tna/${id}`);
}

// ---------- Training catalogue (Customize Training) ----------

async function requireTnaAdmin() {
  const session = await requireSession();
  if (!canManageTna(session)) {
    throw new Error("You do not have permission to manage the TNA training catalogue.");
  }
  return session;
}

export async function createTnaTrainingOption(section: TnaSection, formData: FormData) {
  await requireTnaAdmin();
  const label = String(formData.get("label") ?? "").trim().toUpperCase();
  if (!label) throw new Error("Training name is required.");
  const groupNameRaw = String(formData.get("groupName") ?? "").trim();
  const groupName = groupNameRaw ? groupNameRaw.toUpperCase() : null;

  const last = await prisma.tnaTrainingOption.findFirst({
    where: { section },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.tnaTrainingOption.create({
    data: { section, groupName, label, order: (last?.order ?? -1) + 1 },
  });
  revalidatePath("/tna/customize");
  revalidatePath("/tna");
}

export async function updateTnaTrainingOption(id: number, formData: FormData) {
  await requireTnaAdmin();
  const label = String(formData.get("label") ?? "").trim().toUpperCase();
  if (!label) throw new Error("Training name is required.");
  const groupNameRaw = String(formData.get("groupName") ?? "").trim();
  const groupName = groupNameRaw ? groupNameRaw.toUpperCase() : null;

  await prisma.tnaTrainingOption.update({ where: { id }, data: { label, groupName } });
  revalidatePath("/tna/customize");
  revalidatePath("/tna");
}

export async function deleteTnaTrainingOption(id: number) {
  await requireTnaAdmin();
  await prisma.tnaTrainingOption.delete({ where: { id } });
  revalidatePath("/tna/customize");
  revalidatePath("/tna");
}
