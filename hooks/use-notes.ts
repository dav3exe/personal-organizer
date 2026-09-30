"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  listKey,
  useDeleteForever,
  useMoveToTrash,
  useRestoreItem,
  type TrashableResource,
} from "@/hooks/use-trash";
import { getErrorMessage } from "@/lib/api-client";
import { noteCollection } from "@/lib/data/notes";
import type { ListView } from "@/schemas/list-query";
import type { CreateNoteInput, UpdateNoteInput } from "@/schemas/note";
import type { Note } from "@/types/note";

export const noteKeys = {
  all: ["notes"] as const,
  list: (view: ListView) => listKey(noteKeys.all, view),
};

const noteResource: TrashableResource<Note> = {
  queryKey: noteKeys.all,
  collection: noteCollection,
  label: "Note",
};

export function useNotes(view: ListView = "active") {
  return useQuery({
    queryKey: noteKeys.list(view),
    queryFn: () => noteCollection.list(view),
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoteInput) => noteCollection.create(input),
    onSuccess: () => toast.success("Note added"),
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateNoteInput }) =>
      noteCollection.update(id, input),
    onSuccess: () => toast.success("Note updated"),
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

/** Soft delete: moves the note to the trash. */
export const useTrashNote = () => useMoveToTrash(noteResource);
export const useRestoreNote = () => useRestoreItem(noteResource);
export const useDeleteNoteForever = () => useDeleteForever(noteResource);
