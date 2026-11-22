"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

// Shared error screen. Server errors only come with a digest (to find in the logs), never details.
export function ErrorFallback({
  error,
  retry,
  homeHref,
  homeLabel,
}: {
  error: unknown;
  retry: () => void;
  homeHref: string;
  homeLabel: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : null;

  return (
    <div role="alert" className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <TriangleAlert className="size-12 text-burgundy" aria-hidden strokeWidth={1.25} />
      <h1 className="mt-6 text-4xl sm:text-5xl">Something went wrong</h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        We couldn&apos;t load this page. Please try again in a moment — if it keeps happening, let us know.
      </p>
      {digest && <p className="mt-2 font-mono text-xs text-muted-foreground">Reference: {digest}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={() => retry()} className="tracking-[0.12em] uppercase">
          Try again
        </Button>
        <Button asChild variant="outline" className="tracking-[0.12em] uppercase">
          <a href={homeHref}>{homeLabel}</a>
        </Button>
      </div>
    </div>
  );
}
