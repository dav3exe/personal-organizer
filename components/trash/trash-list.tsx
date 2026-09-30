"use client";

import type { ReactNode } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { CardListSkeleton } from "@/components/shared/loaders";
import { TrashItem } from "@/components/trash/trash-item";
import { Button } from "@/components/ui/button";
import { useDataCounts, useEmptyTrash } from "@/hooks/use-app-data";
import { useDeleteNoteForever, useNotes, useRestoreNote } from "@/hooks/use-notes";
import { useDeleteTodoForever, useRestoreTodo, useTodos } from "@/hooks/use-todos";
import { getErrorMessage } from "@/lib/api-client";
import { formatISODate } from "@/lib/date";
import type { Todo } from "@/types/todo";

export function EmptyTrashButton() {
  const { trash } = useDataCounts();
  const emptyTrash = useEmptyTrash();
  if (trash === 0) return null;

  return (
    <ConfirmDeleteDialog
      title="Empty the trash?"
      description={`${trash} ${trash === 1 ? "item" : "items"} will be permanently deleted. This can't be undone.`}
      confirmLabel="Empty trash"
      onConfirm={() => emptyTrash.mutate()}
      trigger={
        <Button variant="destructive" disabled={emptyTrash.isPending}>
          {emptyTrash.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
          Empty trash
        </Button>
      }
    />
  );
}

function TrashSection({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <section className="grid gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        {title} ({count})
      </h2>
      <ul className="grid gap-3">{children}</ul>
    </section>
  );
}

function todoSnippet(todo: Todo): string | null {
  if (todo.description) return todo.description;
  return todo.dueDate ? `Due ${formatISODate(todo.dueDate)}` : null;
}

export function TrashList() {
  const todos = useTodos("trash");
  const notes = useNotes("trash");
  const restoreTodo = useRestoreTodo();
  const deleteTodo = useDeleteTodoForever();
  const restoreNote = useRestoreNote();
  const deleteNote = useDeleteNoteForever();

  if (todos.isPending || notes.isPending) return <CardListSkeleton />;

  if (todos.isError || notes.isError) {
    return (
      <ErrorState
        message={getErrorMessage(todos.error ?? notes.error)}
        onRetry={() => {
          void todos.refetch();
          void notes.refetch();
        }}
        retrying={todos.isRefetching || notes.isRefetching}
      />
    );
  }

  if (todos.data.length === 0 && notes.data.length === 0) {
    return (
      <EmptyState
        icon={Trash2}
        title="Trash is empty"
        description="Deleted to-dos and notes land here. Restore them, or delete them for good."
      />
    );
  }

  return (
    <div className="grid gap-8">
      <TrashSection title="To-dos" count={todos.data.length}>
        {todos.data.map((todo) => (
          <TrashItem
            key={todo.id}
            kind="to-do"
            title={todo.title}
            snippet={todoSnippet(todo)}
            deletedAt={todo.deletedAt ?? todo.updatedAt}
            onRestore={() => restoreTodo.mutate(todo.id)}
            onDeleteForever={() => deleteTodo.mutate(todo.id)}
          />
        ))}
      </TrashSection>
      <TrashSection title="Notes" count={notes.data.length}>
        {notes.data.map((note) => (
          <TrashItem
            key={note.id}
            kind="note"
            title={note.title}
            snippet={note.content}
            deletedAt={note.deletedAt ?? note.updatedAt}
            onRestore={() => restoreNote.mutate(note.id)}
            onDeleteForever={() => deleteNote.mutate(note.id)}
          />
        ))}
      </TrashSection>
    </div>
  );
}
