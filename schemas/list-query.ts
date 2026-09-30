import { z } from "zod";

/** `?view=trash` lists soft-deleted items; the default lists active ones. */
export const listQuerySchema = z.object({
  view: z.enum(["active", "trash"]).default("active"),
});

export type ListView = z.infer<typeof listQuerySchema>["view"];
