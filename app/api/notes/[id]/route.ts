import type { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { parseJsonBody, parseObjectId } from "@/lib/validation";
import { updateNoteSchema } from "@/schemas/note";
import { getNote, trashNote, updateNote } from "@/services/note-service";

type Context = RouteContext<"/api/notes/[id]">;

export async function GET(_request: NextRequest, ctx: Context) {
  try {
    const { userId } = await requireSession();
    const noteId = parseObjectId((await ctx.params).id);
    const note = await getNote(userId, noteId);
    return ok({ note });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, ctx: Context) {
  try {
    const { userId } = await requireSession();
    const noteId = parseObjectId((await ctx.params).id);
    const input = await parseJsonBody(request, updateNoteSchema);
    const note = await updateNote(userId, noteId, input);
    return ok({ note });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Soft delete: moves the note to the trash. See ./permanent for a hard delete. */
export async function DELETE(_request: NextRequest, ctx: Context) {
  try {
    const { userId } = await requireSession();
    const noteId = parseObjectId((await ctx.params).id);
    const note = await trashNote(userId, noteId);
    return ok({ note });
  } catch (error) {
    return handleApiError(error);
  }
}
