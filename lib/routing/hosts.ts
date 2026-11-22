// Store vs admin hostnames. They include the port because the Host header does.
// ADMIN_HOST must be set in production or the admin won't open anywhere.
// Anything that isn't ADMIN_HOST (preview URLs too) is treated as the store.

const DEV_STORE_HOST = "localhost:3000";
const DEV_ADMIN_HOST = "admin.localhost:3000";

export type HostConfig = { storeHost: string | null; adminHost: string | null };

export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").trim().toLowerCase().replace(/\.(?=:|$)/, "");
}

export function hostConfig(env: Record<string, string | undefined> = process.env): HostConfig {
  const dev = env.NODE_ENV !== "production";
  const storeHost = normalizeHost(env.STORE_HOST) || (dev ? DEV_STORE_HOST : "");
  const adminHost = normalizeHost(env.ADMIN_HOST) || (dev ? DEV_ADMIN_HOST : "");
  return { storeHost: storeHost || null, adminHost: adminHost || null };
}

export function storeOrigin(env: Record<string, string | undefined> = process.env): string {
  if (env.STORE_URL) return env.STORE_URL.replace(/\/+$/, "");
  const { storeHost } = hostConfig(env);
  if (!storeHost) return "/";
  // no TLS on localhost
  const hostname = storeHost.split(":")[0] ?? "";
  const local = hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1";
  return `${env.NODE_ENV === "production" && !local ? "https" : "http"}://${storeHost}`;
}

// Prefer X-Forwarded-Host. Vercel sets it, and Next keeps it when it re-requests the page a
// server action redirects to (Host is the server's own address there).
export function requestHost(headers: { get(name: string): string | null }): string | null {
  const forwarded = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  return forwarded || headers.get("host");
}
