import type { Metadata } from "next";

import { CartNotices } from "@/components/cart/cart-notices";
import { CartView } from "@/components/cart/cart-view";
import { getSessionUser } from "@/lib/auth/guards";
import { getCartSummary } from "@/lib/cart/store";
import { DEMO_SHIPPING_KOBO } from "@/lib/demo/orders";

export const metadata: Metadata = { title: "Shopping Bag", robots: { index: false } };

export default async function CartPage() {
  const user = await getSessionUser();
  const cart = await getCartSummary({ userId: user?.id ?? null });
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
      <h1 className="mb-10 text-5xl">Shopping bag</h1>
      <CartNotices notices={cart.notices} />
      <CartView cart={cart} shippingKobo={DEMO_SHIPPING_KOBO} signedIn={!!user} />
    </div>
  );
}
