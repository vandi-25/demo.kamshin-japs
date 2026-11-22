"use server";

import { headers } from "next/headers";
import { AuthError, CredentialsSignin } from "next-auth";
import { z } from "zod";

import { signIn, signOut } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { hashPassword } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { loginSchema, signupSchema } from "@/lib/validation/auth";

// Returned to the form when something's wrong (on success we redirect).
export type AuthActionResult = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "password" | "confirmPassword", string>>;
};

function firstFieldErrors(error: z.ZodError): AuthActionResult["fieldErrors"] {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

// Auth.js signals success by throwing a redirect, so only catch AuthErrors.
async function signInWithCredentials(
  credentials: { email: string; password: string; scope: "store" | "admin" },
  redirectTo: string,
  failureMessage: string,
): Promise<AuthActionResult> {
  try {
    await signIn("credentials", { ...credentials, redirectTo });
    return {};
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === "rate_limited") {
      return { error: "Too many sign-in attempts. Please wait 15 minutes and try again." };
    }
    if (error instanceof AuthError) return { error: failureMessage };
    throw error; // the success redirect, or a real failure (e.g. database down)
  }
}

export async function loginAction(input: unknown, callbackUrl?: string): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error) };
  return signInWithCredentials(
    { ...parsed.data, scope: "store" },
    safeRedirectPath(callbackUrl, "/account/orders"),
    "That email and password don't match an account.",
  );
}

export async function adminLoginAction(input: unknown): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error) };
  // scope=admin makes authorize() reject non-admins
  return signInWithCredentials(
    { ...parsed.data, scope: "admin" },
    "/admin",
    "Those details don't match an admin account.",
  );
}

export async function signupAction(input: unknown, callbackUrl?: string): Promise<AuthActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error) };
  const { name, email, password } = parsed.data;

  const limit = await rateLimit.hit("signupPerIp", clientIp(await headers()));
  if (!limit.success) return { error: "Too many accounts created from this network. Please try again later." };

  await connectDB();
  if (await User.exists({ email })) {
    return { fieldErrors: { email: "An account with this email already exists. Sign in instead." } };
  }

  try {
    // new accounts are always customers
    await User.create({ name, email, passwordHash: await hashPassword(password), role: "CUSTOMER" });
  } catch (error) {
    // two signups with the same email at the same time
    if (error instanceof Error && "code" in error && error.code === 11000) {
      return { fieldErrors: { email: "An account with this email already exists. Sign in instead." } };
    }
    throw error;
  }

  return signInWithCredentials(
    { email, password, scope: "store" },
    safeRedirectPath(callbackUrl, "/products"),
    "Your account was created, but signing in failed. Please sign in.",
  );
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function adminLogoutAction(): Promise<void> {
  await signOut({ redirectTo: "/admin/login" });
}
