import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// Optimistic check only: verifies the JWT, never touches the database.
// Route handlers verify the session again on every API call.

const AUTH_PAGES = new Set(["/login", "/register"]);
const HOME_AFTER_LOGIN = "/todos";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value
  );
  const isPublicPage = pathname === "/" || AUTH_PAGES.has(pathname);

  if (!session && !isPublicPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (session && isPublicPage) {
    return NextResponse.redirect(new URL(HOME_AFTER_LOGIN, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register", "/todos/:path*", "/notes/:path*"],
};
