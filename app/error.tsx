"use client";

import { ErrorFallback } from "@/components/error-fallback";

// catches errors in section layouts, e.g. the store header
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorFallback error={error} retry={retry} homeHref="/" homeLabel="Go to the homepage" />;
}
