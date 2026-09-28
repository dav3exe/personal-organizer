import "server-only";

import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

import { NOTE_CONTENT_MAX, NOTE_TITLE_MAX } from "@/schemas/note";

const noteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: NOTE_TITLE_MAX,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: NOTE_CONTENT_MAX,
    },
  },
  { timestamps: true }
);

// Serves every per-user query (userId prefix) and the newest-first listing.
noteSchema.index({ userId: 1, createdAt: -1 });

export type NoteAttrs = InferSchemaType<typeof noteSchema>;
export type NoteDocument = HydratedDocument<NoteAttrs>;

export const Note: Model<NoteAttrs> =
  (models.Note as Model<NoteAttrs> | undefined) ??
  model<NoteAttrs>("Note", noteSchema);
