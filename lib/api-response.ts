import type { ApiSuccess } from "@/types/api";

/** Wraps a payload in the standard `{ data }` success shape. */
export function ok<T>(data: T, status = 200): Response {
  const body: ApiSuccess<T> = { data };
  return Response.json(body, { status });
}
