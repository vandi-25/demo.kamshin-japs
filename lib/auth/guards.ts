import "server-only";

import { isValidObjectId } from "mongoose";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import type { Role } from "@/lib/models/user";

export type SessionUser = { id: string; name: string; email: string; role: Role };

// from the session cookie - fine for display
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || !u.email) return null;
  return { id: u.id, name: u.name ?? "", email: u.email, role: u.role };
}

// Redirects to /login (and back to returnTo afterwards) if nobody is signed in.
export async function requireUser(returnTo = "/"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(returnTo)}`);
  return user;
}

// Checks the role in the DB, not the cookie, so removing someone's admin access works straight away.
// No session -> admin login, not an admin -> 403.
export async function requireAdmin(): Promise<SessionUser> {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !isValidObjectId(sessionUser.id)) redirect("/admin/login");

  await connectDB();
  const user = await User.findById(sessionUser.id).select("name email role").lean();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/admin/forbidden");

  return { id: sessionUser.id, name: user.name, email: user.email, role: user.role };
}
