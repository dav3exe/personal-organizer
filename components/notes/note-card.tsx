"use client";

import { Pencil } from "lucide-react";

import { NoteFormDialog } from "@/components/notes/note-form";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { useDeleteNote } from "@/hooks/use-notes";
import { formatTimestamp } from "@/lib/date";
import type { Note } from "@/types/note";

export function NoteCard({ note }: { note: Note }) {
  const deleteNote = useDeleteNote();
  const edited = note.updatedAt !== note.createdAt;

  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground">
      <div className="flex items-start gap-2">
        <h2 className="min-w-0 flex-1 font-medium break-words">{note.title}</h2>
        <div className="-mt-1 -mr-1 flex shrink-0 items-center">
          <NoteFormDialog
            note={note}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label={`Edit "${note.title}"`}>
                <Pencil aria-hidden />
              </Button>
            }
          />
          <ConfirmDeleteDialog
            itemLabel="note"
            itemTitle={note.title}
            disabled={deleteNote.isPending}
            onConfirm={() => deleteNote.mutate(note.id)}
          />
        </div>
      </div>
      <p className="line-clamp-6 flex-1 text-sm whitespace-pre-wrap break-words text-muted-foreground">
        {note.content}
      </p>
      <p className="text-xs text-muted-foreground">
        {edited ? "Edited " : "Created "}
        {formatTimestamp(edited ? note.updatedAt : note.createdAt)}
      </p>
    </li>
  );
}
