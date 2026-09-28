"use server";

import { api } from "@/lib/api";

export async function changeOwnPassword(formData: FormData) {
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  await api.post("/api/auth/change-password", { newPassword, confirmPassword });
}
