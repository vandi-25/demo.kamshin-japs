"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminLoginAction, loginAction } from "@/lib/actions/auth";
import { safeAction } from "@/lib/client/safe-action";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

export function LoginForm({ callbackUrl, variant = "store" }: { callbackUrl?: string; variant?: "store" | "admin" }) {
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const { errors, isSubmitting } = form.formState;
  const [formError, setFormError] = useState<string>();

  const onSubmit = form.handleSubmit(async (data) => {
    setFormError(undefined);
    // On success the server action redirects; it only returns when something is wrong.
    const result = await safeAction(() => (variant === "admin" ? adminLoginAction(data) : loginAction(data, callbackUrl)));
    if (result?.fieldErrors?.email) form.setError("email", { message: result.fieldErrors.email });
    if (result?.fieldErrors?.password) form.setError("password", { message: result.fieldErrors.password });
    if (result?.error) {
      setFormError(result.error);
      form.resetField("password");
    }
  });

  const signupHref = callbackUrl ? `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/signup";

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      )}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" className="mt-2" aria-invalid={!!errors.email} aria-describedby="email-error" {...form.register("email")} />
        <FieldError id="email-error" message={errors.email?.message} />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          {variant === "store" && (
            <span className="text-xs text-muted-foreground">Forgot password? (coming soon)</span>
          )}
        </div>
        <Input id="password" type="password" autoComplete="current-password" className="mt-2" aria-invalid={!!errors.password} aria-describedby="password-error" {...form.register("password")} />
        <FieldError id="password-error" message={errors.password?.message} />
      </div>
      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full tracking-[0.14em] uppercase">
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
      {variant === "store" && (
        <p className="text-center text-sm text-muted-foreground">
          New to Kamshin?{" "}
          <Link href={signupHref} className="text-burgundy underline underline-offset-4 hover:decoration-2">
            Create an account
          </Link>
        </p>
      )}
    </form>
  );
}
