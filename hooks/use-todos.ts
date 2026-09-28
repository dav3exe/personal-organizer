"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiFetch, getErrorMessage } from "@/lib/api-client";
import type { CreateTodoInput, UpdateTodoInput } from "@/schemas/todo";
import type { Todo } from "@/types/todo";

export const todoKeys = {
  all: ["todos"] as const,
};

export function useTodos() {
  return useQuery({
    queryKey: todoKeys.all,
    queryFn: async () => (await apiFetch<{ todos: Todo[] }>("/api/todos")).todos,
  });
}

export function useCreateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTodoInput) =>
      (await apiFetch<{ todo: Todo }>("/api/todos", { method: "POST", body: input })).todo,
    onSuccess: () => toast.success("To-do added"),
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: todoKeys.all }),
  });
}

type UpdateTodoVars = { id: string; input: UpdateTodoInput; silent?: boolean };

export function useUpdateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: UpdateTodoVars) =>
      (await apiFetch<{ todo: Todo }>(`/api/todos/${id}`, { method: "PATCH", body: input })).todo,
    // Optimistic update so toggling "complete" feels instant; rolled back on error.
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.all });
      const previous = queryClient.getQueryData<Todo[]>(todoKeys.all);
      queryClient.setQueryData<Todo[]>(todoKeys.all, (todos) =>
        todos?.map((todo) =>
          todo.id === id
            ? {
                ...todo,
                ...(input.title !== undefined && { title: input.title }),
                ...(input.completed !== undefined && { completed: input.completed }),
                ...(input.description !== undefined && { description: input.description || null }),
                ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
              }
            : todo
        )
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(todoKeys.all, context?.previous);
      toast.error(getErrorMessage(error));
    },
    onSuccess: (_todo, { silent }) => {
      if (!silent) toast.success("To-do updated");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: todoKeys.all }),
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<{ id: string }>(`/api/todos/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.all });
      const previous = queryClient.getQueryData<Todo[]>(todoKeys.all);
      queryClient.setQueryData<Todo[]>(todoKeys.all, (todos) => todos?.filter((t) => t.id !== id));
      return { previous };
    },
    onError: (error, _id, context) => {
      queryClient.setQueryData(todoKeys.all, context?.previous);
      toast.error(getErrorMessage(error));
    },
    onSuccess: () => toast.success("To-do deleted"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: todoKeys.all }),
  });
}
