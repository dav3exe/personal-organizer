import "server-only";

import type { Types, UpdateQuery } from "mongoose";

import { errors } from "@/lib/api-error";
import { connectDB } from "@/lib/db";
import { Note as NoteModel, type NoteAttrs } from "@/models/note";
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
  };
}

export async function listNotes(userId: string): Promise<Note[]> {
  await connectDB();
  const records = await NoteModel.find({ userId })
    .sort({ createdAt: -1 })
    .lean<NoteRecord[]>();
  return records.map(toNote);
}

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
    { _id: noteId, userId },
    { $set },
    { returnDocument: "after", runValidators: true }
  ).lean<NoteRecord>();
  if (!record) throw errors.notFound("Note not found");
  return toNote(record);
}

export async function deleteNote(userId: string, noteId: string): Promise<void> {
  await connectDB();
  const record = await NoteModel.findOneAndDelete({ _id: noteId, userId }).lean();
  if (!record) throw errors.notFound("Note not found");
}
