"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { addToCartAction } from "@/lib/actions/cart";
import { safeAction } from "@/lib/client/safe-action";
import { MAX_LINE_QUANTITY } from "@/lib/cart/rules";

import { QuantitySelector } from "./quantity-selector";

export function AddToCart({ productId, name, stock }: { productId: string; name: string; stock: number }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [pending, startTransition] = useTransition();
  const max = Math.min(stock, MAX_LINE_QUANTITY);

  if (stock <= 0) {
    return (
      <Button size="lg" variant="secondary" disabled className="w-full sm:w-auto">
        Sold out
      </Button>
    );
  }

  const add = () =>
    startTransition(async () => {
      // The server re-checks stock and may add fewer than asked; it refreshes the page (header count) itself.
      const result = await safeAction(() => addToCartAction(productId, quantity));
      if (!result) return;
      if (!result.ok) {
        toast.error(result.message ?? "Couldn't add that to your bag.");
        return;
      }
      toast.success(`${name} added to your bag`, {
        description: result.message,
        action: { label: "View bag", onClick: () => router.push("/cart") },
      });
      setQuantity(1);
    });

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <QuantitySelector value={quantity} onChange={setQuantity} max={max} label="Quantity" />
      <Button size="lg" className="flex-1 tracking-[0.12em] uppercase" onClick={add} disabled={pending}>
        <ShoppingBag aria-hidden /> {pending ? "Adding…" : "Add to bag"}
      </Button>
      <Link href="/cart" className="sr-only focus:not-sr-only">
        Go to bag
      </Link>
    </div>
  );
}
