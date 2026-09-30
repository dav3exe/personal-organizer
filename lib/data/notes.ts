import { z } from "zod";

import { remoteCollection, type Collection } from "@/lib/data/collection";
import { localCollection } from "@/lib/data/local-collection";
import { MULTI_TENANCY_ENABLED } from "@/lib/features";
import {
  createNoteSchema,
  updateNoteSchema,
  type CreateNoteInput,
  type UpdateNoteInput,
} from "@/schemas/note";
import type { Note } from "@/types/note";

const storedNoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
}) satisfies z.ZodType<Note>;

export const noteCollection: Collection<Note, CreateNoteInput, UpdateNoteInput> =
  MULTI_TENANCY_ENABLED
    ? remoteCollection({ path: "/api/notes", one: "note", many: "notes" })
    : localCollection({
        key: "notes",
        itemSchema: storedNoteSchema,
        createSchema: createNoteSchema,
        updateSchema: updateNoteSchema,
        notFoundMessage: "Note not found",
        build: (input, meta) => ({ ...meta, title: input.title, content: input.content }),
        apply: (note, input) => ({
          ...note,
          ...(input.title !== undefined && { title: input.title }),
          ...(input.content !== undefined && { content: input.content }),
        }),
      });
