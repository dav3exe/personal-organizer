import type { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { parseObjectId } from "@/lib/validation";
import { deleteTodoForever } from "@/services/todo-service";

/** Hard delete. Only works on a todo that's already in the trash. */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/todos/[id]/permanent">) {
  try {
    const { userId } = await requireSession();
    const todoId = parseObjectId((await ctx.params).id);
    await deleteTodoForever(userId, todoId);
    return ok({ id: todoId });
  } catch (error) {
    return handleApiError(error);
  }
}
