import type { BottleShape } from "@/lib/demo/catalog";

export type CartProduct = {
  id: string;
  slug: string;
  name: string;
  // live price, never stored in the cart
  priceKobo: number;
  // min(stock, per-line cap)
  maxQuantity: number;
  sizeMl: number;
  concentration: string;
  tone: string;
  bottle: BottleShape;
};

export type CartLine = { product: CartProduct; quantity: number; lineKobo: number };

export type CartSummary = {
  lines: CartLine[];
  subtotalKobo: number;
  itemCount: number;
  // e.g. stock dropped since last visit
  notices: string[];
};
