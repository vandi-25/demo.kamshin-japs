import { Sparkles } from "lucide-react";

export function DemoBanner() {
  return (
    <div role="region" aria-label="Preview notice" className="bg-gold px-4 py-1.5 text-center text-xs font-medium text-burgundy">
      <Sparkles className="mr-1.5 inline size-3.5 align-[-2px]" aria-hidden />
      Preview · checkout and orders are sample data · payments are not live yet
    </div>
  );
}
