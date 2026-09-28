import { z } from "zod";

export const NOTE_TITLE_MAX = 120;
export const NOTE_CONTENT_MAX = 10_000;

const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(NOTE_TITLE_MAX, `Title must be at most ${NOTE_TITLE_MAX} characters`);

const contentSchema = z
  .string()
  .trim()
  .min(1, "Content is required")
  .max(
    NOTE_CONTENT_MAX,
    `Content must be at most ${NOTE_CONTENT_MAX.toLocaleString("en-US")} characters`
  );

export const createNoteSchema = z.object({
  title: titleSchema,
  content: contentSchema,
});

export const updateNoteSchema = z
  .object({
    title: titleSchema.optional(),
    content: contentSchema.optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "Provide at least one field to update",
  });

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
