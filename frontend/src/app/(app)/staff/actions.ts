"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";

export type StaffFormResult = { error: string } | void;

export type StaffNoCheck =
  | { staffNo: string; exists: false }
  | { staffNo: string; exists: true; id: number; staffName: string; status: "ACTIVE" | "RESIGN" };

/** Add Staff form: is this Staff No. already taken? (checked while typing) */
export async function checkStaffNo(staffNo: string): Promise<StaffNoCheck> {
  return api.get<StaffNoCheck>("/api/staff/check-staff-no", { staffNo });
}

// Validation problems (e.g. a duplicate Staff No.) come back as { error } so the form can show
// them next to the fields instead of replacing the page and losing what was typed.
export async function createStaff(formData: FormData): Promise<StaffFormResult> {
  let id: number;
  try {
    ({ id } = await api.post<{ id: number }>("/api/staff", formData));
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    throw e;
  }
  revalidatePath("/staff");
  redirect(`/staff/${id}`);
}

export async function updateStaff(id: number, formData: FormData): Promise<StaffFormResult> {
  try {
    await api.post(`/api/staff/${id}`, formData);
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    throw e;
  }
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
