import type { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { parseJsonBody, parseWith } from "@/lib/validation";
import { listQuerySchema } from "@/schemas/list-query";
import { createTodoSchema } from "@/schemas/todo";
import { createTodo, listTodos } from "@/services/todo-service";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireSession();
    const { view } = parseWith(listQuerySchema, Object.fromEntries(request.nextUrl.searchParams));
    const todos = await listTodos(userId, view);
    return ok({ todos });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireSession();
    const input = await parseJsonBody(request, createTodoSchema);
    const todo = await createTodo(userId, input);
    return ok({ todo }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
