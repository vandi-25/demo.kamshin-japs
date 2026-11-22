import type { Metadata } from "next";

import { CartNotices } from "@/components/cart/cart-notices";
import { CheckoutView } from "@/components/cart/checkout-view";
import { requireUser } from "@/lib/auth/guards";
import { getCartSummary } from "@/lib/cart/store";
import { DEMO_SHIPPING_KOBO, demoAddresses } from "@/lib/demo/orders";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  // Checkout needs an account. Guests sign in and come back here; their bag is merged on sign-in.
  const user = await requireUser("/checkout");
  const cart = await getCartSummary({ userId: user.id });
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
      <p className="text-xs tracking-[0.22em] text-gold-text uppercase">Secure checkout</p>
      <h1 className="mt-2 mb-10 text-5xl">Checkout</h1>
      <CartNotices notices={cart.notices} />
      {/* addresses, shipping and payment are still sample data */}
      <CheckoutView cart={cart} shippingKobo={DEMO_SHIPPING_KOBO} addresses={demoAddresses} customerName={user.name} />
    </div>
  );
}
