"use client";

import { ArchiveRestore, Trash2 } from "lucide-react";

import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/date";

type TrashItemProps = {
  /** "to-do" or "note", used in labels and the warning. */
  kind: string;
  title: string;
  snippet?: string | null;
  deletedAt: string;
  onRestore: () => void;
  onDeleteForever: () => void;
  disabled?: boolean;
};

export function TrashItem({
  kind,
  title,
  snippet,
  deletedAt,
  onRestore,
  onDeleteForever,
  disabled,
}: TrashItemProps) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground sm:flex-row sm:items-start">
      <div className="grid min-w-0 flex-1 gap-1">
        <h3 className="font-medium break-words">{title}</h3>
        {snippet && (
          <p className="line-clamp-2 text-sm whitespace-pre-wrap break-words text-muted-foreground">
            {snippet}
          </p>
        )}
        <p className="text-xs text-muted-foreground">Deleted {formatTimestamp(deletedAt)}</p>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" disabled={disabled} onClick={onRestore}>
          <ArchiveRestore aria-hidden />
          Restore
        </Button>
        <ConfirmDeleteDialog
          title={`Delete this ${kind} forever?`}
          description={
            <>
              &ldquo;{title}&rdquo; will be permanently deleted. You won&apos;t be able to restore it.
            </>
          }
          confirmLabel="Delete forever"
          onConfirm={onDeleteForever}
          trigger={
            <Button variant="destructive" size="sm" disabled={disabled}>
              <Trash2 aria-hidden />
              Delete forever
            </Button>
          }
        />
      </div>
    </li>
  );
}
