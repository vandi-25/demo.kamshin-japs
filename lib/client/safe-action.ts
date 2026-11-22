"use client";

import { toast } from "sonner";

// Wraps a server action call from the browser. If it throws (DB down, offline) show a
// toast instead of blowing up the page.
export async function safeAction<T>(run: () => Promise<T>, message = "Something went wrong. Please try again."): Promise<T | null> {
  try {
    return await run();
  } catch (error) {
    console.error(error);
    toast.error(message);
    return null;
  }
}
