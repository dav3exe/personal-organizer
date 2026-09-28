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
import { useCreateTodo, useUpdateTodo } from "@/hooks/use-todos";
import { ApiClientError } from "@/lib/api-client";
import { todoFormSchema, type TodoFormValues } from "@/schemas/todo";
import type { Todo } from "@/types/todo";

const FIELDS = ["title", "description", "dueDate"] as const;

type TodoFormDialogProps = {
  /** Pass a todo to edit it; omit to create a new one. */
  todo?: Todo;
  trigger: ReactNode;
};

export function TodoFormDialog({ todo, trigger }: TodoFormDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{todo ? "Edit to-do" : "New to-do"}</DialogTitle>
          <DialogDescription>
            {todo ? "Update the details below." : "What do you need to get done?"}
          </DialogDescription>
        </DialogHeader>
        {/* Radix unmounts dialog content when closed, so the form always starts from the latest values. */}
        <TodoForm todo={todo} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function TodoForm({ todo, onDone }: { todo?: Todo; onDone: () => void }) {
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const isPending = createTodo.isPending || updateTodo.isPending;

  const form = useForm<TodoFormValues>({
    resolver: zodResolver(todoFormSchema),
    defaultValues: {
      title: todo?.title ?? "",
      description: todo?.description ?? "",
      dueDate: todo?.dueDate ?? "",
    },
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

  const onSubmit = form.handleSubmit(({ title, description, dueDate }) => {
    if (todo) {
      updateTodo.mutate(
        // "" clears the field on the server.
        { id: todo.id, input: { title, description: description || null, dueDate: dueDate || null } },
        { onSuccess: onDone, onError }
      );
    } else {
      createTodo.mutate(
        { title, description: description || undefined, dueDate: dueDate || undefined },
        { onSuccess: onDone, onError }
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormField id="todo-title" label="Title" error={errors.title?.message}>
        <Input
          id="todo-title"
          autoFocus
          aria-invalid={!!errors.title}
          aria-describedby={fieldMessageId("todo-title")}
          {...form.register("title")}
        />
      </FormField>

      <FormField id="todo-description" label="Description (optional)" error={errors.description?.message}>
        <Textarea
          id="todo-description"
          rows={3}
          aria-invalid={!!errors.description}
          aria-describedby={fieldMessageId("todo-description")}
          {...form.register("description")}
        />
      </FormField>

      <FormField id="todo-due-date" label="Due date (optional)" error={errors.dueDate?.message}>
        <Input
          id="todo-due-date"
          type="date"
          className="w-full sm:w-48"
          aria-invalid={!!errors.dueDate}
          aria-describedby={fieldMessageId("todo-due-date")}
          {...form.register("dueDate")}
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
          {todo ? "Save changes" : "Add to-do"}
        </Button>
      </DialogFooter>
    </form>
  );
}
