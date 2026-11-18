"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "@/lib/api";

export interface MasterChange {
  field: string;
  from: string | null;
  to: string | null;
}

export interface MasterPreview {
  fileRows: number;
  active: number;
  resigned: number;
  inAppraisal: number;
  masterNew: number;
  masterChanged: number;
  masterUnchanged: number;
  newStaff: { staffNo: string; staffName: string; department: string | null }[];
  updates: { staffNo: string; staffName: string; changes: MasterChange[] }[];
  resign: { staffNo: string; staffName: string; changes: MasterChange[] }[];
  onlyInLdms: number;
  warnings: string[];
}

/** What uploading this employee report would change. Saves nothing. */
export async function previewEmployeeMaster(formData: FormData): Promise<{ preview?: MasterPreview; error?: string }> {
  try {
    return { preview: await api.post<MasterPreview>("/api/employee-master/preview", formData) };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    throw e;
  }
}

/** Saves the employee report as the master and updates LDMS to follow it. */
export async function applyEmployeeMaster(formData: FormData): Promise<{ result?: MasterPreview; error?: string }> {
  let result: MasterPreview;
  try {
    result = await api.post<MasterPreview>("/api/employee-master/apply", formData);
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    throw e;
  }
  revalidatePath("/master");
  revalidatePath("/staff");
  return { result };
}
