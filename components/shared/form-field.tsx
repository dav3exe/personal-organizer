import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  id: string;
  label: string;
  error?: string;
  /** Helper text shown under the control when there's no error. */
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
};

/**
 * Label + control + message. Give the control `id`, `aria-invalid={!!error}`
 * and `aria-describedby={fieldMessageId(id)}` so the message is announced.
 */
export function FormField({ id, label, error, hint, className, children }: FormFieldProps) {
  const message = error ?? hint;
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {message && (
        <p
          id={fieldMessageId(id)}
          role={error ? "alert" : undefined}
          className={cn("text-sm", error ? "text-destructive" : "text-muted-foreground")}
        >
          {message}
        </p>
      )}
    </div>
  );
}

export function fieldMessageId(id: string) {
  return `${id}-message`;
}
