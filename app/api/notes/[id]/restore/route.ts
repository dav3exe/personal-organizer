import type { NextRequest } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { ok } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { parseObjectId } from "@/lib/validation";
import { restoreNote } from "@/services/note-service";

/** Moves a note out of the trash. */
export async function POST(_request: NextRequest, ctx: RouteContext<"/api/notes/[id]/restore">) {
  try {
    const { userId } = await requireSession();
    const noteId = parseObjectId((await ctx.params).id);
    const note = await restoreNote(userId, noteId);
    return ok({ note });
  } catch (error) {
    return handleApiError(error);
  }
}
