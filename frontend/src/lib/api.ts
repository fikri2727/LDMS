import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

/**
 * Client for the Python (FastAPI) backend. Server-side only: pages and server
 * actions call this instead of Prisma. The browser's login cookie is forwarded
 * so the backend knows who is asking.
 */

export const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";
export const SESSION_COOKIE = "ldms_session";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

// The backend sends dates as ISO strings ("2026-01-31T00:00:00.000Z"); turn
// them back into Date objects so page code works exactly as it did with Prisma.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
function reviveDates(_key: string, value: unknown) {
  return typeof value === "string" && ISO_DATE.test(value) ? new Date(value) : value;
}

type Params = Record<string, string | number | boolean | null | undefined>;

function withParams(path: string, params?: Params) {
  if (!params) return path;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? { cookie: `${SESSION_COOKIE}=${token}` } : {};
}

/** Raw fetch to the backend with the login cookie — for file downloads and login. */
export async function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(API_URL + path, {
    ...init,
    headers: { ...(await authHeaders()), ...(init.headers as Record<string, string>) },
    cache: "no-store",
  });
}

interface RequestOptions {
  /** Where a page load goes when the backend says "no permission" (default /dashboard). */
  on403?: string;
}

async function request<T>(method: string, path: string, body?: unknown, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await apiFetch(path, { method, headers, body: payload });
  const text = await res.text();

  if (!res.ok) {
    let message = text;
    try {
      const j = JSON.parse(text);
      message = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch {}
    if (res.status === 401) redirect("/login");
    if (method === "GET") {
      // Page loads behave like the old `if (!canX(session)) redirect("/dashboard")` / notFound().
      if (res.status === 403) redirect(opts.on403 ?? "/dashboard");
      if (res.status === 404) notFound();
    }
    // Server actions: same as the old `throw new Error(msg)` — the form shows the message.
    throw new ApiError(message || `Request failed (${res.status})`, res.status);
  }

  return (text ? JSON.parse(text, reviveDates) : undefined) as T;
}

export const api = {
  get: <T = unknown>(path: string, params?: Params, opts?: RequestOptions) =>
    request<T>("GET", withParams(path, params), undefined, opts),
  post: <T = unknown>(path: string, body?: unknown) => request<T>("POST", path, body ?? new FormData()),
  put: <T = unknown>(path: string, body?: unknown) => request<T>("PUT", path, body),
  del: <T = unknown>(path: string) => request<T>("DELETE", path),
};

/** FormData from a plain object — for actions that used to take typed args instead of a form. */
export function toForm(values: Record<string, string | number | boolean | null | undefined | (string | number)[]>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((x) => fd.append(k, String(x)));
    else fd.set(k, String(v));
  }
  return fd;
}

/** Streams a backend file response (certificate, slide, brochure...) back to the browser. */
export async function proxyFile(path: string) {
  const res = await apiFetch(path);
  if (!res.ok) {
    return new Response(res.status === 404 ? "Not found" : "Unauthorized", { status: res.status });
  }
  const headers = new Headers();
  for (const h of ["content-type", "content-disposition", "content-length", "accept-ranges", "content-range", "cache-control"]) {
    const v = res.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(res.body, { status: res.status, headers });
}
