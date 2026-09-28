import type { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { parseJsonBody, parseObjectId } from "@/lib/validation";
import { updateTodoSchema } from "@/schemas/todo";
import { deleteTodo, getTodo, updateTodo } from "@/services/todo-service";

type Context = RouteContext<"/api/todos/[id]">;

export async function GET(_request: NextRequest, ctx: Context) {
  try {
    const { userId } = await requireSession();
    const todoId = parseObjectId((await ctx.params).id);
    const todo = await getTodo(userId, todoId);
    return ok({ todo });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, ctx: Context) {
  try {
    const { userId } = await requireSession();
    const todoId = parseObjectId((await ctx.params).id);
    const input = await parseJsonBody(request, updateTodoSchema);
    const todo = await updateTodo(userId, todoId, input);
    return ok({ todo });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, ctx: Context) {
  try {
    const { userId } = await requireSession();
    const todoId = parseObjectId((await ctx.params).id);
    await deleteTodo(userId, todoId);
    return ok({ id: todoId });
  } catch (error) {
    return handleApiError(error);
  }
}
