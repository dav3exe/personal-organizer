import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify, errors as joseErrors } from "jose";

import { errors } from "@/lib/api-error";

// No database imports here: proxy.ts uses this file and must stay DB-free.

export const SESSION_COOKIE = "po_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
const JWT_ALGORITHM = "HS256";
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export type Session = { userId: string };

let cachedSecret: Uint8Array | null = null;

// Read lazily so a missing secret fails the request, not the build.
function getJwtSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be set and at least 32 characters (see .env.example)."
    );
  }
  cachedSecret = new TextEncoder().encode(secret);
  return cachedSecret;
}

export async function signSessionToken(session: Session): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getJwtSecret());
}

/** Returns the session for a valid token, or null if it's missing, expired, or tampered with. */
export async function verifySessionToken(
  token: string | undefined
): Promise<Session | null> {
  if (!token) return null;
  const secret = getJwtSecret();
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [JWT_ALGORITHM],
    });
    if (typeof payload.sub !== "string" || !OBJECT_ID_PATTERN.test(payload.sub)) {
      return null;
    }
    return { userId: payload.sub };
  } catch (error) {
    if (error instanceof joseErrors.JOSEError) return null;
    throw error;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Reads and verifies the session cookie for the current request. */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

/** Like getSession, but throws a 401 when there is no valid session. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw errors.unauthorized();
  return session;
}
