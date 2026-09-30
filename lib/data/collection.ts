import { apiFetch } from "@/lib/api-client";
import type { ListView } from "@/schemas/list-query";

/** Fields every stored item has, including its soft-delete marker. */
export type ItemMeta = {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

/**
 * Where the client reads and writes one kind of item. The hooks only talk to
 * this interface, so they work the same whether data lives in MongoDB (via
 * our route handlers) or in the browser's localStorage.
 */
export type Collection<T extends ItemMeta, CreateInput, UpdateInput> = {
  list(view: ListView): Promise<T[]>;
  create(input: CreateInput): Promise<T>;
  /** Active items only. */
  update(id: string, input: UpdateInput): Promise<T>;
  /** Soft delete: moves an active item to the trash. */
  trash(id: string): Promise<T>;
  restore(id: string): Promise<T>;
  /** Permanent delete. Only works on an item that's already in the trash. */
  destroy(id: string): Promise<void>;
  /** Permanently removes every item, active and trashed. */
  clear(): Promise<void>;
};

type RemoteCollectionConfig = {
  /** e.g. "/api/todos" */
  path: string;
  /** Response keys, e.g. "todo" and "todos". */
  one: string;
  many: string;
};

/** Collection backed by our route handlers (multi-tenant mode). */
export function remoteCollection<T extends ItemMeta, CreateInput, UpdateInput>({
  path,
  one,
  many,
}: RemoteCollectionConfig): Collection<T, CreateInput, UpdateInput> {
  const single = async (request: Promise<Record<string, T>>) => (await request)[one];

  const collection: Collection<T, CreateInput, UpdateInput> = {
    list: async (view) => (await apiFetch<Record<string, T[]>>(`${path}?view=${view}`))[many],
    create: (input) => single(apiFetch(path, { method: "POST", body: input })),
    update: (id, input) => single(apiFetch(`${path}/${id}`, { method: "PATCH", body: input })),
    trash: (id) => single(apiFetch(`${path}/${id}`, { method: "DELETE" })),
    restore: (id) => single(apiFetch(`${path}/${id}/restore`, { method: "POST" })),
    destroy: async (id) => {
      await apiFetch(`${path}/${id}/permanent`, { method: "DELETE" });
    },
    clear: async () => {
      const [active, trashed] = await Promise.all([collection.list("active"), collection.list("trash")]);
      await Promise.all(active.map((item) => collection.trash(item.id)));
      await Promise.all([...active, ...trashed].map((item) => collection.destroy(item.id)));
    },
  };
  return collection;
}
