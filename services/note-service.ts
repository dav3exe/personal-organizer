import "server-only";

import type { Types, UpdateQuery } from "mongoose";

import { errors } from "@/lib/api-error";
import { connectDB } from "@/lib/db";
import { ACTIVE, TRASHED, viewFilter, viewSort } from "@/lib/soft-delete";
import { Note as NoteModel, type NoteAttrs } from "@/models/note";
import type { ListView } from "@/schemas/list-query";
import type { CreateNoteInput, UpdateNoteInput } from "@/schemas/note";
import type { Note } from "@/types/note";

// TENANCY: every query filters by the session's userId. Never query notes by
// _id alone; a note that isn't the user's is reported as 404.

type NoteRecord = NoteAttrs & { _id: Types.ObjectId };

function toNote(record: NoteRecord): Note {
  return {
    id: record._id.toString(),
    title: record.title,
    content: record.content,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    deletedAt: record.deletedAt ? record.deletedAt.toISOString() : null,
  };
}

export async function listNotes(userId: string, view: ListView): Promise<Note[]> {
  await connectDB();
  const records = await NoteModel.find({ userId, ...viewFilter(view) })
    .sort(viewSort(view))
    .lean<NoteRecord[]>();
  return records.map(toNote);
}

/** Returns an active or trashed note. */
export async function getNote(userId: string, noteId: string): Promise<Note> {
  await connectDB();
  const record = await NoteModel.findOne({ _id: noteId, userId }).lean<NoteRecord>();
  if (!record) throw errors.notFound("Note not found");
  return toNote(record);
}

export async function createNote(
  userId: string,
  input: CreateNoteInput
): Promise<Note> {
  await connectDB();
  const created = await NoteModel.create({
    userId,
    title: input.title,
    content: input.content,
  });
  return toNote(created.toObject<NoteRecord>());
}

/** Only active notes can be edited; restore a trashed one first. */
export async function updateNote(
  userId: string,
  noteId: string,
  input: UpdateNoteInput
): Promise<Note> {
  const $set: UpdateQuery<NoteAttrs> = {};
  if (input.title !== undefined) $set.title = input.title;
  if (input.content !== undefined) $set.content = input.content;

  await connectDB();
  const record = await NoteModel.findOneAndUpdate(
    { _id: noteId, userId, ...ACTIVE },
    { $set },
    { returnDocument: "after", runValidators: true }
  ).lean<NoteRecord>();
  if (!record) throw errors.notFound("Note not found");
  return toNote(record);
}

/** Soft delete: moves an active note to the trash. */
export async function trashNote(userId: string, noteId: string): Promise<Note> {
  await connectDB();
  const record = await NoteModel.findOneAndUpdate(
    { _id: noteId, userId, ...ACTIVE },
    { $set: { deletedAt: new Date() } },
    { returnDocument: "after" }
  ).lean<NoteRecord>();
  if (!record) throw errors.notFound("Note not found");
  return toNote(record);
}

export async function restoreNote(userId: string, noteId: string): Promise<Note> {
  await connectDB();
  const record = await NoteModel.findOneAndUpdate(
    { _id: noteId, userId, ...TRASHED },
    { $set: { deletedAt: null } },
    { returnDocument: "after" }
  ).lean<NoteRecord>();
  if (!record) throw errors.notFound("Note not found");
  return toNote(record);
}

/** Permanent delete. Only works on a note that's already in the trash. */
export async function deleteNoteForever(userId: string, noteId: string): Promise<void> {
  await connectDB();
  const record = await NoteModel.findOneAndDelete({ _id: noteId, userId, ...TRASHED }).lean();
  if (!record) throw errors.notFound("Note not found");
}
