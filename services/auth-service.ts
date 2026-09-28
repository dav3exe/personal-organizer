import "server-only";

import bcrypt from "bcryptjs";
import { mongo } from "mongoose";

import { errors } from "@/lib/api-error";
import { BloomFilter } from "@/lib/bloom";
import { connectDB } from "@/lib/db";
import { isObjectIdString } from "@/lib/validation";
import { User, type UserDocument } from "@/models/user";
import type { LoginInput, RegisterInput } from "@/schemas/auth";
import type { PublicUser } from "@/types/user";

const BCRYPT_COST = 12;

// ---- Username bloom filter -------------------------------------------------
// Answers most "is this username taken?" checks without a DB query.
// SERVERLESS NOTE: each instance (and each cold start) has its own in-memory
// filter, seeded from the DB on first use, so filters can lag behind sign-ups
// made on other instances. That's safe: a "probably taken" answer is always
// confirmed with a DB lookup, and the unique index on `username` is the final
// guard against races. The DB, never the filter, is the source of truth.

const USERNAME_FILTER_CAPACITY = 100_000;
const USERNAME_FILTER_FALSE_POSITIVE_RATE = 0.01;

const globalForBloom = globalThis as typeof globalThis & {
  usernameFilter?: Promise<BloomFilter>;
};

async function seedUsernameFilter(): Promise<BloomFilter> {
  await connectDB();
  const filter = new BloomFilter(USERNAME_FILTER_CAPACITY, USERNAME_FILTER_FALSE_POSITIVE_RATE);
  for await (const user of User.find({}, { username: 1 }).lean().cursor()) {
    filter.add(user.username);
  }
  return filter;
}

function getUsernameFilter(): Promise<BloomFilter> {
  globalForBloom.usernameFilter ??= seedUsernameFilter().catch((error: unknown) => {
    globalForBloom.usernameFilter = undefined; // retry seeding on the next call
    throw error;
  });
  return globalForBloom.usernameFilter;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const filter = await getUsernameFilter();
  if (!filter.mightContain(username)) return true; // definitely not taken
  // "Probably taken": confirm, since bloom filters can give false positives.
  const exists = await User.exists({ username });
  return !exists;
}

async function rememberUsername(username: string): Promise<void> {
  // Only update a filter that already exists; a new one is seeded from the DB.
  if (!globalForBloom.usernameFilter) return;
  try {
    (await globalForBloom.usernameFilter).add(username);
  } catch {
    // Seeding failed; it will be retried and will include this user.
  }
}

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
    await rememberUsername(user.username);
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
  if (!isObjectIdString(userId)) return null;
  await connectDB();
  const user = await User.findById(userId);
  return user ? toPublicUser(user) : null;
}
