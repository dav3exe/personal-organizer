"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { FormError } from "@/components/shared/form-error";
import { FormField, fieldMessageId } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLogin } from "@/hooks/use-auth";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import { loginSchema, type LoginInput } from "@/schemas/auth";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const login = useLogin(redirectTo);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    login.mutate(values, {
      onError: (error) => {
        // Keep the email, clear the password after a failed attempt.
        if (error instanceof ApiClientError && error.code === "INVALID_CREDENTIALS") {
          form.resetField("password");
        }
      },
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={login.error ? getErrorMessage(login.error) : undefined} />

      <FormField id="email" label="Email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          aria-invalid={!!errors.email}
          aria-describedby={fieldMessageId("email")}
          {...form.register("email")}
        />
      </FormField>

      <FormField id="password" label="Password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          aria-describedby={fieldMessageId("password")}
          {...form.register("password")}
        />
      </FormField>

      <Button type="submit" size="lg" disabled={login.isPending} className="w-full">
        {login.isPending && <Loader2 className="animate-spin" aria-hidden />}
        {login.isPending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
