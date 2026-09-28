"use client";

import { CalendarDays, Pencil } from "lucide-react";

import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { TodoFormDialog } from "@/components/todos/todo-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useDeleteTodo, useUpdateTodo } from "@/hooks/use-todos";
import { formatISODate, todayISODate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Todo } from "@/types/todo";

export function TodoCard({ todo }: { todo: Todo }) {
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();

  const overdue = !todo.completed && !!todo.dueDate && todo.dueDate < todayISODate();
  const checkboxId = `todo-${todo.id}`;

  return (
    <li className="flex items-start gap-3 rounded-xl border bg-card p-4 text-card-foreground">
      <Checkbox
        id={checkboxId}
        className="mt-0.5"
        checked={todo.completed}
        onCheckedChange={(checked) =>
          updateTodo.mutate({ id: todo.id, input: { completed: checked === true }, silent: true })
        }
      />

      <div className="grid min-w-0 flex-1 gap-1">
        <label
          htmlFor={checkboxId}
          className={cn(
            "cursor-pointer font-medium break-words",
            todo.completed && "text-muted-foreground line-through"
          )}
        >
          {todo.title}
        </label>
        {todo.description && (
          <p
            className={cn(
              "text-sm whitespace-pre-wrap break-words text-muted-foreground",
              todo.completed && "line-through"
            )}
          >
            {todo.description}
          </p>
        )}
        {todo.dueDate && (
          <p
            className={cn(
              "flex items-center gap-1.5 text-xs text-muted-foreground",
              overdue && "font-medium text-destructive"
            )}
          >
            <CalendarDays className="size-3.5" aria-hidden />
            {overdue ? "Overdue · " : "Due "}
            {formatISODate(todo.dueDate)}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center">
        <TodoFormDialog
          todo={todo}
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label={`Edit "${todo.title}"`}>
              <Pencil aria-hidden />
            </Button>
          }
        />
        <ConfirmDeleteDialog
          itemLabel="to-do"
          itemTitle={todo.title}
          disabled={deleteTodo.isPending}
          onConfirm={() => deleteTodo.mutate(todo.id)}
        />
      </div>
    </li>
  );
}
