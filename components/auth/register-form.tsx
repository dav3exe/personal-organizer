"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { FormError } from "@/components/shared/form-error";
import { FormField, fieldMessageId } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRegister } from "@/hooks/use-auth";
import { ApiClientError, getErrorMessage } from "@/lib/api-client";
import {
  registerFormSchema,
  type RegisterFormValues,
  type RegisterInput,
} from "@/schemas/auth";

const SERVER_FIELDS = ["username", "email", "password"] as const;

export function RegisterForm() {
  const registerUser = useRegister();
  const form = useForm<RegisterFormValues, unknown, RegisterInput>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(({ username, email, password }) => {
    registerUser.mutate(
      { username, email, password },
      {
        onError: (error) => {
          // Show "email already registered" etc. next to the right field.
          if (error instanceof ApiClientError && error.fields) {
            for (const field of SERVER_FIELDS) {
              const message = error.fields[field];
              if (message) form.setError(field, { message }, { shouldFocus: true });
            }
          }
        },
      }
    );
  });

  const hasFieldErrors =
    registerUser.error instanceof ApiClientError && !!registerUser.error.fields;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError
        message={
          registerUser.error && !hasFieldErrors ? getErrorMessage(registerUser.error) : undefined
        }
      />

      <FormField
        id="username"
        label="Username"
        error={errors.username?.message}
        hint="3–20 characters: letters, numbers, and underscores."
      >
        <Input
          id="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          aria-invalid={!!errors.username}
          aria-describedby={fieldMessageId("username")}
          {...form.register("username")}
        />
      </FormField>

      <FormField id="email" label="Email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={fieldMessageId("email")}
          {...form.register("email")}
        />
      </FormField>

      <FormField
        id="password"
        label="Password"
        error={errors.password?.message}
        hint="At least 8 characters."
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby={fieldMessageId("password")}
          {...form.register("password")}
        />
      </FormField>

      <FormField id="confirmPassword" label="Confirm password" error={errors.confirmPassword?.message}>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={fieldMessageId("confirmPassword")}
          {...form.register("confirmPassword")}
        />
      </FormField>

      <Button type="submit" size="lg" disabled={registerUser.isPending} className="w-full">
        {registerUser.isPending && <Loader2 className="animate-spin" aria-hidden />}
        {registerUser.isPending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
