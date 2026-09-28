import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/checkin"];
const SESSION_COOKIE = "ldms_session";

/**
 * Quick gate: no login cookie -> go to /login. The cookie itself is verified by
 * the Python backend on every request (an invalid/expired one also ends at /login).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|woff|woff2|ttf)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (!request.cookies.get(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
