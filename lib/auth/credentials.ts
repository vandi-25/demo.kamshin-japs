import { z } from "zod";

import type { Role } from "@/lib/models/user";
import { PASSWORD_MAX_LENGTH } from "@/lib/password-rules";

// The password check used by authorize(). No Next/DB imports so it can be tested.

export const credentialsSchema = z.object({
  // trim first - z.email().trim() validates before trimming
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  // admin = the admin login form, only ADMIN accounts allowed
  scope: z.enum(["store", "admin"]).default("store"),
});

export type AuthUser = { id: string; name: string; email: string; role: Role };

type StoredUser = AuthUser & { passwordHash: string };

export type CredentialsDeps = {
  findUserByEmail: (email: string) => Promise<StoredUser | null>;
  verifyPassword: (plain: string, hash: string) => Promise<boolean>;
};

// Compare against a dummy hash when the email doesn't exist, so the response time
// doesn't give away which emails have accounts.
const DUMMY_HASH = "$2b$12$H/RlcvgrlvkV7FPGUw1SmOPnjMC1u21oTMwZga6GaHi.cyMWSuWZ6";

export async function authorizeCredentials(raw: unknown, deps: CredentialsDeps): Promise<AuthUser | null> {
  const parsed = credentialsSchema.safeParse(raw);
  if (!parsed.success) return null;
  const { email, password, scope } = parsed.data;

  const user = await deps.findUserByEmail(email);
  const passwordOk = await deps.verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk) return null;
  if (scope === "admin" && user.role !== "ADMIN") return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
