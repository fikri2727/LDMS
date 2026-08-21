import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { RoleType, Designation } from "@/generated/prisma/client";

export interface SessionData {
  userId: number;
  staffNo: string;
  staffName: string;
  roleType: RoleType;
  isHod: boolean;
  designation: Designation;
  departmentId: number | null;
  department: string | null;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "ldms_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
