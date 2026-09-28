"use client";

import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { FormField, fieldMessageId } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateNote, useUpdateNote } from "@/hooks/use-notes";
import { ApiClientError } from "@/lib/api-client";
import { createNoteSchema, type CreateNoteInput } from "@/schemas/note";
import type { Note } from "@/types/note";

const FIELDS = ["title", "content"] as const;

type NoteFormDialogProps = {
  /** Pass a note to edit it; omit to create a new one. */
  note?: Note;
  trigger: ReactNode;
};

export function NoteFormDialog({ note, trigger }: NoteFormDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{note ? "Edit note" : "New note"}</DialogTitle>
          <DialogDescription>
            {note ? "Update your note below." : "Write down anything worth keeping."}
          </DialogDescription>
        </DialogHeader>
        {/* Radix unmounts dialog content when closed, so the form always starts from the latest values. */}
        <NoteForm note={note} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function NoteForm({ note, onDone }: { note?: Note; onDone: () => void }) {
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const isPending = createNote.isPending || updateNote.isPending;

  const form = useForm<CreateNoteInput>({
    resolver: zodResolver(createNoteSchema),
    defaultValues: { title: note?.title ?? "", content: note?.content ?? "" },
  });
  const { errors } = form.formState;

  const onError = (error: Error) => {
    if (error instanceof ApiClientError && error.fields) {
      for (const field of FIELDS) {
        const message = error.fields[field];
        if (message) form.setError(field, { message });
      }
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    if (note) {
      updateNote.mutate({ id: note.id, input: values }, { onSuccess: onDone, onError });
    } else {
      createNote.mutate(values, { onSuccess: onDone, onError });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormField id="note-title" label="Title" error={errors.title?.message}>
        <Input
          id="note-title"
          autoFocus
          aria-invalid={!!errors.title}
          aria-describedby={fieldMessageId("note-title")}
          {...form.register("title")}
        />
      </FormField>

      <FormField id="note-content" label="Content" error={errors.content?.message}>
        <Textarea
          id="note-content"
          rows={8}
          aria-invalid={!!errors.content}
          aria-describedby={fieldMessageId("note-content")}
          {...form.register("content")}
        />
      </FormField>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" aria-hidden />}
          {note ? "Save changes" : "Add note"}
        </Button>
      </DialogFooter>
    </form>
  );
}
