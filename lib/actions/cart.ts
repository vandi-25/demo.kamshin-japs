"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth/guards";
import { clampQuantity, MAX_LINE_QUANTITY, maxQuantity } from "@/lib/cart/rules";
import { findCart, findOrCreateCart } from "@/lib/cart/store";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models";

// Validate everything and re-check stock on every change.

export type CartActionResult = { ok: boolean; quantity?: number; message?: string };

const productId = z.string().regex(/^[a-f0-9]{24}$/i, "Unknown product");

async function owner() {
  const user = await getSessionUser();
  return { userId: user?.id ?? null };
}

async function stockFor(id: string) {
  const product = await Product.findById(id).select("name stock isActive").lean<{ name: string; stock: number; isActive: boolean }>();
  return product ? { name: product.name, info: { stock: product.stock, isActive: product.isActive } } : null;
}

export async function addToCartAction(rawId: unknown, rawQuantity: unknown): Promise<CartActionResult> {
  const parsed = z
    .object({ id: productId, quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY) })
    .safeParse({ id: rawId, quantity: rawQuantity });
  if (!parsed.success) return { ok: false, message: "Couldn't add that to your bag." };
  const { id, quantity } = parsed.data;

  await connectDB();
  const product = await stockFor(id);
  const max = maxQuantity(product?.info);
  if (!product || max === 0) {
    return { ok: false, message: product?.info.isActive ? `${product.name} is sold out.` : "This fragrance is no longer available." };
  }

  const cart = await findOrCreateCart(await owner());
  if (!cart) return { ok: false, message: "Couldn't open your bag. Please try again." };
  const line = cart.items.find((i) => String(i.product) === id);
  const current = line?.quantity ?? 0;
  const next = clampQuantity(current + quantity, product.info);

  if (next <= current) {
    return { ok: false, quantity: current, message: `You already have the most we can sell of ${product.name} (${max}) in your bag.` };
  }
  if (line) line.quantity = next;
  else cart.items.push({ product: id, quantity: next });
  await cart.save();
  refresh();

  const added = next - current;
  return {
    ok: true,
    quantity: next,
    message: added < quantity ? `Only ${max} available — added ${added}, you now have ${next}.` : undefined,
  };
}

export async function updateCartQuantityAction(rawId: unknown, rawQuantity: unknown): Promise<CartActionResult> {
  const parsed = z
    .object({ id: productId, quantity: z.number().int().min(0).max(MAX_LINE_QUANTITY) })
    .safeParse({ id: rawId, quantity: rawQuantity });
  if (!parsed.success) return { ok: false, message: "Couldn't update your bag." };
  const { id, quantity } = parsed.data;

  const cart = await findCart(await owner());
  const line = cart?.items.find((i) => String(i.product) === id);
  if (!cart || !line) {
    refresh();
    return { ok: false, message: "That item is no longer in your bag." };
  }

  const product = await stockFor(id);
  const next = clampQuantity(quantity, product?.info);
  if (next === 0) cart.items.pull(line);
  else line.quantity = next;
  await cart.save();
  refresh();

  if (quantity > 0 && next < quantity) {
    return {
      ok: next > 0,
      quantity: next,
      message: next === 0 ? `${product?.name ?? "That item"} is no longer available.` : `Only ${next} available.`,
    };
  }
  return { ok: true, quantity: next };
}

export async function removeFromCartAction(rawId: unknown): Promise<CartActionResult> {
  const parsed = productId.safeParse(rawId);
  if (!parsed.success) return { ok: false };
  const cart = await findCart(await owner());
  if (cart) {
    cart.items.pull({ product: parsed.data });
    await cart.save();
  }
  refresh();
  return { ok: true };
}

// used by the checkout success page for now
export async function clearCartAction(): Promise<void> {
  const cart = await findCart(await owner());
  if (cart && cart.items.length > 0) {
    cart.set("items", []);
    await cart.save();
    refresh();
  }
}
