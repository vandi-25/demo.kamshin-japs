import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { getSessionUser } from "@/lib/auth/guards";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Create Account" };

export default async function SignupPage(props: PageProps<"/signup">) {
  const { callbackUrl } = await props.searchParams;
  const returnTo = safeRedirectPath(callbackUrl, "/products");
  if (await getSessionUser()) redirect(returnTo);

  return (
    <AuthShell title="Create your account" subtitle="Save addresses, check out in seconds and follow every order.">
      <SignupForm callbackUrl={returnTo} />
    </AuthShell>
  );
}
