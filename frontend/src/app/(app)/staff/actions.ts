"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";

export async function createStaff(formData: FormData) {
  const { id } = await api.post<{ id: number }>("/api/staff", formData);
  revalidatePath("/staff");
  redirect(`/staff/${id}`);
}

export async function updateStaff(id: number, formData: FormData) {
  await api.post(`/api/staff/${id}`, formData);
  revalidatePath("/staff");
  revalidatePath(`/staff/${id}`);
}

export async function resetPassword(id: number) {
  await api.post(`/api/staff/${id}/reset-password`);
  revalidatePath(`/staff/${id}`);
}

export async function deleteStaff(id: number) {
  await api.del(`/api/staff/${id}`);
  revalidatePath("/staff");
  redirect("/staff");
}

/**
 * Bulk-import/update staff from an Excel file (see staff-upload-template.xlsx).
 * Matched by Staff No; all-or-nothing — every problem is reported together.
 */
export async function bulkUploadStaff(formData: FormData) {
  await api.post("/api/staff/bulk-upload", formData);
  revalidatePath("/staff");
}
