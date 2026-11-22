"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function StoreError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorFallback error={error} retry={retry} homeHref="/" homeLabel="Go to the shop" />;
}
