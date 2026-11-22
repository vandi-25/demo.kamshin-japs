"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorFallback error={error} retry={retry} homeHref="/admin" homeLabel="Back to dashboard" />;
}
