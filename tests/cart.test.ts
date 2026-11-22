import { describe, expect, it } from "vitest";

import { clampQuantity, MAX_LINE_QUANTITY, maxQuantity, mergeCartItems, type StockInfo } from "@/lib/cart/rules";

const stock = (entries: Record<string, StockInfo>) => new Map(Object.entries(entries));

describe("maxQuantity / clampQuantity", () => {
  it("caps at stock", () => {
    expect(maxQuantity({ stock: 3, isActive: true })).toBe(3);
    expect(clampQuantity(5, { stock: 3, isActive: true })).toBe(3);
  });

  it("caps at the per-line maximum even with lots of stock", () => {
    expect(clampQuantity(500, { stock: 1000, isActive: true })).toBe(MAX_LINE_QUANTITY);
  });

  it("returns 0 for hidden, deleted or sold-out products", () => {
    expect(maxQuantity({ stock: 10, isActive: false })).toBe(0);
    expect(maxQuantity(undefined)).toBe(0);
    expect(maxQuantity({ stock: 0, isActive: true })).toBe(0);
    expect(maxQuantity({ stock: -2, isActive: true })).toBe(0);
  });

  it("never returns negative or fractional quantities", () => {
    expect(clampQuantity(-4, { stock: 5, isActive: true })).toBe(0);
    expect(clampQuantity(2.7, { stock: 5, isActive: true })).toBe(2);
    expect(clampQuantity(Number.NaN, { stock: 5, isActive: true })).toBe(0);
  });
});

describe("mergeCartItems (guest cart → user cart on login)", () => {
  it("adds quantities for the same product", () => {
    const merged = mergeCartItems(
      [{ productId: "a", quantity: 1 }],
      [{ productId: "a", quantity: 2 }],
      stock({ a: { stock: 10, isActive: true } }),
    );
    expect(merged).toEqual([{ productId: "a", quantity: 3 }]);
  });

  it("caps the sum at stock", () => {
    const merged = mergeCartItems(
      [{ productId: "a", quantity: 3 }],
      [{ productId: "a", quantity: 4 }],
      stock({ a: { stock: 5, isActive: true } }),
    );
    expect(merged).toEqual([{ productId: "a", quantity: 5 }]);
  });

  it("keeps the user's lines first, then new guest lines", () => {
    const merged = mergeCartItems(
      [{ productId: "u", quantity: 1 }],
      [{ productId: "g", quantity: 2 }, { productId: "u", quantity: 1 }],
      stock({ u: { stock: 9, isActive: true }, g: { stock: 9, isActive: true } }),
    );
    expect(merged).toEqual([{ productId: "u", quantity: 2 }, { productId: "g", quantity: 2 }]);
  });

  it("drops products that were deleted, hidden or sold out", () => {
    const merged = mergeCartItems(
      [{ productId: "gone", quantity: 1 }],
      [{ productId: "hidden", quantity: 1 }, { productId: "soldout", quantity: 1 }, { productId: "ok", quantity: 1 }],
      stock({ hidden: { stock: 5, isActive: false }, soldout: { stock: 0, isActive: true }, ok: { stock: 5, isActive: true } }),
    );
    expect(merged).toEqual([{ productId: "ok", quantity: 1 }]);
  });

  it("handles an empty guest cart", () => {
    expect(mergeCartItems([{ productId: "a", quantity: 2 }], [], stock({ a: { stock: 5, isActive: true } }))).toEqual([
      { productId: "a", quantity: 2 },
    ]);
  });
});
