import { z } from "zod";

export const TODO_TITLE_MAX = 120;
export const TODO_DESCRIPTION_MAX = 1000;

const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(TODO_TITLE_MAX, `Title must be at most ${TODO_TITLE_MAX} characters`);

const descriptionSchema = z
  .string()
  .trim()
  .max(
    TODO_DESCRIPTION_MAX,
    `Description must be at most ${TODO_DESCRIPTION_MAX} characters`
  );

/** Calendar date in YYYY-MM-DD format. */
const dueDateSchema = z.iso.date("Enter a valid date");

export const createTodoSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  dueDate: dueDateSchema.optional(),
});

// `null` clears an optional field; omitting a field leaves it unchanged.
export const updateTodoSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.nullable().optional(),
    dueDate: dueDateSchema.nullable().optional(),
    completed: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "Provide at least one field to update",
  });

/**
 * Form values: inputs always give strings, so "" means "not set".
 * (Avoids z.coerce, which would turn an empty date into a bogus value.)
 */
export const todoFormSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  dueDate: z.union([z.literal(""), dueDateSchema]),
});

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type TodoFormValues = z.infer<typeof todoFormSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
