"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";
import { hashPassword, DEFAULT_STAFF_PASSWORD } from "@/lib/auth";

export async function changeOwnPassword(formData: FormData) {
  const session = await requireSession();

  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!newPassword || !confirmPassword) {
    throw new Error("Please fill in all fields.");
  }
  if (newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters.");
  }
  if (newPassword !== confirmPassword) {
    throw new Error("New password and confirmation do not match.");
  }

  const password = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: session.userId },
    data: { password, passwordIsDefault: newPassword === DEFAULT_STAFF_PASSWORD },
  });
}
