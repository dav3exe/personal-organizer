import type { ApiErrorBody, ErrorCode } from "@/types/api";

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly fields?: Record<string, string>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errors = {
  badRequest: (
    message: string,
    code: ErrorCode = "BAD_REQUEST",
    fields?: Record<string, string>
  ) => new AppError(400, code, message, fields),
  unauthorized: (
    message = "You need to sign in to do that",
    code: ErrorCode = "UNAUTHORIZED"
  ) => new AppError(401, code, message),
  notFound: (message = "Not found") => new AppError(404, "NOT_FOUND", message),
  conflict: (message: string, fields?: Record<string, string>) =>
    new AppError(409, "ALREADY_EXISTS", message, fields),
};

/** Converts any thrown value into a `{ message, code }` JSON response. */
export function handleApiError(error: unknown): Response {
  if (error instanceof AppError) {
    const body: ApiErrorBody = {
      message: error.message,
      code: error.code,
      ...(error.fields && { fields: error.fields }),
    };
    return Response.json(body, { status: error.status });
  }

  console.error("Unhandled API error:", error);
  const body: ApiErrorBody = {
    message: "Something went wrong. Please try again.",
    code: "INTERNAL_ERROR",
  };
  return Response.json(body, { status: 500 });
}
