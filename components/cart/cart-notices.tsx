import { Info } from "lucide-react";

export function CartNotices({ notices }: { notices: string[] }) {
  if (notices.length === 0) return null;
  return (
    <div role="status" className="mb-8 rounded-md border border-gold/50 bg-gold/10 px-4 py-3 text-sm">
      <ul className="space-y-1">
        {notices.map((n) => (
          <li key={n} className="flex gap-2">
            <Info className="mt-0.5 size-4 shrink-0 text-gold-text" aria-hidden />
            {n}
          </li>
        ))}
      </ul>
    </div>
  );
}
