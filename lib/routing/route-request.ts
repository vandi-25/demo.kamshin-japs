import type { HostConfig } from "./hosts";
import { normalizeHost } from "./hosts";

// What proxy.ts should do with a request.
// Store (or unknown) host: /admin/* is a 404, everything else is normal.
// Admin host: /x is rewritten to /admin/x (paths already under /admin pass through).
// Everything except login/forbidden needs an admin session.

export type RouteDecision =
  | { kind: "store" }
  | { kind: "not-found" }
  | { kind: "admin"; path: string; rewrite: boolean; requiresAdmin: boolean };

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/admin/forbidden"]);

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function routeRequest(host: string | null, pathname: string, config: HostConfig): RouteDecision {
  const onAdminHost = config.adminHost !== null && normalizeHost(host) === config.adminHost;

  if (!onAdminHost) return isAdminPath(pathname) ? { kind: "not-found" } : { kind: "store" };

  const alreadyAdmin = isAdminPath(pathname);
  const path = alreadyAdmin ? pathname : pathname === "/" ? "/admin" : `/admin${pathname}`;
  return { kind: "admin", path, rewrite: !alreadyAdmin, requiresAdmin: !PUBLIC_ADMIN_PATHS.has(path) };
}
