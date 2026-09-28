"use client";

import { NotebookPen, Plus } from "lucide-react";

import { NoteCard } from "@/components/notes/note-card";
import { NoteFormDialog } from "@/components/notes/note-form";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { CardListSkeleton } from "@/components/shared/loaders";
import { Button } from "@/components/ui/button";
import { useNotes } from "@/hooks/use-notes";
import { getErrorMessage } from "@/lib/api-client";

export function NewNoteButton() {
  return (
    <NoteFormDialog
      trigger={
        <Button>
          <Plus aria-hidden />
          New note
        </Button>
      }
    />
  );
}

export function NoteList() {
  const { data: notes, isPending, isError, error, refetch, isRefetching } = useNotes();

  if (isPending) return <CardListSkeleton count={4} className="sm:grid-cols-2" />;

  if (isError) {
    return <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} retrying={isRefetching} />;
  }

  if (notes.length === 0) {
    return (
      <EmptyState
        icon={NotebookPen}
        title="No notes yet"
        description="Capture ideas, lists, and anything else worth keeping."
        action={<NewNoteButton />}
      />
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </ul>
  );
}
