import type { ListView } from "@/schemas/list-query";

// Soft delete: "deleting" sets deletedAt, which moves the item to the trash.
// Only items already in the trash can be deleted for good.
// `deletedAt: null` also matches documents created before the field existed.

export const ACTIVE = { deletedAt: null };
export const TRASHED = { deletedAt: { $ne: null } };

export function viewFilter(view: ListView) {
  return view === "trash" ? TRASHED : ACTIVE;
}

/** Active lists are newest first; the trash is most recently deleted first. */
export function viewSort(view: ListView): Record<string, -1> {
  return view === "trash" ? { deletedAt: -1 } : { createdAt: -1 };
}
