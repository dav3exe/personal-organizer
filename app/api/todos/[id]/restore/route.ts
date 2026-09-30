import type { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { parseObjectId } from "@/lib/validation";
import { restoreTodo } from "@/services/todo-service";

/** Moves a todo out of the trash. */
export async function POST(_request: NextRequest, ctx: RouteContext<"/api/todos/[id]/restore">) {
  try {
    const { userId } = await requireSession();
    const todoId = parseObjectId((await ctx.params).id);
    const todo = await restoreTodo(userId, todoId);
    return ok({ todo });
  } catch (error) {
    return handleApiError(error);
  }
}
