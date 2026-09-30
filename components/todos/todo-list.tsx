"use client";

import { ListTodo, Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { CardListSkeleton } from "@/components/shared/loaders";
import { LoadSampleDataButton } from "@/components/shared/sample-data-controls";
import { TodoCard } from "@/components/todos/todo-card";
import { TodoFormDialog } from "@/components/todos/todo-form";
import { Button } from "@/components/ui/button";
import { useTodos } from "@/hooks/use-todos";
import { getErrorMessage } from "@/lib/api-client";
import type { Todo } from "@/types/todo";

export function NewTodoButton() {
  return (
    <TodoFormDialog
      trigger={
        <Button>
          <Plus aria-hidden />
          New to-do
        </Button>
      }
    />
  );
}

function TodoSection({ title, todos }: { title: string; todos: Todo[] }) {
  if (todos.length === 0) return null;
  return (
    <section className="grid gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        {title} ({todos.length})
      </h2>
      <ul className="grid gap-3">
        {todos.map((todo) => (
          <TodoCard key={todo.id} todo={todo} />
        ))}
      </ul>
    </section>
  );
}

export function TodoList() {
  const { data: todos, isPending, isError, error, refetch, isRefetching } = useTodos();

  if (isPending) return <CardListSkeleton />;

  if (isError) {
    return <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} retrying={isRefetching} />;
  }

  if (todos.length === 0) {
    return (
      <EmptyState
        icon={ListTodo}
        title="No to-dos yet"
        description="Add your first task and tick it off when it's done."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <NewTodoButton />
            <LoadSampleDataButton />
          </div>
        }
      />
    );
  }

  return (
    <div className="grid gap-8">
      <TodoSection title="Open" todos={todos.filter((t) => !t.completed)} />
      <TodoSection title="Completed" todos={todos.filter((t) => t.completed)} />
    </div>
  );
}
