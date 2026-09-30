import { z } from "zod";

import { remoteCollection, type Collection } from "@/lib/data/collection";
import { localCollection } from "@/lib/data/local-collection";
import { MULTI_TENANCY_ENABLED } from "@/lib/features";
import {
  createTodoSchema,
  updateTodoSchema,
  type CreateTodoInput,
  type UpdateTodoInput,
} from "@/schemas/todo";
import type { Todo } from "@/types/todo";

/** Applies an update the same way the server does ("" or null clears a field). */
export function applyTodoUpdate(todo: Todo, input: UpdateTodoInput): Todo {
  return {
    ...todo,
    ...(input.title !== undefined && { title: input.title }),
    ...(input.completed !== undefined && { completed: input.completed }),
    ...(input.description !== undefined && { description: input.description || null }),
    ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
  };
}

const storedTodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  completed: z.boolean(),
  dueDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
}) satisfies z.ZodType<Todo>;

export const todoCollection: Collection<Todo, CreateTodoInput, UpdateTodoInput> =
  MULTI_TENANCY_ENABLED
    ? remoteCollection({ path: "/api/todos", one: "todo", many: "todos" })
    : localCollection({
        key: "todos",
        itemSchema: storedTodoSchema,
        createSchema: createTodoSchema,
        updateSchema: updateTodoSchema,
        notFoundMessage: "Todo not found",
        build: (input, meta) => ({
          ...meta,
          title: input.title,
          description: input.description || null,
          completed: false,
          dueDate: input.dueDate ?? null,
        }),
        apply: applyTodoUpdate,
      });
