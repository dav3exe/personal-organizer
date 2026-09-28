import { handleApiError } from "@/lib/api-error";
import { ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { parseJsonBody } from "@/lib/validation";
import { createNoteSchema } from "@/schemas/note";
import { createNote, listNotes } from "@/services/note-service";

export async function GET() {
  try {
    const { userId } = await requireSession();
    const notes = await listNotes(userId);
    return ok({ notes });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireSession();
    const input = await parseJsonBody(request, createNoteSchema);
    const note = await createNote(userId, input);
    return ok({ note }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
