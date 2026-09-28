export type ErrorCode =
  | "BAD_REQUEST"
  | "INVALID_JSON"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "INVALID_CREDENTIALS"
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "INTERNAL_ERROR";

export type ApiErrorBody = {
  message: string;
  code: ErrorCode;
  /** Field-level messages, keyed by field name (validation and conflict errors). */
  fields?: Record<string, string>;
};

export type ApiSuccess<T> = {
  data: T;
};
