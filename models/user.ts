import "server-only";

import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

import { USERNAME_MAX, USERNAME_MIN } from "@/schemas/auth";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: USERNAME_MIN,
      maxlength: USERNAME_MAX,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

export type UserAttrs = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserAttrs>;

// Reuse the compiled model across hot reloads.
export const User: Model<UserAttrs> =
  (models.User as Model<UserAttrs> | undefined) ??
  model<UserAttrs>("User", userSchema);
