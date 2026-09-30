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
import { applyTodoUpdate, todoCollection } from "@/lib/data/todos";
import type { ListView } from "@/schemas/list-query";
import type { CreateTodoInput, UpdateTodoInput } from "@/schemas/todo";
import type { Todo } from "@/types/todo";

export const todoKeys = {
  all: ["todos"] as const,
  list: (view: ListView) => listKey(todoKeys.all, view),
};

const todoResource: TrashableResource<Todo> = {
  queryKey: todoKeys.all,
  collection: todoCollection,
  label: "To-do",
};

export function useTodos(view: ListView = "active") {
  return useQuery({
    queryKey: todoKeys.list(view),
    queryFn: () => todoCollection.list(view),
  });
}

export function useCreateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTodoInput) => todoCollection.create(input),
    onSuccess: () => toast.success("To-do added"),
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: todoKeys.all }),
  });
}

type UpdateTodoVars = { id: string; input: UpdateTodoInput; silent?: boolean };

export function useUpdateTodo() {
  const queryClient = useQueryClient();
  const activeKey = todoKeys.list("active");
  return useMutation({
    mutationFn: ({ id, input }: UpdateTodoVars) => todoCollection.update(id, input),
    // Optimistic update so toggling "complete" feels instant; rolled back on error.
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: activeKey });
      const previous = queryClient.getQueryData<Todo[]>(activeKey);
      queryClient.setQueryData<Todo[]>(activeKey, (todos) =>
        todos?.map((todo) => (todo.id === id ? applyTodoUpdate(todo, input) : todo))
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(activeKey, context?.previous);
      toast.error(getErrorMessage(error));
    },
    onSuccess: (_todo, { silent }) => {
      if (!silent) toast.success("To-do updated");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: todoKeys.all }),
  });
}

/** Soft delete: moves the to-do to the trash. */
export const useTrashTodo = () => useMoveToTrash(todoResource);
export const useRestoreTodo = () => useRestoreItem(todoResource);
export const useDeleteTodoForever = () => useDeleteForever(todoResource);
