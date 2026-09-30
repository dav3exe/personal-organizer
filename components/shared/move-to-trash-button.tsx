"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type MoveToTrashButtonProps = {
  itemTitle: string;
  onClick: () => void;
  disabled?: boolean;
};

/** Soft delete needs no warning: the toast has Undo, and the trash keeps the item. */
export function MoveToTrashButton({ itemTitle, onClick, disabled }: MoveToTrashButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Move "${itemTitle}" to trash`}
      title="Move to trash"
      disabled={disabled}
      onClick={onClick}
    >
      <Trash2 aria-hidden />
    </Button>
  );
}
