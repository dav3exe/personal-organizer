"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/api-client";
import type { Collection, ItemMeta } from "@/lib/data/collection";
import type { ListView } from "@/schemas/list-query";

/** One kind of trashable item: its query-key root, where it's stored, and its name in toasts. */
export type TrashableResource<T extends ItemMeta> = {
  /** e.g. ["todos"]; lists live under [...queryKey, view]. */
  queryKey: readonly [string];
  collection: Pick<Collection<T, unknown, unknown>, "list" | "trash" | "restore" | "destroy">;
  label: string;
};

export function listKey(queryKey: readonly [string], view: ListView) {
  return [...queryKey, view] as const;
}

/**
 * Optimistically removes an item from one list, rolls back on error, and
 * refetches both the active list and the trash when done.
 */
function useListMutation<T extends ItemMeta>(
  resource: TrashableResource<T>,
  from: ListView,
  mutationFn: (id: string) => Promise<unknown>,
  successMessage: (id: string) => void
) {
  const queryClient = useQueryClient();
  const key = listKey(resource.queryKey, from);
  return useMutation({
    mutationFn,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<T[]>(key);
      queryClient.setQueryData<T[]>(key, (items) => items?.filter((item) => item.id !== id));
      return { previous };
    },
    onError: (error, _id, context) => {
      queryClient.setQueryData(key, context?.previous);
      toast.error(getErrorMessage(error));
    },
    onSuccess: (_data, id) => successMessage(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: resource.queryKey }),
  });
}

export function useRestoreItem<T extends ItemMeta>(resource: TrashableResource<T>) {
  return useListMutation(resource, "trash", (id) => resource.collection.restore(id), () =>
    toast.success(`${resource.label} restored`)
  );
}

/** Soft delete, with an Undo action in the toast. */
export function useMoveToTrash<T extends ItemMeta>(resource: TrashableResource<T>) {
  const restore = useRestoreItem(resource);
  return useListMutation(resource, "active", (id) => resource.collection.trash(id), (id) =>
    toast.success(`${resource.label} moved to trash`, {
      action: { label: "Undo", onClick: () => restore.mutate(id) },
    })
  );
}

export function useDeleteForever<T extends ItemMeta>(resource: TrashableResource<T>) {
  return useListMutation(resource, "trash", (id) => resource.collection.destroy(id), () =>
    toast.success(`${resource.label} deleted forever`)
  );
}
