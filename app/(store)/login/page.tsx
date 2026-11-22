import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getSessionUser } from "@/lib/auth/guards";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Sign In" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { callbackUrl } = await props.searchParams;
  const returnTo = safeRedirectPath(callbackUrl, "/account/orders");
  if (await getSessionUser()) redirect(returnTo);

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to check out faster and track your orders.">
      <LoginForm callbackUrl={returnTo} />
    </AuthShell>
  );
}
