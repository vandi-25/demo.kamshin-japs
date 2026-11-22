"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupAction } from "@/lib/actions/auth";
import { safeAction } from "@/lib/client/safe-action";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-rules";
import { signupSchema, type SignupInput } from "@/lib/validation/auth";

const FIELDS = ["name", "email", "password", "confirmPassword"] as const;

export function SignupForm({ callbackUrl }: { callbackUrl?: string }) {
  const form = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });
  const { errors, isSubmitting } = form.formState;
  const [formError, setFormError] = useState<string>();

  const onSubmit = form.handleSubmit(async (data) => {
    setFormError(undefined);
    // On success the server action signs the new customer in and redirects.
    const result = await safeAction(() => signupAction(data, callbackUrl));
    for (const key of FIELDS) {
      const message = result?.fieldErrors?.[key];
      if (message) form.setError(key, { message });
    }
    if (result?.error) setFormError(result.error);
  });

  const loginHref = callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login";

  const field = (
    id: keyof SignupInput,
    label: string,
    type: string,
    autoComplete: string,
    hint?: string,
  ) => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        className="mt-2"
        aria-invalid={!!errors[id]}
        aria-describedby={`${id}-error ${id}-hint`}
        {...form.register(id)}
      />
      {hint && !errors[id] && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} message={errors[id]?.message} />
    </div>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      )}
      {field("name", "Full name", "text", "name")}
      {field("email", "Email", "email", "email")}
      {field("password", "Password", "password", "new-password", `At least ${PASSWORD_MIN_LENGTH} characters`)}
      {field("confirmPassword", "Confirm password", "password", "new-password")}
      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full tracking-[0.14em] uppercase">
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={loginHref} className="text-burgundy underline underline-offset-4 hover:decoration-2">
          Sign in
        </Link>
      </p>
    </form>
  );
}
