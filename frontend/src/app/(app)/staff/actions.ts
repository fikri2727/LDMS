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
export async function bulkUploadStaff(formData: FormData): Promise<{ error?: string }> {
  try {
    await api.post("/api/staff/bulk-upload", formData);
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }
  revalidatePath("/staff");
  return {};
}

export interface StaffSyncPerson {
  staffNo: string;
  staffName: string;
  department?: string | null;
  isHod?: boolean;
}

export interface StaffSyncPreview {
  new: StaffSyncPerson[];
  updated: number;
  reactivated: StaffSyncPerson[];
  toResign: StaffSyncPerson[];
}

export interface StaffCompareResult {
  fileCount: number;
  matched: number;
  notRegistered: string[];
  resignedInSystem: StaffSyncPerson[];
  notInFile: StaffSyncPerson[];
}

/** Compares a list of Staff IDs with LDMS, without changing anything. */
export async function compareStaffIds(formData: FormData): Promise<{ result?: StaffCompareResult; error?: string }> {
  try {
    return { result: await api.post<StaffCompareResult>("/api/staff/compare", formData) };
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }
}

/** What an upload would do, without changing anything. */
export async function previewStaffUpload(formData: FormData): Promise<{ preview?: StaffSyncPreview; error?: string }> {
  formData.set("preview", "1");
  try {
    return { preview: await api.post<StaffSyncPreview>("/api/staff/bulk-upload", formData) };
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }
}
