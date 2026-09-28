import type { z } from "zod";

import { errors } from "@/lib/api-error";

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

/** True for a 24-character hex MongoDB ObjectId string. */
export function isObjectIdString(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID_PATTERN.test(value);
}

/**
 * Validates a route `id` param. A malformed id gets the same 404 as a record
 * that doesn't exist or belongs to another user, so nothing is revealed.
 */
export function parseObjectId(id: string): string {
  if (!isObjectIdString(id)) throw errors.notFound();
  return id;
}

function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_root";
    fields[key] ??= issue.message;
  }
  return fields;
}

/** Validates input against a schema, throwing a 400 VALIDATION_ERROR on failure. */
export function parseWith<T extends z.ZodType>(
  schema: T,
  input: unknown
): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw errors.badRequest(
      "Some fields are invalid",
      "VALIDATION_ERROR",
      toFieldErrors(result.error)
    );
  }
  return result.data;
}

/** Reads a JSON request body and validates it. */
export async function parseJsonBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.output<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw errors.badRequest("Request body must be valid JSON", "INVALID_JSON");
  }
  return parseWith(schema, body);
}
