"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { getSession } from "@/lib/session";

export interface LoginState {
  error?: string;
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const staffNo = String(formData.get("staffNo") ?? "").trim().toUpperCase();
  const password = String(formData.get("password") ?? "");

  if (!staffNo || !password) {
    return { error: "Please enter your staff number and password." };
  }

  const user = await prisma.user.findUnique({
    where: { staffNo },
    include: { department: true },
  });

  if (!user || user.status === "RESIGN") {
    return { error: "Invalid staff number or password." };
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return { error: "Invalid staff number or password." };
  }

  // "Remember me" extends the session cookie to 30 days; otherwise it keeps
  // the default (see sessionOptions).
  const remember = formData.get("remember") === "on";
  const session = await getSession(remember ? { maxAge: 60 * 60 * 24 * 30 } : undefined);
  session.userId = user.id;
  session.staffNo = user.staffNo;
  session.staffName = user.staffName;
  session.roleType = user.roleType;
  session.isHod = user.isHod;
  session.designation = user.designation;
  session.departmentId = user.departmentId;
  session.department = user.department?.name ?? null;
  await session.save();

  redirect("/dashboard");
}
