import type { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { parseJsonBody, parseWith } from "@/lib/validation";
import { listQuerySchema } from "@/schemas/list-query";
import { createNoteSchema } from "@/schemas/note";
import { createNote, listNotes } from "@/services/note-service";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireSession();
    const { view } = parseWith(listQuerySchema, Object.fromEntries(request.nextUrl.searchParams));
    const notes = await listNotes(userId, view);
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
