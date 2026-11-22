"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/guards";
import { connectDB } from "@/lib/db";
import { Cart, Category, Order, Product } from "@/lib/models";
import { productFormSchema, quickEditSchema } from "@/lib/validation/product";

import { type AdminActionResult, fieldErrors, isDuplicateKeyError, objectId } from "./shared";

// Every action re-checks admin access and validates its input - server actions can be
// called directly, not just from our forms.

const SLUG_TAKEN = { slug: "Another product already uses this URL slug" };

async function validateProduct(input: unknown) {
  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) return { error: { ok: false, fieldErrors: fieldErrors(parsed.error) } satisfies AdminActionResult };
  const data = parsed.data;
  const categoryOk = objectId.safeParse(data.categoryId).success && (await Category.exists({ _id: data.categoryId }));
  if (!categoryOk) return { error: { ok: false, fieldErrors: { categoryId: "Choose a category" } } satisfies AdminActionResult };
  return {
    doc: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      priceKobo: data.price,
      compareAtPriceKobo: data.compareAtPrice,
      stock: data.stock,
      category: data.categoryId,
      sizeMl: data.sizeMl,
      concentration: data.concentration,
      topNotes: data.topNotes,
      heartNotes: data.heartNotes,
      baseNotes: data.baseNotes,
      isActive: data.isActive,
      isFeatured: data.isFeatured,
    },
  };
}

export async function createProductAction(input: unknown): Promise<AdminActionResult> {
  await requireAdmin();
  await connectDB();
  const result = await validateProduct(input);
  if (result.error) return result.error;
  try {
    await Product.create(result.doc);
  } catch (error) {
    if (isDuplicateKeyError(error)) return { ok: false, fieldErrors: SLUG_TAKEN };
    throw error;
  }
  redirect("/admin/products");
}

export async function updateProductAction(rawId: unknown, input: unknown): Promise<AdminActionResult> {
  await requireAdmin();
  const id = objectId.safeParse(rawId);
  if (!id.success) return { ok: false, message: "That product no longer exists." };
  await connectDB();
  const result = await validateProduct(input);
  if (result.error) return result.error;
  try {
    const updated = await Product.findByIdAndUpdate(id.data, { $set: result.doc }, { runValidators: true });
    if (!updated) return { ok: false, message: "That product no longer exists." };
  } catch (error) {
    if (isDuplicateKeyError(error)) return { ok: false, fieldErrors: SLUG_TAKEN };
    throw error;
  }
  redirect("/admin/products");
}

export async function quickEditProductAction(rawId: unknown, input: unknown): Promise<AdminActionResult> {
  await requireAdmin();
  const id = objectId.safeParse(rawId);
  const parsed = quickEditSchema.safeParse(input);
  if (!id.success) return { ok: false, message: "That product no longer exists." };
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the values" };

  await connectDB();
  const product = await Product.findById(id.data);
  if (!product) return { ok: false, message: "That product no longer exists." };
  product.priceKobo = parsed.data.price;
  product.stock = parsed.data.stock;
  // drop a compare-at price that's no longer above the price
  let message: string | undefined;
  if (product.compareAtPriceKobo != null && product.compareAtPriceKobo <= parsed.data.price) {
    product.compareAtPriceKobo = null;
    message = "The compare-at price was removed because it's no longer higher than the price.";
  }
  await product.save();
  refresh();
  return { ok: true, message };
}

// Products that were ordered get hidden instead of deleted. Deleting also removes it from carts.
export async function deleteProductAction(rawId: unknown): Promise<AdminActionResult> {
  await requireAdmin();
  const id = objectId.safeParse(rawId);
  if (!id.success) return { ok: false, message: "That product no longer exists." };
  await connectDB();

  if (await Order.exists({ "items.product": id.data })) {
    await Product.updateOne({ _id: id.data }, { $set: { isActive: false, isFeatured: false } });
    redirect("/admin/products?notice=deactivated");
  }
  // TODO: delete the product's blob files once photo uploads exist
  await Product.deleteOne({ _id: id.data });
  await Cart.updateMany({ "items.product": id.data }, { $pull: { items: { product: id.data } } });
  redirect("/admin/products?notice=deleted");
}
