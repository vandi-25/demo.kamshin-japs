import { describe, expect, it } from "vitest";

import { hostConfig, normalizeHost, requestHost, storeOrigin } from "@/lib/routing/hosts";
import { routeRequest } from "@/lib/routing/route-request";

const config = { storeHost: "kamshin.ng", adminHost: "admin.kamshin.ng" };

describe("routeRequest on the store host", () => {
  it("serves store pages", () => {
    expect(routeRequest("kamshin.ng", "/products/oud-royale", config)).toEqual({ kind: "store" });
  });

  it("returns 404 for any /admin path", () => {
    for (const path of ["/admin", "/admin/", "/admin/login", "/admin/products/123"]) {
      expect(routeRequest("kamshin.ng", path, config)).toEqual({ kind: "not-found" });
    }
  });

  it("doesn't confuse paths that merely start with 'admin'", () => {
    expect(routeRequest("kamshin.ng", "/administrator-gifts", config)).toEqual({ kind: "store" });
  });

  it("treats unknown hosts (e.g. Vercel previews) as the store", () => {
    expect(routeRequest("kamshin-git-x.vercel.app", "/", config)).toEqual({ kind: "store" });
    expect(routeRequest("kamshin-git-x.vercel.app", "/admin", config)).toEqual({ kind: "not-found" });
    expect(routeRequest(null, "/admin", config)).toEqual({ kind: "not-found" });
  });
});

describe("routeRequest on the admin host", () => {
  it("rewrites pretty paths under /admin", () => {
    expect(routeRequest("admin.kamshin.ng", "/", config)).toEqual({ kind: "admin", path: "/admin", rewrite: true, requiresAdmin: true });
    expect(routeRequest("admin.kamshin.ng", "/products", config)).toMatchObject({ path: "/admin/products", rewrite: true });
  });

  it("serves links that already include /admin as they are", () => {
    expect(routeRequest("admin.kamshin.ng", "/admin/orders", config)).toMatchObject({ path: "/admin/orders", rewrite: false });
  });

  it("only login and forbidden are public", () => {
    expect(routeRequest("admin.kamshin.ng", "/login", config)).toMatchObject({ path: "/admin/login", requiresAdmin: false });
    expect(routeRequest("admin.kamshin.ng", "/admin/forbidden", config)).toMatchObject({ requiresAdmin: false });
    expect(routeRequest("admin.kamshin.ng", "/orders", config)).toMatchObject({ requiresAdmin: true });
  });

  it("keeps store pages off the admin host (they become missing admin pages)", () => {
    expect(routeRequest("admin.kamshin.ng", "/cart", config)).toMatchObject({ path: "/admin/cart" });
  });

  it("matches the host case-insensitively and with a trailing dot", () => {
    expect(routeRequest("ADMIN.Kamshin.ng.", "/", config).kind).toBe("admin");
  });

  it("includes the port: a different port is a different host", () => {
    const local = { storeHost: "localhost:3000", adminHost: "admin.localhost:3000" };
    expect(routeRequest("admin.localhost:3000", "/", local).kind).toBe("admin");
    expect(routeRequest("admin.localhost:4000", "/", local).kind).toBe("store");
  });

  it("with no admin host configured, the admin is unreachable", () => {
    const none = { storeHost: "kamshin.ng", adminHost: null };
    expect(routeRequest("admin.kamshin.ng", "/", none)).toEqual({ kind: "store" });
    expect(routeRequest("admin.kamshin.ng", "/admin", none)).toEqual({ kind: "not-found" });
  });
});

describe("hostConfig / storeOrigin", () => {
  it("defaults to localhost hosts in development", () => {
    expect(hostConfig({ NODE_ENV: "development" })).toEqual({ storeHost: "localhost:3000", adminHost: "admin.localhost:3000" });
  });

  it("has no defaults in production (fail closed)", () => {
    expect(hostConfig({ NODE_ENV: "production" })).toEqual({ storeHost: null, adminHost: null });
  });

  it("normalises configured hosts", () => {
    expect(hostConfig({ NODE_ENV: "production", ADMIN_HOST: " Admin.Kamshin.NG " }).adminHost).toBe("admin.kamshin.ng");
    expect(normalizeHost("Shop.Example.com.:443")).toBe("shop.example.com:443");
  });

  it("builds the store link from STORE_URL or STORE_HOST", () => {
    expect(storeOrigin({ NODE_ENV: "production", STORE_URL: "https://kamshin.ng/" })).toBe("https://kamshin.ng");
    expect(storeOrigin({ NODE_ENV: "production", STORE_HOST: "kamshin.ng" })).toBe("https://kamshin.ng");
    expect(storeOrigin({ NODE_ENV: "development" })).toBe("http://localhost:3000");
    expect(storeOrigin({ NODE_ENV: "production", STORE_HOST: "localhost:3100" })).toBe("http://localhost:3100");
  });
});

describe("requestHost", () => {
  const h = (entries: Record<string, string>) => new Headers(entries);
  it("prefers X-Forwarded-Host (Vercel, and Next.js internal re-requests)", () => {
    expect(requestHost(h({ host: "localhost:3000", "x-forwarded-host": "admin.localhost:3000" }))).toBe("admin.localhost:3000");
  });
  it("uses the first value of a forwarded list", () => {
    expect(requestHost(h({ host: "x", "x-forwarded-host": "admin.kamshin.ng, proxy.internal" }))).toBe("admin.kamshin.ng");
  });
  it("falls back to Host", () => {
    expect(requestHost(h({ host: "kamshin.ng" }))).toBe("kamshin.ng");
  });
});
