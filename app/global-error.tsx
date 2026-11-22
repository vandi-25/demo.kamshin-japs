"use client";

import { useEffect } from "react";

// Only shows if the root layout itself breaks, so it needs its own <html> and inline styles.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#faf6f1", color: "#2a1a1d" }}>
        <title>Something went wrong | Kamshin</title>
        <main
          role="alert"
          style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", textAlign: "center" }}
        >
          <div>
            <p style={{ letterSpacing: "0.3em", color: "#4B0F1A", margin: 0 }}>KAMSHIN</p>
            <h1 style={{ fontWeight: 400, fontSize: "2rem", margin: "24px 0 8px" }}>Something went wrong</h1>
            <p style={{ color: "#6b5b5e", margin: 0 }}>Please try again in a moment.</p>
            <button
              type="button"
              onClick={() => retry()}
              style={{ marginTop: 24, padding: "10px 20px", background: "#4B0F1A", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
