"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { quickEditProductAction } from "@/lib/actions/admin/products";
import { safeAction } from "@/lib/client/safe-action";
import { formatNaira, koboToNairaInput } from "@/lib/money";
import { quickEditSchema } from "@/lib/validation/product";

// Inline price/stock edit. The table row is keyed on price+stock so this remounts after a save.
export function QuickEdit({ id, name, priceKobo, stock }: { id: string; name: string; priceKobo: number; stock: number }) {
  const [editing, setEditing] = useState(false);
  const values = { price: priceKobo, stock };
  const [draft, setDraft] = useState({ price: koboToNairaInput(priceKobo), stock: String(stock) });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <span className="w-28 tabular-nums">{formatNaira(values.price)}</span>
        <span className={`w-16 tabular-nums ${values.stock === 0 ? "text-destructive" : values.stock <= 5 ? "text-warning" : ""}`}>
          {values.stock}
        </span>
        <Button variant="ghost" size="icon-sm" onClick={() => setEditing(true)} aria-label={`Quick edit price and stock for ${name}`}>
          <Pencil />
        </Button>
      </div>
    );
  }

  const save = () => {
    const parsed = quickEditSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the values");
      return;
    }
    startTransition(async () => {
      const result = await safeAction(() => quickEditProductAction(id, draft));
      if (!result) return;
      if (!result.ok) {
        setError(result.message ?? "Couldn't save");
        return;
      }
      setEditing(false);
      setError(null);
      toast.success(`${name} updated`, { description: result.message });
    });
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`price-${name}`}>Price in naira</label>
        <Input
          id={`price-${name}`}
          value={draft.price}
          onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
          inputMode="decimal"
          className="h-8 w-28"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <label className="sr-only" htmlFor={`stock-${name}`}>Stock</label>
        <Input
          id={`stock-${name}`}
          value={draft.stock}
          onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.value }))}
          inputMode="numeric"
          className="h-8 w-16"
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <Button size="icon-sm" onClick={save} disabled={pending} aria-label="Save">
          <Check />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Cancel"
          onClick={() => {
            setEditing(false);
            setError(null);
            setDraft({ price: koboToNairaInput(values.price), stock: String(values.stock) });
          }}
        >
          <X />
        </Button>
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
