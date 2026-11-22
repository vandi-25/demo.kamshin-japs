"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/guards";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { ROLES } from "@/lib/models/user";

import { type AdminActionResult, objectId } from "./shared";

// Takes effect on their next request since requireAdmin() reads the role from the DB.
export async function setUserRoleAction(rawId: unknown, rawRole: unknown): Promise<AdminActionResult> {
  const me = await requireAdmin();
  const parsed = z.object({ id: objectId, role: z.enum(ROLES) }).safeParse({ id: rawId, role: rawRole });
  if (!parsed.success) return { ok: false, message: "Couldn't change that role." };
  const { id, role } = parsed.data;
  if (id === me.id) return { ok: false, message: "You can't change your own role." };

  await connectDB();
  const user = await User.findById(id).select("role name");
  if (!user) return { ok: false, message: "That account no longer exists." };
  if (user.role === role) return { ok: true };

  if (role === "CUSTOMER" && (await User.countDocuments({ role: "ADMIN" })) <= 1) {
    return { ok: false, message: "There must always be at least one admin." };
  }
  user.role = role;
  await user.save();
  refresh();
  return { ok: true, message: role === "ADMIN" ? `${user.name} is now an admin.` : `${user.name} is now a customer.` };
}
