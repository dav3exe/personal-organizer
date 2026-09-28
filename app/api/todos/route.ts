import { handleApiError } from "@/lib/api-error";
import { ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { parseJsonBody } from "@/lib/validation";
import { createTodoSchema } from "@/schemas/todo";
import { createTodo, listTodos } from "@/services/todo-service";

export async function GET() {
  try {
    const { userId } = await requireSession();
    const todos = await listTodos(userId);
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
