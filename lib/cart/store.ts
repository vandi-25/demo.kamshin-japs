import "server-only";

import { isValidObjectId, type Types } from "mongoose";
import { cookies } from "next/headers";

import type { CartLine, CartSummary } from "@/components/cart/types";
import { connectDB } from "@/lib/db";
import { Cart, Product } from "@/lib/models";
import { lineTotalKobo, sumKobo } from "@/lib/money";
import { placeholderArt } from "@/lib/placeholder-art";

import { maxQuantity, type CartItem, type StockInfo } from "./rules";

// Logged-in users have one cart (user = their id). Guests get a cart whose id lives in the
// httpOnly cartId cookie (user = null). We never store prices in the cart.
// Don't import @/auth here - auth.ts imports this file for the login merge.

export const CART_COOKIE = "cartId";

// matches the TTL index on Cart (60 days)
export const cartCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 24 * 60 * 60,
} as const;

export type CartOwner = { userId: string | null };

type ProductRow = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  priceKobo: number;
  stock: number;
  isActive: boolean;
  sizeMl?: number | null;
  concentration?: string | null;
};

type CartRow = { _id: Types.ObjectId; items: { product: Types.ObjectId; quantity: number }[] };

async function guestCartId(): Promise<string | null> {
  const id = (await cookies()).get(CART_COOKIE)?.value;
  return id && isValidObjectId(id) ? id : null;
}

async function cartQuery(owner: CartOwner): Promise<Record<string, unknown> | null> {
  if (owner.userId) return { user: owner.userId };
  const id = await guestCartId();
  return id ? { _id: id, user: null } : null;
}

export async function loadProducts(ids: string[]): Promise<Map<string, ProductRow>> {
  if (ids.length === 0) return new Map();
  const rows = await Product.find({ _id: { $in: ids } })
    .select("name slug priceKobo stock isActive sizeMl concentration")
    .lean<ProductRow[]>();
  return new Map(rows.map((p) => [String(p._id), p]));
}

export function stockMap(products: Map<string, ProductRow>): Map<string, StockInfo> {
  return new Map([...products].map(([id, p]) => [id, { stock: p.stock, isActive: p.isActive }]));
}

export function toItems(cart: CartRow | null): CartItem[] {
  return (cart?.items ?? []).map((i) => ({ productId: String(i.product), quantity: i.quantity }));
}

// header badge only, so no product lookups
export async function getCartCount(owner: CartOwner): Promise<number> {
  const query = await cartQuery(owner);
  if (!query) return 0;
  await connectDB();
  const cart = await Cart.findOne(query).select("items.quantity").lean<CartRow>();
  return (cart?.items ?? []).reduce((n, i) => n + i.quantity, 0);
}

// Loads the cart with live prices/stock. Lines for hidden/deleted products or with more than
// what's in stock get fixed and saved, with a notice for the customer (shows once).
export async function getCartSummary(owner: CartOwner): Promise<CartSummary> {
  const empty: CartSummary = { lines: [], subtotalKobo: 0, itemCount: 0, notices: [] };
  const query = await cartQuery(owner);
  if (!query) return empty;

  await connectDB();
  const cart = await Cart.findOne(query).select("items").lean<CartRow>();
  if (!cart || cart.items.length === 0) return empty;

  const items = toItems(cart);
  const products = await loadProducts(items.map((i) => i.productId));
  const lines: CartLine[] = [];
  const notices: string[] = [];
  const kept: CartItem[] = [];

  for (const item of items) {
    const product = products.get(item.productId);
    const max = maxQuantity(product && { stock: product.stock, isActive: product.isActive });
    if (!product || max === 0) {
      const name = product?.name ?? "An item";
      notices.push(product?.isActive && product.stock <= 0 ? `${name} sold out and was removed from your bag.` : `${name} is no longer available and was removed from your bag.`);
      continue;
    }
    const quantity = Math.min(item.quantity, max);
    if (quantity < item.quantity) notices.push(`Only ${max} of ${product.name} available — we've updated your bag.`);
    kept.push({ productId: item.productId, quantity });
    lines.push({
      product: {
        id: item.productId,
        slug: product.slug,
        name: product.name,
        priceKobo: product.priceKobo,
        maxQuantity: max,
        sizeMl: product.sizeMl ?? 0,
        concentration: product.concentration ?? "",
        ...placeholderArt(product.slug),
      },
      quantity,
      lineKobo: lineTotalKobo(product.priceKobo, quantity),
    });
  }

  if (notices.length > 0) {
    await Cart.updateOne(
      { _id: cart._id },
      { $set: { items: kept.map((i) => ({ product: i.productId, quantity: i.quantity })) } },
    );
  }

  return {
    lines,
    subtotalKobo: sumKobo(lines.map((l) => l.lineKobo)),
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    notices,
  };
}

export async function findCart(owner: CartOwner) {
  const query = await cartQuery(owner);
  if (!query) return null;
  await connectDB();
  return Cart.findOne(query);
}

// Sets a cookie for new guest carts, so only call this from a server action / route handler.
export async function findOrCreateCart(owner: CartOwner) {
  await connectDB();
  if (owner.userId) {
    const filter = { user: owner.userId };
    try {
      return await Cart.findOneAndUpdate(filter, { $setOnInsert: { items: [] } }, { upsert: true, returnDocument: "after" });
    } catch (error) {
      // lost a race with another request creating the same cart
      if (error instanceof Error && "code" in error && error.code === 11000) return Cart.findOne(filter);
      throw error;
    }
  }

  const existing = await findCart(owner);
  if (existing) return existing;
  const cart = await Cart.create({ user: null, items: [] });
  (await cookies()).set(CART_COOKIE, String(cart._id), cartCookieOptions);
  return cart;
}

// On login: fold the guest cart into the user's cart and clear the cookie.
// If they don't have a cart yet we just hand them the guest one.
export async function mergeGuestCartIntoUser(userId: string, merge: (user: CartItem[], guest: CartItem[], stock: Map<string, StockInfo>) => CartItem[]) {
  const guestId = await guestCartId();
  if (!guestId || !isValidObjectId(userId)) return;
  const jar = await cookies();

  await connectDB();
  const guest = await Cart.findOne({ _id: guestId, user: null });
  if (guest) {
    const userCart = await Cart.findOne({ user: userId });
    const userItems = toItems(userCart);
    const guestItems = toItems(guest);
    const products = await loadProducts([...new Set([...userItems, ...guestItems].map((i) => i.productId))]);
    const merged = merge(userItems, guestItems, stockMap(products)).map((i) => ({ product: i.productId, quantity: i.quantity }));

    if (userCart) {
      userCart.set("items", merged);
      await userCart.save();
      await guest.deleteOne();
    } else {
      guest.set({ user: userId, items: merged });
      await guest.save();
    }
  }
  jar.delete(CART_COOKIE);
}
