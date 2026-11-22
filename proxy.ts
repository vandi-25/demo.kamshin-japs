import { getToken } from "next-auth/jwt";
import { type NextRequest, NextResponse } from "next/server";

import { hostConfig, requestHost } from "@/lib/routing/hosts";
import { routeRequest } from "@/lib/routing/route-request";

// Routes store vs admin by hostname (rules in lib/routing/route-request.ts).
// This only checks the session cookie - the admin pages still call requireAdmin().
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hosts = hostConfig();
  const decision = routeRequest(requestHost(request.headers), pathname, hosts);

  if (decision.kind === "store") return NextResponse.next();

  if (decision.kind === "not-found") {
    // no route here, so this renders the 404 page
    return NextResponse.rewrite(new URL("/__not-found", request.url));
  }

  if (decision.requiresAdmin) {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie: request.nextUrl.protocol === "https:",
    });
    // don't use request.url, it can be the server's internal address
    const adminOrigin = `${request.nextUrl.protocol}//${hosts.adminHost}`;
    if (!token) return NextResponse.redirect(new URL("/login", adminOrigin));
    if (token.role !== "ADMIN") return NextResponse.redirect(new URL("/forbidden", adminOrigin));
  }

  return decision.rewrite ? NextResponse.rewrite(new URL(decision.path + search, request.url)) : NextResponse.next();
}

export const config = {
  // skip next internals, the auth api and static files
  matcher: ["/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
