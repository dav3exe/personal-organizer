"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { noteKeys, useNotes } from "@/hooks/use-notes";
import { todoKeys, useTodos } from "@/hooks/use-todos";
import { getErrorMessage } from "@/lib/api-client";
import { noteCollection } from "@/lib/data/notes";
import { clearAllData, loadSampleData } from "@/lib/data/sample-data";
import { todoCollection } from "@/lib/data/todos";

// App-wide data actions that span to-dos and notes: counts, empty trash,
// and the sample-data switch for reviewers.

function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: todoKeys.all }),
      queryClient.invalidateQueries({ queryKey: noteKeys.all }),
    ]);
}

/** Item counts across to-dos and notes. `ready` is false until all four lists have loaded. */
export function useDataCounts() {
  const lists = [useTodos("active"), useTodos("trash"), useNotes("active"), useNotes("trash")];
  const [activeTodos, trashedTodos, activeNotes, trashedNotes] = lists.map((list) => list.data?.length ?? 0);
  const trash = trashedTodos + trashedNotes;
  return {
    ready: lists.every((list) => list.isSuccess),
    trash,
    total: activeTodos + activeNotes + trash,
  };
}

/** Permanently deletes everything in the trash. */
export function useEmptyTrash() {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: async () => {
      for (const collection of [todoCollection, noteCollection]) {
        const trashed = await collection.list("trash");
        await Promise.all(trashed.map((item) => collection.destroy(item.id)));
      }
    },
    onSuccess: () => toast.success("Trash emptied"),
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: invalidateAll,
  });
}

export function useLoadSampleData() {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: loadSampleData,
    onSuccess: () => toast.success("Sample data loaded"),
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: invalidateAll,
  });
}

/** Back to the empty state: removes every to-do and note, trash included. */
export function useClearAllData() {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: clearAllData,
    onSuccess: () => toast.success("All data cleared"),
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: invalidateAll,
  });
}
