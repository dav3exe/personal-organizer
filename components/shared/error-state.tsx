import { RotateCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  message: string;
  onRetry: () => void;
  retrying?: boolean;
};

export function ErrorState({ message, onRetry, retrying }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center"
    >
      <TriangleAlert className="size-6 text-destructive" aria-hidden />
      <div className="grid gap-1">
        <h2 className="font-medium">Couldn&apos;t load this page</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
        <RotateCw className={retrying ? "animate-spin" : undefined} aria-hidden />
        Try again
      </Button>
    </div>
  );
}
