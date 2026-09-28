import "server-only";

import type { Types, UpdateQuery } from "mongoose";

import { errors } from "@/lib/api-error";
import { connectDB } from "@/lib/db";
import { Todo as TodoModel, type TodoAttrs } from "@/models/todo";
import type { CreateTodoInput, UpdateTodoInput } from "@/schemas/todo";
import type { Todo } from "@/types/todo";

// TENANCY: every query filters by the session's userId. Never query todos by
// _id alone; a todo that isn't the user's is reported as 404.

type TodoRecord = TodoAttrs & { _id: Types.ObjectId };

/** Stores a YYYY-MM-DD date as UTC midnight so it round-trips without timezone drift. */
function toDueDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function toTodo(record: TodoRecord): Todo {
  return {
    id: record._id.toString(),
    title: record.title,
    description: record.description ?? null,
    completed: record.completed,
    dueDate: record.dueDate ? record.dueDate.toISOString().slice(0, 10) : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function listTodos(userId: string): Promise<Todo[]> {
  await connectDB();
  const records = await TodoModel.find({ userId })
    .sort({ createdAt: -1 })
    .lean<TodoRecord[]>();
  return records.map(toTodo);
}

export async function getTodo(userId: string, todoId: string): Promise<Todo> {
  await connectDB();
  const record = await TodoModel.findOne({ _id: todoId, userId }).lean<TodoRecord>();
  if (!record) throw errors.notFound("Todo not found");
  return toTodo(record);
}

export async function createTodo(
  userId: string,
  input: CreateTodoInput
): Promise<Todo> {
  await connectDB();
  const created = await TodoModel.create({
    userId,
    title: input.title,
    ...(input.description && { description: input.description }),
    ...(input.dueDate && { dueDate: toDueDate(input.dueDate) }),
  });
  return toTodo(created.toObject<TodoRecord>());
}

export async function updateTodo(
  userId: string,
  todoId: string,
  input: UpdateTodoInput
): Promise<Todo> {
  const $set: UpdateQuery<TodoAttrs> = {};
  const $unset: Record<string, 1> = {};

  if (input.title !== undefined) $set.title = input.title;
  if (input.completed !== undefined) $set.completed = input.completed;

  if (input.description === null || input.description === "") {
    $unset.description = 1;
  } else if (input.description !== undefined) {
    $set.description = input.description;
  }

  if (input.dueDate === null) {
    $unset.dueDate = 1;
  } else if (input.dueDate !== undefined) {
    $set.dueDate = toDueDate(input.dueDate);
  }

  await connectDB();
  const record = await TodoModel.findOneAndUpdate(
    { _id: todoId, userId },
    { $set, $unset },
    { returnDocument: "after", runValidators: true }
  ).lean<TodoRecord>();
  if (!record) throw errors.notFound("Todo not found");
  return toTodo(record);
}

export async function deleteTodo(userId: string, todoId: string): Promise<void> {
  await connectDB();
  const record = await TodoModel.findOneAndDelete({ _id: todoId, userId }).lean();
  if (!record) throw errors.notFound("Todo not found");
}
