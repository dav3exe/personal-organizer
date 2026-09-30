import { z } from "zod";

import { ApiClientError } from "@/lib/api-client";
import type { Collection, ItemMeta } from "@/lib/data/collection";

// Browser-only: these functions run inside React Query query and mutation
// functions, which never execute during server rendering.

/** Every key this app writes to localStorage starts with this. */
export const LOCAL_STORAGE_PREFIX = "personal-organizer:";

type LocalCollectionConfig<T extends ItemMeta, CreateInput, UpdateInput> = {
  /** Stored under LOCAL_STORAGE_PREFIX + key. */
  key: string;
  /** Shape of one stored item; anything that doesn't match is dropped on read. */
  itemSchema: z.ZodType<T>;
  createSchema: z.ZodType<CreateInput>;
  updateSchema: z.ZodType<UpdateInput>;
  notFoundMessage: string;
  build: (input: CreateInput, meta: ItemMeta) => T;
  apply: (item: T, input: UpdateInput) => T;
};

/** Same error shape as the API, so forms show field errors either way. */
function validate<S>(schema: z.ZodType<S>, input: unknown): S {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    fields[issue.path.join(".") || "_root"] ??= issue.message;
  }
  throw new ApiClientError(400, "VALIDATION_ERROR", "Some fields are invalid", fields);
}

/** Collection stored in this browser's localStorage (multi-tenancy off). */
export function localCollection<T extends ItemMeta, CreateInput, UpdateInput>(
  config: LocalCollectionConfig<T, CreateInput, UpdateInput>
): Collection<T, CreateInput, UpdateInput> {
  const storageKey = LOCAL_STORAGE_PREFIX + config.key;
  const listSchema = z.array(z.unknown());

  // Items are kept newest first, so ties in createdAt keep insertion order.
  const read = (): T[] => {
    try {
      const parsed = listSchema.safeParse(JSON.parse(localStorage.getItem(storageKey) ?? "[]"));
      if (!parsed.success) return [];
      return parsed.data.flatMap((raw) => {
        const item = config.itemSchema.safeParse(raw);
        return item.success ? [item.data] : [];
      });
    } catch {
      return []; // Corrupt JSON or storage blocked: start empty rather than crash.
    }
  };

  const write = (items: T[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      throw new ApiClientError(
        500,
        "INTERNAL_ERROR",
        "Couldn't save to this browser's storage. It may be full or blocked."
      );
    }
  };

  const notFound = () => new ApiClientError(404, "NOT_FOUND", config.notFoundMessage);

  /** Replaces the item matching `id` and `inTrash`, or throws 404. */
  const change = (id: string, inTrash: boolean, update: (item: T) => T): T => {
    const items = read();
    const index = items.findIndex((item) => item.id === id && (item.deletedAt !== null) === inTrash);
    if (index === -1) throw notFound();
    const updated = update(items[index]);
    items[index] = updated;
    write(items);
    return updated;
  };

  return {
    list: async (view) => {
      const items = read().filter((item) => (item.deletedAt !== null) === (view === "trash"));
      // Active lists are newest first; the trash is most recently deleted first.
      return view === "trash"
        ? items.sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""))
        : items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    create: async (input) => {
      const now = new Date().toISOString();
      const meta: ItemMeta = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, deletedAt: null };
      const item = config.build(validate(config.createSchema, input), meta);
      write([item, ...read()]);
      return item;
    },
    update: async (id, input) => {
      const valid = validate(config.updateSchema, input);
      return change(id, false, (item) => ({ ...config.apply(item, valid), updatedAt: new Date().toISOString() }));
    },
    trash: async (id) => change(id, false, (item) => ({ ...item, deletedAt: new Date().toISOString() })),
    restore: async (id) => change(id, true, (item) => ({ ...item, deletedAt: null })),
    destroy: async (id) => {
      const items = read();
      const remaining = items.filter((item) => !(item.id === id && item.deletedAt !== null));
      if (remaining.length === items.length) throw notFound();
      write(remaining);
    },
    clear: async () => write([]),
  };
}
