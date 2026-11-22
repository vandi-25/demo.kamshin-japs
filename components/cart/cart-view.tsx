"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { BottleArt } from "@/components/store/bottle-art";
import { useMoney } from "@/components/store/currency-provider";
import { removeFromCartAction, updateCartQuantityAction } from "@/lib/actions/cart";
import { safeAction } from "@/lib/client/safe-action";
import { cn } from "@/lib/utils";

import { QuantitySelector } from "./quantity-selector";
import type { CartSummary } from "./types";

export function CartView({
  cart,
  shippingKobo,
  signedIn,
}: {
  cart: CartSummary;
  shippingKobo: number;
  signedIn: boolean;
}) {
  const { lines, subtotalKobo, itemCount } = cart;
  const { format, formatNaira, isConverted } = useMoney();
  const [pending, startTransition] = useTransition();

  // Each change goes to the server, which re-checks stock and refreshes this page with the new totals.
  const setQuantity = (id: string, quantity: number) =>
    startTransition(async () => {
      const result = await safeAction(() => updateCartQuantityAction(id, quantity));
      if (result?.message) toast.info(result.message);
    });
  const remove = (id: string) =>
    startTransition(async () => {
      await safeAction(() => removeFromCartAction(id));
    });

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-md border border-dashed bg-card px-6 py-20 text-center">
        <ShoppingBag className="size-10 text-taupe" aria-hidden />
        <h2 className="mt-4 text-3xl">Your bag is empty</h2>
        <p className="mt-2 max-w-sm text-muted-foreground">Discover a scent you&apos;ll love and it will wait for you here.</p>
        <Button asChild className="mt-6 tracking-[0.12em] uppercase">
          <Link href="/products">Shop fragrances</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <ul className={cn("divide-y border-y transition-opacity", pending && "opacity-60")} aria-busy={pending}>
        {lines.map(({ product, quantity, lineKobo }) => (
          <li key={product.id} className="flex gap-4 py-6 sm:gap-6">
            <Link
              href={`/products/${product.slug}`}
              className="flex aspect-[4/5] w-24 shrink-0 items-end justify-center rounded-md bg-gradient-to-b from-[#f6efe7] to-[#ebdfd2] p-3 sm:w-28"
            >
              <BottleArt tone={product.tone} shape={product.bottle} name={product.name} />
            </Link>
            <div className="flex flex-1 flex-col">
              <div className="flex justify-between gap-4">
                <div>
                  <Link href={`/products/${product.slug}`} className="font-serif text-2xl leading-tight hover:text-burgundy">
                    {product.name}
                  </Link>
                  <p className="mt-1 text-xs tracking-[0.14em] text-gold-text uppercase">
                    {product.concentration} · {product.sizeMl}ml
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{format(product.priceKobo)} each</p>
                </div>
                <p className="font-medium">{format(lineKobo)}</p>
              </div>
              <div className="mt-auto flex items-center justify-between pt-4">
                <QuantitySelector
                  size="sm"
                  value={quantity}
                  max={product.maxQuantity}
                  disabled={pending}
                  label={`Quantity for ${product.name}`}
                  onChange={(q) => setQuantity(product.id, q)}
                />
                <Button variant="ghost" size="sm" onClick={() => remove(product.id)} disabled={pending} className="text-muted-foreground">
                  <Trash2 aria-hidden /> Remove
                </Button>
              </div>
              {quantity >= product.maxQuantity && (
                <p className="mt-2 text-xs text-warning">Maximum available quantity reached</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      <aside aria-labelledby="summary-heading" className="h-fit rounded-md border bg-card p-6 lg:sticky lg:top-28">
        <h2 id="summary-heading" className="text-3xl">Order summary</h2>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</dt>
            <dd>{format(subtotalKobo)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Delivery (flat rate)</dt>
            <dd>{format(shippingKobo)}</dd>
          </div>
          {/* A border instead of <hr>: a <dl> may only contain dt/dd groups. */}
          <div className="flex justify-between border-t pt-3 text-base font-medium">
            <dt>Total</dt>
            <dd>{format(subtotalKobo + shippingKobo)}</dd>
          </div>
        </dl>
        {isConverted && (
          <p className="mt-3 text-xs text-muted-foreground">
            Approximate. You&apos;ll be charged {formatNaira(subtotalKobo + shippingKobo)} in naira.
          </p>
        )}
        <Button asChild size="lg" className={cn("mt-6 w-full tracking-[0.14em] uppercase", pending && "pointer-events-none opacity-60")}>
          <Link href="/checkout" aria-disabled={pending}>
            Checkout
          </Link>
        </Button>
        {!signedIn && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            You&apos;ll sign in or create an account at checkout. Your bag comes with you.
          </p>
        )}
        <Link href="/products" className="mt-5 block text-center text-sm text-burgundy underline-offset-4 hover:underline">
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}
