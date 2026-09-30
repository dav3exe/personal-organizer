import "server-only";

import {
  Schema,
  model,
  models,
  type InferSchemaType,
  type Model,
} from "mongoose";

import { TODO_DESCRIPTION_MAX, TODO_TITLE_MAX } from "@/schemas/todo";

const todoSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: TODO_TITLE_MAX,
    },
    description: { type: String, trim: true, maxlength: TODO_DESCRIPTION_MAX },
    completed: { type: Boolean, default: false },
    dueDate: { type: Date },
    // Soft delete: set when moved to the trash, null while active.
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Serves every per-user query (userId prefix), the active/trash split, and
// the newest-first listing.
todoSchema.index({ userId: 1, deletedAt: 1, createdAt: -1 });

export type TodoAttrs = InferSchemaType<typeof todoSchema>;

export const Todo: Model<TodoAttrs> =
  (models.Todo as Model<TodoAttrs> | undefined) ??
  model<TodoAttrs>("Todo", todoSchema);
