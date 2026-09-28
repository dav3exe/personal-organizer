"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiFetch, getErrorMessage } from "@/lib/api-client";
import type { CreateNoteInput, UpdateNoteInput } from "@/schemas/note";
import type { Note } from "@/types/note";

export const noteKeys = {
  all: ["notes"] as const,
};

export function useNotes() {
  return useQuery({
    queryKey: noteKeys.all,
    queryFn: async () => (await apiFetch<{ notes: Note[] }>("/api/notes")).notes,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateNoteInput) =>
      (await apiFetch<{ note: Note }>("/api/notes", { method: "POST", body: input })).note,
    onSuccess: () => toast.success("Note added"),
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateNoteInput }) =>
      (await apiFetch<{ note: Note }>(`/api/notes/${id}`, { method: "PATCH", body: input })).note,
    onSuccess: () => toast.success("Note updated"),
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<{ id: string }>(`/api/notes/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.all });
      const previous = queryClient.getQueryData<Note[]>(noteKeys.all);
      queryClient.setQueryData<Note[]>(noteKeys.all, (notes) => notes?.filter((n) => n.id !== id));
      return { previous };
    },
    onError: (error, _id, context) => {
      queryClient.setQueryData(noteKeys.all, context?.previous);
      toast.error(getErrorMessage(error));
    },
    onSuccess: () => toast.success("Note deleted"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  });
}
