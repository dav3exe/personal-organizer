import type { ApiErrorBody, ApiSuccess, ErrorCode } from "@/types/api";

/** Error thrown by apiFetch, carrying the API's `{ message, code, fields }`. */
export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly fields?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type ApiFetchOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

/** Calls one of our route handlers and unwraps `{ data }`, or throws ApiClientError. */
export async function apiFetch<T>(
  path: string,
  { method = "GET", body }: ApiFetchOptions = {}
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiClientError(
      0,
      "INTERNAL_ERROR",
      "Network error. Check your connection and try again."
    );
  }

  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (json ?? {}) as Partial<ApiErrorBody>;
    throw new ApiClientError(
      response.status,
      error.code ?? "INTERNAL_ERROR",
      error.message ?? "Something went wrong. Please try again.",
      error.fields
    );
  }

  return (json as ApiSuccess<T>).data;
}

/** Best message to show the user for any thrown value. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}
