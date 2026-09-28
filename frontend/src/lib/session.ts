import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { RoleType, Designation } from "@/lib/db-types";
import { apiFetch, SESSION_COOKIE } from "@/lib/api";

export interface SessionData {
  userId: number;
  staffNo: string;
  staffName: string;
  roleType: RoleType;
  isHod: boolean;
  designation: Designation;
  departmentId: number | null;
  department: string | null;
  passwordIsDefault: boolean;
  isSupervisor: boolean;
  permissions: Record<string, boolean>;
}

/**
 * The signed-in user, from the Python backend (GET /api/auth/me), or null.
 * Cached per request, so a layout and page calling it share one lookup.
 */
export const getSession = cache(async (): Promise<SessionData | null> => {
  if (!(await cookies()).get(SESSION_COOKIE)) return null;
  const res = await apiFetch("/api/auth/me");
  if (!res.ok) return null;
  return (await res.json()) as SessionData;
});
