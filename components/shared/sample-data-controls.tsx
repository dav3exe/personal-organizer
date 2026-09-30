"use client";

import { DatabaseZap, Eraser, Loader2 } from "lucide-react";

import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { useClearAllData, useDataCounts, useLoadSampleData } from "@/hooks/use-app-data";
import { MULTI_TENANCY_ENABLED } from "@/lib/features";

type LoadSampleDataButtonProps = {
  variant?: "default" | "outline" | "ghost";
  /** Hide the text label below the sm breakpoint (navbar). */
  compact?: boolean;
};

/**
 * One click to fill the app with example to-dos, notes, and trash, so a
 * reviewer can see every state. Only offered when there's no data at all,
 * so it never mixes with (or duplicates) real items.
 */
export function LoadSampleDataButton({ variant = "outline", compact }: LoadSampleDataButtonProps) {
  const { ready, total } = useDataCounts();
  const load = useLoadSampleData();
  if (!ready || total > 0) return null;

  return (
    <Button
      variant={variant}
      size={compact ? "sm" : "default"}
      disabled={load.isPending}
      onClick={() => load.mutate()}
      aria-label={compact ? "Load sample data" : undefined}
    >
      {load.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <DatabaseZap aria-hidden />}
      <span className={compact ? "hidden sm:inline" : undefined}>Load sample data</span>
    </Button>
  );
}

/** Back to the empty state. Deletes everything, so it asks first. */
function ClearAllDataButton() {
  const { ready, total } = useDataCounts();
  const clear = useClearAllData();
  if (!ready || total === 0) return null;

  const where = MULTI_TENANCY_ENABLED ? "from your account" : "from this browser";
  return (
    <ConfirmDeleteDialog
      title="Clear all data?"
      description={`Every to-do and note, including the trash, will be permanently deleted ${where}. This can't be undone.`}
      confirmLabel="Clear all data"
      onConfirm={() => clear.mutate()}
      trigger={
        <Button variant="ghost" size="sm" disabled={clear.isPending} aria-label="Clear all data">
          {clear.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Eraser aria-hidden />}
          <span className="hidden sm:inline">Clear all</span>
        </Button>
      }
    />
  );
}

/** Navbar switch between "full of sample data" and "empty". */
export function SampleDataControls() {
  return (
    <>
      <LoadSampleDataButton variant="outline" compact />
      <ClearAllDataButton />
    </>
  );
}
