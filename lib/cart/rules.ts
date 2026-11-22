// Cart rules (no DB/Next imports so they're easy to test).

export const MAX_LINE_QUANTITY = 20;

export type CartItem = { productId: string; quantity: number };

export type StockInfo = { stock: number; isActive: boolean };

// 0 = can't be bought
export function maxQuantity(info: StockInfo | undefined): number {
  if (!info || !info.isActive) return 0;
  return Math.max(0, Math.min(Math.floor(info.stock), MAX_LINE_QUANTITY));
}

export function clampQuantity(requested: number, info: StockInfo | undefined): number {
  if (!Number.isFinite(requested)) return 0;
  return Math.min(Math.max(0, Math.floor(requested)), maxQuantity(info));
}

// Login merge: add up quantities, cap at stock, drop anything that can't be bought.
// User's existing lines come first.
export function mergeCartItems(
  userItems: CartItem[],
  guestItems: CartItem[],
  stock: Map<string, StockInfo>,
): CartItem[] {
  const totals = new Map<string, number>();
  for (const item of [...userItems, ...guestItems]) {
    totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
  }
  const merged: CartItem[] = [];
  for (const [productId, quantity] of totals) {
    const capped = clampQuantity(quantity, stock.get(productId));
    if (capped > 0) merged.push({ productId, quantity: capped });
  }
  return merged;
}
