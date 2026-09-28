import "server-only";

import bcrypt from "bcryptjs";
import { isValidObjectId, mongo } from "mongoose";

import { errors } from "@/lib/api-error";
import { connectDB } from "@/lib/db";
import { User, type UserDocument } from "@/models/user";
import type { LoginInput, RegisterInput } from "@/schemas/auth";
import type { PublicUser } from "@/types/user";

const BCRYPT_COST = 12;

// Compared against when the email doesn't exist, so a failed login takes the
// same time whether or not the account exists (prevents user enumeration).
const DUMMY_HASH =
  "$2b$12$p/Bce34vyUlzvy0Vd4Jul.3H3cBZ4uF/DyjAJrF7Dfie/a2mWM0Qy";

const INVALID_CREDENTIALS = "Invalid credentials";

function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

function isDuplicateKeyError(error: unknown): error is mongo.MongoServerError {
  return error instanceof mongo.MongoServerError && error.code === 11000;
}

function takenFields(email: boolean, username: boolean): Record<string, string> {
  return {
    ...(email && { email: "This email is already registered" }),
    ...(username && { username: "This username is taken" }),
  };
}

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  await connectDB();

  const existing = await User.find({
    $or: [{ email: input.email }, { username: input.username }],
  })
    .select("email username")
    .lean();

  if (existing.length > 0) {
    const emailTaken = existing.some((u) => u.email === input.email);
    const usernameTaken = existing.some((u) => u.username === input.username);
    throw errors.conflict(
      "An account with these details already exists",
      takenFields(emailTaken, usernameTaken)
    );
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

  try {
    const user = await User.create({
      username: input.username,
      email: input.email,
      passwordHash,
    });
    return toPublicUser(user);
  } catch (error) {
    // Unique indexes are the final guard if two sign-ups race past the check above.
    if (isDuplicateKeyError(error)) {
      const keys = Object.keys(error.keyPattern ?? {});
      throw errors.conflict(
        "An account with these details already exists",
        takenFields(keys.includes("email"), keys.includes("username"))
      );
    }
    throw error;
  }
}

export async function loginUser(input: LoginInput): Promise<PublicUser> {
  await connectDB();

  const user = await User.findOne({ email: input.email }).select("+passwordHash");
  const passwordMatches = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? DUMMY_HASH
  );

  if (!user || !passwordMatches) {
    throw errors.unauthorized(INVALID_CREDENTIALS, "INVALID_CREDENTIALS");
  }

  return toPublicUser(user);
}

export async function getUserById(userId: string): Promise<PublicUser | null> {
  if (!isValidObjectId(userId)) return null;
  await connectDB();
  const user = await User.findById(userId);
  return user ? toPublicUser(user) : null;
}
