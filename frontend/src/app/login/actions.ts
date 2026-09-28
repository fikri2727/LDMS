"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL, SESSION_COOKIE } from "@/lib/api";

export interface LoginState {
  error?: string;
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const staffNo = String(formData.get("staffNo") ?? "").trim().toUpperCase();
  const password = String(formData.get("password") ?? "");

  if (!staffNo || !password) {
    return { error: "Please enter your staff number and password." };
  }

  // "Remember me" extends the session cookie to 30 days (the backend decides the lifetime).
  const remember = formData.get("remember") === "on";
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ staffNo, password, remember }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: typeof body.detail === "string" ? body.detail : "Invalid staff number or password." };
  }

  // Copy the backend's signed session cookie onto this site's domain.
  const setCookie = res.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  const token = setCookie?.split(";")[0].slice(SESSION_COOKIE.length + 1);
  const maxAge = Number(setCookie?.match(/Max-Age=(\d+)/i)?.[1] ?? 60 * 60 * 24 * 7);
  if (!token) return { error: "Login failed — no session returned by the server." };

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge,
    path: "/",
  });

  redirect("/dashboard");
}
