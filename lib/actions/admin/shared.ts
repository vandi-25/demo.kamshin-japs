import { z } from "zod";

export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Unknown record");

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === 11000;
}

export type AdminActionResult = { ok: boolean; message?: string; fieldErrors?: Record<string, string> };
