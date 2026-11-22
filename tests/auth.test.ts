import { describe, expect, it, vi } from "vitest";

import { authorizeCredentials, type CredentialsDeps } from "@/lib/auth/credentials";
import { hashPassword, verifyPassword } from "@/lib/password";
import { safeRedirectPath } from "@/lib/safe-redirect";

describe("safeRedirectPath", () => {
  it("keeps paths on this site", () => {
    expect(safeRedirectPath("/account/orders", "/")).toBe("/account/orders");
    expect(safeRedirectPath("/products?q=rose&page=2", "/")).toBe("/products?q=rose&page=2");
  });

  it("falls back for anything that could leave the site", () => {
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/\tevil.example",
      "javascript:alert(1)",
      "evil.example",
      "",
      undefined,
      ["/a"],
    ]) {
      expect(safeRedirectPath(bad, "/fallback")).toBe("/fallback");
    }
  });
});

describe("authorizeCredentials", async () => {
  const passwordHash = await hashPassword("correct horse");
  const customer = { id: "c1", name: "Ada", email: "ada@example.com", role: "CUSTOMER" as const, passwordHash };
  const admin = { id: "a1", name: "Joe", email: "joe@example.com", role: "ADMIN" as const, passwordHash };

  const deps = (): CredentialsDeps => ({
    findUserByEmail: vi.fn(async (email: string) => [customer, admin].find((u) => u.email === email) ?? null),
    verifyPassword: vi.fn(verifyPassword),
  });

  it("signs in with the right password and never returns the hash", async () => {
    const user = await authorizeCredentials({ email: "ada@example.com", password: "correct horse" }, deps());
    expect(user).toEqual({ id: "c1", name: "Ada", email: "ada@example.com", role: "CUSTOMER" });
  });

  it("matches emails case-insensitively", async () => {
    const user = await authorizeCredentials({ email: "  ADA@Example.com ", password: "correct horse" }, deps());
    expect(user?.id).toBe("c1");
  });

  it("rejects a wrong password", async () => {
    expect(await authorizeCredentials({ email: "ada@example.com", password: "wrong" }, deps())).toBeNull();
  });

  it("still runs a bcrypt compare for unknown emails (no timing hint)", async () => {
    const d = deps();
    expect(await authorizeCredentials({ email: "nobody@example.com", password: "x" }, d)).toBeNull();
    expect(d.verifyPassword).toHaveBeenCalledTimes(1);
  });

  it("only lets admins through the admin login", async () => {
    const asAdmin = { password: "correct horse", scope: "admin" };
    expect(await authorizeCredentials({ ...asAdmin, email: "ada@example.com" }, deps())).toBeNull();
    expect((await authorizeCredentials({ ...asAdmin, email: "joe@example.com" }, deps()))?.role).toBe("ADMIN");
  });

  it("rejects malformed input without touching the database", async () => {
    const d = deps();
    for (const bad of [null, {}, { email: "not-an-email", password: "x" }, { email: "a@b.co", password: "" }]) {
      expect(await authorizeCredentials(bad, d)).toBeNull();
    }
    expect(await authorizeCredentials({ email: "ada@example.com", password: "correct horse", scope: "root" }, d)).toBeNull();
    expect(d.findUserByEmail).not.toHaveBeenCalled();
  });
});
