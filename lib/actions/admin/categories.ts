"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/guards";
import { connectDB } from "@/lib/db";
import { Category, Product } from "@/lib/models";
import { slugify } from "@/lib/slug";

import { type AdminActionResult, isDuplicateKeyError, objectId } from "./shared";

const categorySchema = z.object({
  name: z.string().trim().min(2, "Enter a category name").max(60, "Use at most 60 characters"),
  tagline: z.string().trim().max(120, "Use at most 120 characters").default(""),
});

const TAKEN = "A category with this name already exists";

function parse(input: unknown) {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details" };
  const slug = slugify(parsed.data.name);
  if (slug.length < 2) return { error: "Use letters or numbers in the name" };
  return { data: { name: parsed.data.name, tagline: parsed.data.tagline, slug } };
}

export async function createCategoryAction(input: unknown): Promise<AdminActionResult> {
  await requireAdmin();
  const result = parse(input);
  if (!result.data) return { ok: false, message: result.error };
  await connectDB();
  try {
    await Category.create(result.data);
  } catch (error) {
    if (isDuplicateKeyError(error)) return { ok: false, message: TAKEN };
    throw error;
  }
  refresh();
  return { ok: true };
}

// note: renaming changes the slug, so old ?category= links stop working
export async function updateCategoryAction(rawId: unknown, input: unknown): Promise<AdminActionResult> {
  await requireAdmin();
  const id = objectId.safeParse(rawId);
  if (!id.success) return { ok: false, message: "That category no longer exists." };
  const result = parse(input);
  if (!result.data) return { ok: false, message: result.error };
  await connectDB();
  try {
    const updated = await Category.findByIdAndUpdate(id.data, { $set: result.data }, { runValidators: true });
    if (!updated) return { ok: false, message: "That category no longer exists." };
  } catch (error) {
    if (isDuplicateKeyError(error)) return { ok: false, message: TAKEN };
    throw error;
  }
  refresh();
  return { ok: true };
}

export async function deleteCategoryAction(rawId: unknown): Promise<AdminActionResult> {
  await requireAdmin();
  const id = objectId.safeParse(rawId);
  if (!id.success) return { ok: false, message: "That category no longer exists." };
  await connectDB();
  const inUse = await Product.countDocuments({ category: id.data });
  if (inUse > 0) {
    return { ok: false, message: `${inUse} ${inUse === 1 ? "product uses" : "products use"} this category. Move them first.` };
  }
  await Category.deleteOne({ _id: id.data });
  refresh();
  return { ok: true };
}
