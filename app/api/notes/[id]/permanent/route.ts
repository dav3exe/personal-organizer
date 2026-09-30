import type { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { parseObjectId } from "@/lib/validation";
import { deleteNoteForever } from "@/services/note-service";

/** Hard delete. Only works on a note that's already in the trash. */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/notes/[id]/permanent">) {
  try {
    const { userId } = await requireSession();
    const noteId = parseObjectId((await ctx.params).id);
    await deleteNoteForever(userId, noteId);
    return ok({ id: noteId });
  } catch (error) {
    return handleApiError(error);
  }
}
