import "server-only";

import type { Types, UpdateQuery } from "mongoose";

import { errors } from "@/lib/api-error";
import { connectDB } from "@/lib/db";
import { ACTIVE, TRASHED, viewFilter, viewSort } from "@/lib/soft-delete";
import { Todo as TodoModel, type TodoAttrs } from "@/models/todo";
import type { ListView } from "@/schemas/list-query";
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
    deletedAt: record.deletedAt ? record.deletedAt.toISOString() : null,
  };
}

export async function listTodos(userId: string, view: ListView): Promise<Todo[]> {
  await connectDB();
  const records = await TodoModel.find({ userId, ...viewFilter(view) })
    .sort(viewSort(view))
    .lean<TodoRecord[]>();
  return records.map(toTodo);
}

/** Returns an active or trashed todo. */
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

/** Only active todos can be edited; restore a trashed one first. */
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
    { _id: todoId, userId, ...ACTIVE },
    { $set, $unset },
    { returnDocument: "after", runValidators: true }
  ).lean<TodoRecord>();
  if (!record) throw errors.notFound("Todo not found");
  return toTodo(record);
}

/** Soft delete: moves an active todo to the trash. */
export async function trashTodo(userId: string, todoId: string): Promise<Todo> {
  await connectDB();
  const record = await TodoModel.findOneAndUpdate(
    { _id: todoId, userId, ...ACTIVE },
    { $set: { deletedAt: new Date() } },
    { returnDocument: "after" }
  ).lean<TodoRecord>();
  if (!record) throw errors.notFound("Todo not found");
  return toTodo(record);
}

export async function restoreTodo(userId: string, todoId: string): Promise<Todo> {
  await connectDB();
  const record = await TodoModel.findOneAndUpdate(
    { _id: todoId, userId, ...TRASHED },
    { $set: { deletedAt: null } },
    { returnDocument: "after" }
  ).lean<TodoRecord>();
  if (!record) throw errors.notFound("Todo not found");
  return toTodo(record);
}

/** Permanent delete. Only works on a todo that's already in the trash. */
export async function deleteTodoForever(userId: string, todoId: string): Promise<void> {
  await connectDB();
  const record = await TodoModel.findOneAndDelete({ _id: todoId, userId, ...TRASHED }).lean();
  if (!record) throw errors.notFound("Todo not found");
}
