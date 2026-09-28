import "server-only";

import {
  Schema,
  model,
  models,
  type HydratedDocument,
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
  },
  { timestamps: true }
);

// Serves every per-user query (userId prefix) and the newest-first listing.
todoSchema.index({ userId: 1, createdAt: -1 });

export type TodoAttrs = InferSchemaType<typeof todoSchema>;
export type TodoDocument = HydratedDocument<TodoAttrs>;

export const Todo: Model<TodoAttrs> =
  (models.Todo as Model<TodoAttrs> | undefined) ??
  model<TodoAttrs>("Todo", todoSchema);
